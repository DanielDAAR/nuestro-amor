/* ═══════════════════════════════════════════════════════════
   API del portal · Netlify Functions v2 + Blobs
   GET/POST /api?action=...      (config.path = '/api')

   action=auth       POST {code, profile}             → {ok, token}
   action=presence   POST {thinking?, day?} + headers → estado compartido
   action=countdown  GET|POST {at, label} + headers   → cuenta regresiva
   action=letters    GET|POST|DELETE                  → cartas con fecha de apertura
   action=capsule    GET|POST {op}                    → cápsula del tiempo
   action=music      GET|POST|DELETE (+view=now)      → playlist y canción del día
   action=music-now  POST {songId}                    → canción activa
   action=music-sync POST {songId}                    → segundo de inicio compartido
   action=games      GET|POST {op}|DELETE             → partidas por turnos
   action=album      GET|POST|DELETE                  → metadatos de fotos
   action=photo      GET ?id=                         → bytes de la foto (privada)
   action=diary      GET|POST {text}                  → diario a dos voces
   action=watch      GET|POST|DELETE                  → películas por ver
   action=challenge  GET|POST {prompt?}               → reto de la semana
   action=quiz       GET|POST {kind, answers}         → quizzes y coincidencia
   action=garden     GET                              → flores y logros derivados

   Seguridad:
   - ACCESS_CODE vive SOLO en env vars de Netlify (nunca en el repo).
   - token = HMAC-SHA256(ACCESS_CODE, "portal:" + profile) → el código
     jamás viaja tras el login y el token no lo revela.
   - timingSafeEqual en cada comparación (requireAuth).
   - Throttle por IP en Blobs: 10 fallos / 15 min → 429.
   - El sellado de cartas/cápsula, la palabra del ahorcado, el mazo de
     memoria, lo ajeno del diario y las respuestas del quiz se ocultan
     AQUÍ: no es el cliente el que esconde.
   - Las fotos NUNCA tienen URL pública: los bytes solo salen por
     action=photo con las cabeceras de sesión.
   - oEmbed consulta solo hosts de una lista cerrada, con timeout de 3 s.
   ═══════════════════════════════════════════════════════════ */
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const config = { path: '/api' };

const PROFILES = ['daniel', 'kitzya'];
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 10;
const THINK_STALE_MS = 5 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_MIN_MS = 3 * 365 * DAY_MS;    // fechas hasta 3 años hacia atrás
const DATE_MAX_MS = 10 * 365 * DAY_MS;   // y hasta 10 años hacia el futuro
const LETTER_PREFIX = 'letter-';
const CAPSULE_FILE = 'capsule.json';
const CAP_PREFIX = 'cap-';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tokenFor(code, profile) {
  return 'v1.' + createHmac('sha256', code).update('portal:' + profile).digest('hex');
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a ?? ''));
  const B = Buffer.from(String(b ?? ''));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

/* Devuelve el perfil si el token HMAC de la cabecera es válido, o null. */
function requireAuth(request, code) {
  const profile = request.headers.get('x-portal-profile') || '';
  const token = request.headers.get('x-portal-token') || '';
  if (!PROFILES.includes(profile) || !safeEqual(token, tokenFor(code, profile))) return null;
  return profile;
}

/* Validador de fecha de apertura (cartas, cápsula, cuenta regresiva). */
function parseWhen(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < Date.now() - DATE_MIN_MS || n > Date.now() + DATE_MAX_MS) return null;
  return Math.round(n);
}

/* ── música: metadatos por oEmbed ── */
const SONG_PREFIX = 'song-';
const NOW_FILE = 'music-now.json';
const SYNC_FILE = 'music-sync.json';
const OEMBED_MS = 3000;
const SYNC_LEAD_MS = 10000;      // "faltan 10 s" para escuchar juntos
const SYNC_STALE_MS = 30000;     // pasado ese margen, toca resincronizar
const MUSIC_HOSTS = [
  'youtube.com', 'music.youtube.com', 'youtu.be',
  'open.spotify.com',
];

function musicProvider(value) {
  let url;
  try { url = new URL(String(value || '')); } catch (e) { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!MUSIC_HOSTS.includes(host)) return null;
  if (host === 'youtu.be') return 'youtube';
  if (host.endsWith('spotify.com')) return 'spotify';
  return 'youtube';
}

/* Nunca lanza: si el proveedor falla o tarda, la canción se guarda igual
   y el globo cae al título escrito a mano. */
async function fetchOEmbed(url, provider) {
  const endpoint = provider === 'spotify'
    ? 'https://open.spotify.com/oembed?url=' + encodeURIComponent(url)
    : 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OEMBED_MS);
  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'user-agent': 'nosotros-portal/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const thumb = typeof data.thumbnail_url === 'string' && /^https:\/\//.test(data.thumbnail_url)
      ? data.thumbnail_url
      : null;
    return {
      title: String(data.title || '').trim().slice(0, 200),
      artist: String(data.author_name || data.author || '').trim().slice(0, 120),
      thumb: thumb,
      provider: provider,
    };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── juegos por turnos ── */
const GAME_PREFIX = 'game-';
const GAME_STALE_MS = 7 * DAY_MS;
const FOUR_ROWS = 6;
const FOUR_COLS = 7;
const HANGMAN_MAX_WRONG = 6;
const MEMORY_PAIRS = 8;

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function otherOf(profile) { return profile === 'daniel' ? 'kitzya' : 'daniel'; }

function markOf(turn, players) {
  return turn === players[0] ? 'X' : 'O';
}

function tttWinner(board) {
  for (const line of TTT_LINES) {
    const a = board[line[0]];
    if (a && a === board[line[1]] && a === board[line[2]]) return a;
  }
  return board.every((c) => c) ? 'draw' : null;
}

function fourWinner(board) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let i = 0; i < board.length; i++) {
    const cell = board[i];
    if (!cell) continue;
    for (const [dx, dy] of dirs) {
      let count = 1;
      for (let step = 1; step < 4; step++) {
        const col = (i % FOUR_COLS) + dx * step;
        const row = Math.floor(i / FOUR_COLS) + dy * step;
        if (col < 0 || col >= FOUR_COLS || row < 0 || row >= FOUR_ROWS) break;
        if (board[row * FOUR_COLS + col] !== cell) break;
        count++;
      }
      if (count === 4) return cell;
    }
  }
  return board.every((c) => c) ? 'draw' : null;
}

/* Fila libre más baja de una columna de 4 en línea (gravedad). */
function fourDrop(board, col) {
  for (let row = FOUR_ROWS - 1; row >= 0; row--) {
    const i = row * FOUR_COLS + col;
    if (!board[i]) return i;
  }
  return -1;
}

function shuffled(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

/* Lo que ve el cliente: sin el mazo oculto ni la palabra sin adivinar. */
function publicGame(game) {
  const view = Object.assign({}, game);
  if (view.kind === 'ttt' || view.kind === 'four') view.turnMark = markOf(view.turn, view.players);
  if (view.kind === 'memory') {
    delete view.deck;
    const shown = {};
    const flipped = view.flipped || [];
    const matched = view.matched || [];
    flipped.concat(matched).forEach((i) => {
      if (game.deck && game.deck[i] !== undefined) shown[i] = game.deck[i];
    });
    view.shown = shown;
    view.total = (game.deck || []).length;
    delete view.flipped;
    delete view.matched;
  }
  if (view.kind === 'hangman' && view.status !== 'done') delete view.secret;
  return view;
}

/* ── álbum y fotos privadas ── */
const PHOTO_PREFIX = 'photo-';
const PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;

/* ── diario a dos voces ── */
const DIARY_PREFIX = 'diary-';

/* ── cine, retos y quizzes ── */
const WATCH_PREFIX = 'watch-';
const CHALLENGE_PREFIX = 'challenge-';
const QUIZ_PREFIX = 'quiz-';

const QUIZ_BANK = {
  conoces: [
    { id: 'c1', text: '¿Qué me pide más seguido?', options: ['Café', 'Un abrazo', 'Que le mande algo bonito', 'Comida'], answer: 0 },
    { id: 'c2', text: '¿Dónde nos conocimos?', options: ['En la escuela', 'Por amigos', 'En línea', 'En una fiesta'], answer: 2 },
    { id: 'c3', text: '¿Cuál es mi color favorito?', options: ['Rosa', 'Negro', 'Azul', 'Verde'], answer: 0 },
    { id: 'c4', text: '¿Qué hago primero al despertar?', options: ['Revisar el teléfono', 'Abrazarte', 'Bañarme', 'Comer'], answer: 0 },
    { id: 'c5', text: '¿Qué no puede faltar en un día conmigo?', options: ['Música', 'Ejercicio', 'Dormir', 'Trabajar'], answer: 0 },
    { id: 'c6', text: '¿Qué comida me alegra cualquier día?', options: ['Tacos', 'Pizza', 'Sushi', 'Pasta'], answer: 0 },
    { id: 'c7', text: '¿Cuándo me pongo de mal humor?', options: ['Con hambre', 'De madrugada', 'Sin mis audífonos', 'Casi nunca'], answer: 0 },
    { id: 'c8', text: '¿Qué digo cuando no quiero hablar?', options: ['"Luego"', '"No"', '"Estoy viendo algo"', '"Ajá"'], answer: 0 },
  ],
  estooaquello: [
    { id: 'e1', text: '¿Playa o montaña?', options: ['Playa', 'Montaña'] },
    { id: 'e2', text: '¿Quedarnos en casa o salir?', options: ['En casa', 'Salir'] },
    { id: 'e3', text: '¿Madrugar o dormir hasta tarde?', options: ['Madrugar', 'Hasta tarde'] },
    { id: 'e4', text: '¿Llamada o mensaje?', options: ['Llamada', 'Mensaje'] },
    { id: 'e5', text: '¿Dulce o salado?', options: ['Dulce', 'Salado'] },
    { id: 'e6', text: '¿Ver una película o una serie?', options: ['Película', 'Serie'] },
    { id: 'e7', text: '¿Frío o calor?', options: ['Frío', 'Calor'] },
    { id: 'e8', text: '¿Plan planeado o improvisado?', options: ['Planeado', 'Improvisado'] },
  ],
};

function weekKey(ms) {
  const d = new Date(ms);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;          // lunes = 0
  target.setUTCDate(target.getUTCDate() - dayNum + 3);  // jueves de la semana ISO
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}


export default async (request, context) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const code = process.env.ACCESS_CODE;

  if (!code) return json({ error: 'servicio-sin-configurar' }, 500);
  const store = getStore('portal');

  /* ── auth: canjear código por token ── */
  if (action === 'auth') {
    if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405);

    const ip = context.ip || request.headers.get('x-nf-client-connection-ip') || 'anon';
    const body = await readJson(request);
    const profile = String(body.profile || '');
    const submitted = String(body.code || '');

    const thr = JSON.parse((await store.get('throttle.json')) || '{}');
    const now = Date.now();
    const rec = thr[ip] || { fails: 0, at: now };
    if (now - rec.at > FAIL_WINDOW_MS) { rec.fails = 0; rec.at = now; }
    if (rec.fails >= FAIL_MAX) return json({ error: 'demasiados-intentos' }, 429);

    const ok = PROFILES.includes(profile) && safeEqual(submitted, code);
    if (!ok) {
      rec.fails += 1;
      thr[ip] = rec;
      await store.set('throttle.json', JSON.stringify(thr));
      await sleep(600);                       // frena fuerza bruta sin avisar
      return json({ error: 'codigo-incorrecto' }, 401);
    }

    delete thr[ip];
    await store.set('throttle.json', JSON.stringify(thr));
    return json({ ok: true, token: tokenFor(code, profile) });
  }

  /* ── presencia: latido + "pensando en ti" → estado compartido ── */
  if (action === 'presence') {
    if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405);

    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);

    const body = await readJson(request);
    const now = Date.now();
    const otherId = profile === 'daniel' ? 'kitzya' : 'daniel';

    /* Escritura por clave propia: cada quien solo toca la suya → aunque la
       réplica tarde (consistencia eventual), jamás se pisan los datos del otro. */
    await store.set('presence-' + profile + '.json', JSON.stringify({ lastSeen: now }));

    /* Marca de un día con presencia: una clave por día y perfil, solo si
       no existe. El cliente envía 'day' una sola vez al día (fecha local). */
    if (body.day) {
      const day = String(body.day);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const dayKey = 'day-' + day + '-' + profile + '.json';
        const seen = await store.get(dayKey);
        if (!seen) await store.set(dayKey, JSON.stringify({ at: now }));
      }
    }

    if (body.thinking) {
      await store.set('thinking.json', JSON.stringify({ by: profile, to: otherId, at: now }));
    }

    /* Lecturas (pueden tardar unos ms; el latido siguiente las pone al día).
       Lo recién escrito se mezcla en la respuesta: es seguro. */
    const state = {};
    state[profile] = { lastSeen: now };
    const [otherRaw, thinkRaw] = await Promise.all([
      store.get('presence-' + otherId + '.json'),
      store.get('thinking.json'),
    ]);
    if (otherRaw) {
      try { state[otherId] = JSON.parse(otherRaw); } catch (e) {}
    }
    let thinking = null;
    if (thinkRaw) {
      try { thinking = JSON.parse(thinkRaw); } catch (e) {}
    }
    if (thinking && now - thinking.at > THINK_STALE_MS) {
      thinking = null;
      try { await store.delete('thinking.json'); } catch (e) {}
    }
    if (thinking) state.thinking = thinking;

    /* la cuenta regresiva viaja de regalo en cada latido (un get más) */
    try {
      const cdRaw = await store.get('countdown.json');
      state.countdown = cdRaw ? JSON.parse(cdRaw) : { when: null, label: '' };
    } catch (e) { state.countdown = { when: null, label: '' }; }

    return json(state);
  }

  /* ── cuenta regresiva: la fecha del próximo encuentro ── */
  if (action === 'countdown') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);

    if (request.method === 'GET') {
      const raw = await store.get('countdown.json');
      return json(raw ? JSON.parse(raw) : { when: null, label: '' });
    }
    if (request.method === 'POST') {
      const body = await readJson(request);
      if (body.clear) {
        const empty = { when: null, label: '', by: profile, setAt: Date.now() };
        await store.set('countdown.json', JSON.stringify(empty));
        return json(empty);
      }
      const when = parseWhen(body.when);
      if (when === null) return json({ error: 'fecha-invalida' }, 400);
      const data = {
        when,
        label: String(body.label || '').trim().slice(0, 60),
        by: profile,
        setAt: Date.now(),
      };
      await store.set('countdown.json', JSON.stringify(data));
      return json(data);
    }
    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ── cartas: el sello vive AQUÍ, el servidor no suelta el texto antes de tiempo ── */
  if (action === 'letters') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();

    if (request.method === 'GET') {
      const listing = await store.list({ prefix: LETTER_PREFIX });
      const letters = [];
      for (const item of listing.blobs) {
        let l = null;
        try { l = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (!l || !l.id) continue;
        const sealed = l.opensAt != null && now < l.opensAt;
        if (l.from === profile) {
          letters.push({ ...l, sealed });                 // el autor siempre ve lo suyo
        } else if (sealed) {
          // otro perfil y aún no abre: solo datos de sobre, sin título ni texto
          letters.push({ id: l.id, from: l.from, createdAt: l.createdAt, opensAt: l.opensAt, sealed: true });
        } else {
          letters.push({ ...l, sealed: false });
        }
      }
      letters.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return json({ letters });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const text = String(body.body || '').trim();
      if (!text || text.length > 4000) return json({ error: 'texto-invalido' }, 400);
      let opensAt = null;
      if (body.opensAt != null && body.opensAt !== '') {
        opensAt = parseWhen(body.opensAt);
        if (opensAt === null) return json({ error: 'fecha-invalida' }, 400);
      }
      const letter = {
        id: randomUUID(),
        from: profile,
        title: String(body.title || '').trim().slice(0, 80),
        body: text,
        createdAt: now,
        opensAt,
      };
      await store.set(LETTER_PREFIX + letter.id + '.json', JSON.stringify(letter));
      return json({ ...letter, sealed: opensAt != null && now < opensAt });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      const key = LETTER_PREFIX + id + '.json';
      let l = null;
      try { l = JSON.parse(await store.get(key)); } catch (e) {}
      if (!l) return json({ error: 'no-existe' }, 404);
      if (l.from !== profile) return json({ error: 'no-es-tuya' }, 403);
      await store.delete(key);
      return json({ ok: true });
    }
    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ── cápsula del tiempo: los dos guardamos, se abre en su fecha ──
     Metadatos en capsule.json; cada entrada en cap-<uuid>.json
     (clave propia por entrada → nunca hay lost update entre los dos). */
  if (action === 'capsule') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();

    async function readCapsuleMeta() {
      try {
        const raw = await store.get(CAPSULE_FILE);
        return raw ? JSON.parse(raw) : { opensAt: null, setBy: null };
      } catch (e) { return { opensAt: null, setBy: null }; }
    }

    if (request.method === 'GET') {
      const meta = await readCapsuleMeta();
      const sealed = meta.opensAt != null && now < meta.opensAt;
      const listing = await store.list({ prefix: CAP_PREFIX });
      const entries = [];
      let mine = 0, theirs = 0;
      for (const item of listing.blobs) {
        let e = null;
        try { e = JSON.parse(await store.get(item.key)); } catch (err) {}
        if (!e || !e.id) continue;
        if (e.by === profile) mine += 1; else theirs += 1;
        if (sealed && e.by !== profile) continue;         // lo del otro se esconde
        entries.push(e);
      }
      entries.sort((a, b) => (a.at || 0) - (b.at || 0));
      return json({
        opensAt: meta.opensAt,
        setBy: meta.setBy,
        sealed,
        canAdd: meta.opensAt != null && sealed,
        opened: meta.opensAt != null && !sealed,
        mine,
        theirs,
        entries,
      });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const op = String(body.op || 'add');

      if (op === 'setdate') {
        const when = parseWhen(body.when);
        if (when === null) return json({ error: 'fecha-invalida' }, 400);
        const meta = await readCapsuleMeta();
        if (meta.opensAt != null && now >= meta.opensAt) return json({ error: 'capsula-abierta' }, 409);
        const next = { opensAt: when, setBy: profile, setAt: now };
        await store.set(CAPSULE_FILE, JSON.stringify(next));
        return json({ ok: true, opensAt: when });
      }

      if (op === 'reset') {
        const listing = await store.list({ prefix: CAP_PREFIX });
        for (const item of listing.blobs) {
          try { await store.delete(item.key); } catch (err) {}
        }
        await store.delete(CAPSULE_FILE);
        return json({ ok: true });
      }

      // add (por defecto)
      const text = String(body.text || '').trim();
      if (!text || text.length > 1000) return json({ error: 'texto-invalido' }, 400);
      const meta = await readCapsuleMeta();
      if (meta.opensAt == null) return json({ error: 'sin-fecha' }, 400);
      if (now >= meta.opensAt) return json({ error: 'capsula-abierta' }, 409);
      const entry = { id: randomUUID(), by: profile, text, at: now };
      await store.set(CAP_PREFIX + entry.id + '.json', JSON.stringify(entry));
      return json({ ok: true, entry });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      let e = null;
      try { e = JSON.parse(await store.get(CAP_PREFIX + id + '.json')); } catch (err) {}
      if (!e) return json({ error: 'no-existe' }, 404);
      if (e.by !== profile) return json({ error: 'no-es-tuya' }, 403);
      await store.delete(CAP_PREFIX + id + '.json');
      return json({ ok: true });
    }
    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ MÚSICA: playlist, canción del día, globo y escucha juntos ═══════════ */
  if (action === 'music' || action === 'music-now' || action === 'music-sync') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();

    async function readNow() {
      try {
        const raw = await store.get(NOW_FILE);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    async function readSync() {
      try {
        const raw = await store.get(SYNC_FILE);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    async function readSongs() {
      const listing = await store.list({ prefix: SONG_PREFIX });
      const songs = [];
      for (const item of listing.blobs) {
        let s = null;
        try { s = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (s && s.id) songs.push(s);
      }
      songs.sort((a, b) => (b.at || 0) - (a.at || 0));
      return songs;
    }

    if (action === 'music-now') {
      if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405);
      const body = await readJson(request);
      const songId = String(body.songId || '');
      const data = { songId: songId, by: profile, at: now };
      await store.set(NOW_FILE, JSON.stringify(data));
      return json(data);
    }

    if (action === 'music-sync') {
      if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405);
      const body = await readJson(request);
      const data = { songId: String(body.songId || ''), startAt: now + SYNC_LEAD_MS, by: profile };
      await store.set(SYNC_FILE, JSON.stringify(data));
      return json(data);
    }

    if (request.method === 'GET') {
      const [songs, nowSong, sync] = await Promise.all([readSongs(), readNow(), readSync()]);
      if (url.searchParams.get('view') === 'now') {
        /* lectura ligera de cada latido: solo la canción activa */
        const active = songs.find((s) => s.id === (nowSong && nowSong.songId));
        return json({ songs: active ? [active] : [], now: nowSong, sync });
      }
      return json({ songs, now: nowSong, sync });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const link = String(body.url || '').trim();
      const provider = musicProvider(link);
      if (!provider) return json({ error: 'link-no-permitido' }, 400);
      const meta = await fetchOEmbed(link, provider);
      const song = {
        id: randomUUID(),
        by: profile,
        url: link,
        note: String(body.note || '').trim().slice(0, 140),
        meta: meta || null,
        at: now,
      };
      await store.set(SONG_PREFIX + song.id + '.json', JSON.stringify(song));
      const nowData = { songId: song.id, by: profile, at: now };
      await store.set(NOW_FILE, JSON.stringify(nowData));
      return json({ song: song, now: nowData });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      let song = null;
      try { song = JSON.parse(await store.get(SONG_PREFIX + id + '.json')); } catch (e) {}
      if (!song) return json({ error: 'no-existe' }, 404);
      if (song.by !== profile) return json({ error: 'no-es-tuya' }, 403);
      await store.delete(SONG_PREFIX + id + '.json');
      const current = await readNow();
      if (current && current.songId === id) await store.delete(NOW_FILE);
      return json({ ok: true });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ JUEGOS por turnos ═══════════ */
  if (action === 'games') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();
    const other = otherOf(profile);

    async function readGame(id) {
      try {
        const raw = await store.get(GAME_PREFIX + id + '.json');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    if (request.method === 'GET') {
      const listing = await store.list({ prefix: GAME_PREFIX });
      const games = [];
      for (const item of listing.blobs) {
        let g = null;
        try { g = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (g && g.id && g.status !== 'dropped') games.push(publicGame(g));
      }
      games.sort((a, b) => (b.at || 0) - (a.at || 0));
      return json({ games });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      const game = await readGame(id);
      if (!game) return json({ error: 'no-existe' }, 404);
      const finished = game.status === 'done';
      const abandoned = (game.at || 0) < now - GAME_STALE_MS;
      if (!finished && !abandoned) {
        return json({ error: 'partida-en-curso' }, 409);
      }
      await store.delete(GAME_PREFIX + id + '.json');
      return json({ ok: true });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const op = String(body.op || 'move');

      if (op === 'create') {
        const kind = String(body.kind || '');
        if (!['ttt', 'four', 'memory', 'hangman'].includes(kind)) {
          return json({ error: 'juego-desconocido' }, 400);
        }
        /* si ya hay una partida abierta del mismo tipo, se reutiliza */
        const listing = await store.list({ prefix: GAME_PREFIX });
        for (const item of listing.blobs) {
          let g = null;
          try { g = JSON.parse(await store.get(item.key)); } catch (e) {}
          if (g && g.kind === kind && g.status === 'open') {
            return json({ game: publicGame(g), reused: true });
          }
        }
        const base = {
          id: randomUUID(),
          kind,
          players: [profile, other],
          turn: kind === 'hangman' ? other : profile,
          status: 'open',
          winner: null,
          rev: 0,
          at: now,
        };
        if (kind === 'ttt') {
          base.board = Array(9).fill('');
        } else if (kind === 'four') {
          base.board = Array(FOUR_ROWS * FOUR_COLS).fill('');
        } else if (kind === 'memory') {
          const half = shuffled(MEMORY_PAIRS);
          base.deck = half.concat(half).sort(() => Math.random() - .5);
          base.flipped = [];
          base.matched = [];
          base.score = { daniel: 0, kitzya: 0 };
        } else {
          const word = String(body.word || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, '').trim().slice(0, 24);
          if (word.length < 3) return json({ error: 'palabra-invalida' }, 400);
          base.secret = word;
          base.guesses = [];
          base.wrong = 0;
        }
        await store.set(GAME_PREFIX + base.id + '.json', JSON.stringify(base));
        return json({ game: publicGame(base), reused: false });
      }

      /* op: move */
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      const game = await readGame(id);
      if (!game) return json({ error: 'no-existe' }, 404);
      if (game.rev !== Number(body.rev)) {
        return json({ error: 'revision-antigua', game: publicGame(game) }, 409);
      }
      if (game.status !== 'open') {
        return json({ error: 'partida-cerrada', game: publicGame(game) }, 409);
      }

      const players = game.players;
      const me = players.indexOf(profile);
      if (me < 0) return json({ error: 'no-es-tuya' }, 403);

      if (game.kind === 'ttt') {
        const cell = Number(body.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell > 8 || game.board[cell]) {
          return json({ error: 'casilla-invalida', game: publicGame(game) }, 400);
        }
        if (game.turn !== profile) return json({ error: 'no-es-tu-turno', game: publicGame(game) }, 409);
        game.board[cell] = markOf(game.turn, players);
        const result = tttWinner(game.board);
        if (result === 'draw') { game.status = 'done'; game.winner = null; }
        else if (result) { game.status = 'done'; game.winner = game.turn; }
        else game.turn = players[1 - me];
      }

      if (game.kind === 'four') {
        const col = Number(body.cell);
        if (!Number.isInteger(col) || col < 0 || col >= FOUR_COLS) {
          return json({ error: 'casilla-invalida', game: publicGame(game) }, 400);
        }
        if (game.turn !== profile) return json({ error: 'no-es-tu-turno', game: publicGame(game) }, 409);
        const row = fourDrop(game.board, col);
        if (row < 0) return json({ error: 'columna-llena', game: publicGame(game) }, 400);
        game.board[row] = markOf(game.turn, players);
        const result = fourWinner(game.board);
        if (result === 'draw') { game.status = 'done'; game.winner = null; }
        else if (result) { game.status = 'done'; game.winner = game.turn; }
        else game.turn = players[1 - me];
      }

      if (game.kind === 'memory') {
        const cell = Number(body.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell >= game.deck.length) {
          return json({ error: 'casilla-invalida', game: publicGame(game) }, 400);
        }
        if (game.turn !== profile) return json({ error: 'no-es-tu-turno', game: publicGame(game) }, 409);
        if ((game.matched || []).includes(cell)) {
          return json({ error: 'casilla-invalida', game: publicGame(game) }, 400);
        }
        /* un toque nuevo primero esconde el par que no coincidió */
        if ((game.flipped || []).length === 2) game.flipped = [];
        game.flipped.push(cell);
        if (game.flipped.length === 2) {
          const [a, b] = game.flipped;
          if (game.deck[a] === game.deck[b]) {
            game.matched = (game.matched || []).concat([a, b]);
            game.flipped = [];
            if (game.score) game.score[profile] = (game.score[profile] || 0) + 1;
            if (game.matched.length === game.deck.length) {
              game.status = 'done';
              const mine = game.score[profile] || 0;
              const theirs = game.score[other] || 0;
              game.winner = mine === theirs ? null : (mine > theirs ? profile : other);
            }
          } else {
            game.turn = players[1 - me];
          }
        }
      }

      if (game.kind === 'hangman') {
        const letter = String(body.letter || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0] || '';
        if (!/^[A-Z]$/.test(letter)) {
          return json({ error: 'letra-invalida', game: publicGame(game) }, 400);
        }
        if (game.turn !== profile) return json({ error: 'no-es-tu-turno', game: publicGame(game) }, 409);
        if ((game.guesses || []).includes(letter)) {
          return json({ error: 'letra-repetida', game: publicGame(game) }, 400);
        }
        game.guesses = (game.guesses || []).concat([letter]);
        if (!game.secret.includes(letter)) game.wrong = (game.wrong || 0) + 1;
        const spelled = game.secret.split('').every((c) => c === ' ' || game.guesses.includes(c));
        if (game.wrong >= HANGMAN_MAX_WRONG) {
          game.status = 'done';
          game.winner = other;                 // escribió la palabra: gana quien la propuso
        } else if (spelled) {
          game.status = 'done';
          game.winner = profile;
        }
      }

      game.rev += 1;
      game.at = now;
      await store.set(GAME_PREFIX + game.id + '.json', JSON.stringify(game));
      return json({ game: publicGame(game) });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ ÁLBUM: fotos comprimidas en el teléfono, privadas ═══════════ */
  if (action === 'album' || action === 'photo') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();

    if (action === 'photo') {
      if (request.method !== 'GET') return json({ error: 'metodo-no-permitido' }, 405);
      const id = String(url.searchParams.get('id') || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      let meta = null;
      try { meta = JSON.parse(await store.get(PHOTO_PREFIX + id + '.json')); } catch (e) {}
      if (!meta) return json({ error: 'no-existe' }, 404);
      let bytes = null;
      try {
        bytes = await store.get(PHOTO_PREFIX + id, { type: 'arrayBuffer' });
      } catch (e) { bytes = null; }
      if (!bytes) return json({ error: 'no-existe' }, 404);
      return new Response(bytes, {
        status: 200,
        headers: {
          'content-type': meta.mime || 'image/jpeg',
          'cache-control': 'private, max-age=604800',
        },
      });
    }

    if (request.method === 'GET') {
      const listing = await store.list({ prefix: PHOTO_PREFIX });
      const photos = [];
      for (const item of listing.blobs) {
        if (!item.key.endsWith('.json')) continue;
        let p = null;
        try { p = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (p && p.id) photos.push(p);
      }
      photos.sort((a, b) => (a.date || b.date || 0) - (b.date || 0) || (b.at || 0) - (a.at || 0));
      return json({ photos });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const match = String(body.dataUrl || '').match(/^data:(image\/jpeg|image\/png);base64,([A-Za-z0-9+/=\s]+)$/);
      if (!match) return json({ error: 'formato-invalido' }, 400);
      const bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
      if (!bytes.length || bytes.length > PHOTO_MAX_BYTES) return json({ error: 'foto-grande' }, 413);
      const id = randomUUID();
      const photo = {
        id,
        by: profile,
        phrase: String(body.phrase || '').trim().slice(0, 140),
        date: parseWhen(body.date) || now,
        bytes: bytes.length,
        mime: match[1],
        at: now,
      };
      await store.set(PHOTO_PREFIX + id, bytes);
      await store.set(PHOTO_PREFIX + id + '.json', JSON.stringify(photo));
      return json({ photo });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      await store.delete(PHOTO_PREFIX + id + '.json');
      try { await store.delete(PHOTO_PREFIX + id); } catch (e) {}
      return json({ ok: true });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ DIARIO a dos voces ═══════════ */
  if (action === 'diary') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();
    const myKey = profile === 'daniel' ? 'a' : 'b';

    async function readRounds() {
      const listing = await store.list({ prefix: DIARY_PREFIX });
      const rounds = [];
      for (const item of listing.blobs) {
        let r = null;
        try { r = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (r && r.id) rounds.push(r);
      }
      rounds.sort((a, b) => (b.completedAt || b.at || 0) - (a.completedAt || a.at || 0));
      return rounds;
    }
    function viewRound(round) {
      if (round.done) {
        return { id: round.id, done: true, a: round.a, b: round.b, completedAt: round.completedAt };
      }
      return {
        id: round.id,
        done: false,
        mine: round[myKey] ? round[myKey].text : null,
        mineAt: round[myKey] ? round[myKey].at : null,
        hasOther: !!round[myKey === 'a' ? 'b' : 'a'],
      };
    }

    if (request.method === 'GET') {
      const rounds = await readRounds();
      const open = rounds.find((r) => !r.done);
      return json({
        current: open ? viewRound(open) : null,
        revealed: rounds.filter((r) => r.done).map(viewRound),
      });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const text = String(body.text || '').trim();
      if (!text || text.length > 1000) return json({ error: 'texto-invalido' }, 400);
      const rounds = await readRounds();

      let round = null;
      if (body.id) round = rounds.find((r) => r.id === String(body.id)) || null;
      if (!round) round = rounds.find((r) => !r.done) || null;
      if (round && round.done) return json({ error: 'revelada' }, 409);
      if (!round) {
        round = { id: randomUUID(), a: null, b: null, done: false, at: now };
      }
      round[myKey] = { text, at: now };
      if (round.a && round.b) { round.done = true; round.completedAt = now; }
      await store.set(DIARY_PREFIX + round.id + '.json', JSON.stringify(round));
      return json({ round: viewRound(round) });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ CINE: películas por ver, calificación y ruleta ═══════════ */
  if (action === 'watch') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();
    const myKey = profile === 'daniel' ? 'A' : 'B';

    async function readWatches() {
      const listing = await store.list({ prefix: WATCH_PREFIX });
      const items = [];
      for (const item of listing.blobs) {
        let w = null;
        try { w = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (w && w.id) items.push(w);
      }
      items.sort((a, b) => (b.at || 0) - (a.at || 0));
      return items;
    }

    if (request.method === 'GET') return json({ items: await readWatches() });

    if (request.method === 'POST') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);

      if (id) {
        const items = await readWatches();
        const item = items.find((w) => w.id === id);
        if (!item) return json({ error: 'no-existe' }, 404);
        const rating = Number(body.rating);
        item['rating' + myKey] = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
        item.at = now;
        await store.set(WATCH_PREFIX + item.id + '.json', JSON.stringify(item));
        return json({ item });
      }

      const title = String(body.title || '').trim().slice(0, 120);
      if (!title) return json({ error: 'titulo-invalido' }, 400);
      const items = await readWatches();
      const found = items.find((w) => w.title.toLowerCase() === title.toLowerCase());
      if (found) return json({ item: found });
      const item = {
        id: randomUUID(),
        title,
        by: profile,
        ratingA: null,
        ratingB: null,
        at: now,
      };
      await store.set(WATCH_PREFIX + item.id + '.json', JSON.stringify(item));
      return json({ item });
    }

    if (request.method === 'DELETE') {
      const body = await readJson(request);
      const id = String(body.id || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
      await store.delete(WATCH_PREFIX + id + '.json');
      return json({ ok: true });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ RETO de la semana (con foto privada) ═══════════ */
  if (action === 'challenge') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();
    const week = weekKey(now);
    const key = CHALLENGE_PREFIX + week + '.json';

    async function readChallenge() {
      try {
        const raw = await store.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    if (request.method === 'GET') {
      return json({ week, challenge: await readChallenge() });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      let item = await readChallenge();
      if (!item) item = { id: week, week, prompt: '', by: profile, at: now, answers: { daniel: null, kitzya: null } };

      if (body.prompt !== undefined) {
        const prompt = String(body.prompt || '').trim().slice(0, 200);
        if (!prompt) return json({ error: 'prompt-invalido' }, 400);
        item.prompt = prompt;
        item.by = profile;
        item.at = now;
      } else {
        if (!item.prompt) return json({ error: 'sin-reto' }, 400);
        item.answers[profile] = {
          photoId: String(body.photoId || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36) || null,
          note: String(body.note || '').trim().slice(0, 140),
          at: now,
        };
      }
      await store.set(key, JSON.stringify(item));
      return json({ challenge: item });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ QUIZZES: ¿cuánto me conoces? y esto o aquello ═══════════ */
  if (action === 'quiz') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);
    const now = Date.now();

    if (request.method === 'GET') {
      const kind = String(url.searchParams.get('kind') || 'conoces');
      const bank = QUIZ_BANK[kind];
      if (!bank) return json({ error: 'quiz-desconocido' }, 400);
      let saved = null;
      try { saved = JSON.parse(await store.get(QUIZ_PREFIX + kind + '.json')); } catch (e) {}
      const answers = (saved && saved.answers) || { daniel: null, kitzya: null };
      const theirs = answers[otherOf(profile)] || null;
      const out = {
        kind,
        questions: bank,
        mine: answers[profile] || null,
        theirs: theirs,
        match: null,
      };
      if (theirs) {
        const mine = answers[profile] || {};
        let total = 0;
        let hits = 0;
        bank.forEach((q) => {
          if (mine[q.id] === undefined || theirs[q.id] === undefined) return;
          total++;
          /* "conoces" compara contra la respuesta correcta; "esto o aquello"
             compara contra lo que eligió la otra persona */
          const target = kind === 'conoces' ? q.answer : theirs[q.id];
          if (Number(mine[q.id]) === Number(target)) hits++;
        });
        out.match = total ? Math.round((hits / total) * 100) : null;
      }
      return json(out);
    }

    if (request.method === 'POST') {
      const post = await readJson(request);
      const kind = String(post.kind || url.searchParams.get('kind') || 'conoces');
      const bank = QUIZ_BANK[kind];
      if (!bank) return json({ error: 'quiz-desconocido' }, 400);
      const answers = {};
      let any = false;
      bank.forEach((q) => {
        const value = Number(post.answers ? post.answers[q.id] : NaN);
        if (Number.isInteger(value) && value >= 0 && value < q.options.length) {
          answers[q.id] = value;
          any = true;
        }
      });
      if (!any) return json({ error: 'respuesta-invalida' }, 400);

      let saved = null;
      try { saved = JSON.parse(await store.get(QUIZ_PREFIX + kind + '.json')); } catch (e) {}
      if (!saved) saved = { kind: kind, answers: { daniel: null, kitzya: null }, at: now };
      saved.answers[profile] = answers;
      saved.at = now;
      await store.set(QUIZ_PREFIX + kind + '.json', JSON.stringify(saved));
      return json({ ok: true, match: saved });
    }

    return json({ error: 'metodo-no-permitido' }, 405);
  }

  /* ═══════════ JARDÍN: se deriva de lo que ya existe ═══════════ */
  if (action === 'garden') {
    const profile = requireAuth(request, code);
    if (!profile) return json({ error: 'no-autorizado' }, 401);

    async function readPrefix(prefix) {
      const listing = await store.list({ prefix });
      const items = [];
      for (const item of listing.blobs) {
        if (prefix === PHOTO_PREFIX && !item.key.endsWith('.json')) continue;
        let value = null;
        try { value = JSON.parse(await store.get(item.key)); } catch (e) {}
        if (value) items.push(value);
      }
      return items;
    }

    const [letters, caps, games, songs, photos, rounds, dayKeys] = await Promise.all([
      readPrefix(LETTER_PREFIX),
      readPrefix(CAP_PREFIX),
      readPrefix(GAME_PREFIX),
      readPrefix(SONG_PREFIX),
      readPrefix(PHOTO_PREFIX),
      readPrefix(DIARY_PREFIX),
      store.list({ prefix: 'day-' }),
    ]);

    const owners = [];          // una flor por cada 3 puntos, en orden
    const push = (points, who) => {
      for (let i = 0; i < points; i++) owners.push(who);
    };

    letters.forEach((l) => push(2, l.from));
    caps.forEach((c) => push(1, c.by));
    games.forEach((g) => {
      if (g.status !== 'done') return;
      if (g.winner) push(3, g.winner);
      else { push(1, g.players[0]); push(1, g.players[1]); }
    });
    songs.forEach((s) => push(1, s.by));
    photos.forEach((p) => push(2, p.by));
    rounds.forEach((r) => {
      if (!r.done) return;
      push(1, 'daniel');
      push(1, 'kitzya');
    });

    const days = new Set();
    dayKeys.blobs.forEach((b) => {
      const parts = b.key.replace(/^day-/, '').split('-');
      if (parts.length >= 4) days.add(parts.slice(0, 3).join('-'));
    });
    days.forEach((day, index) => push(1, index % 2 === 0 ? 'daniel' : 'kitzya'));

    const points = owners.length;
    const flowers = Math.floor(points / 3);

    const lettersCount = letters.length;
    const gamesCount = games.filter((g) => g.status === 'done').length;
    const achievements = [
      { id: 'primera-carta', text: 'La primera carta', reached: lettersCount >= 1 },
      { id: 'primera-partida', text: 'La primera partida', reached: gamesCount >= 1 },
      { id: 'diez-flores', text: '10 flores', reached: flowers >= 10 },
      { id: 'veinticinco-flores', text: '25 flores', reached: flowers >= 25 },
      { id: 'cincuenta-flores', text: '50 flores', reached: flowers >= 50 },
      { id: 'treinta-dias', text: '30 días juntos aquí', reached: days.size >= 30 },
    ];

    return json({
      points,
      flowers,
      days: days.size,
      owners: owners.slice(0, 60 * 3),
      achievements,
      counts: {
        letters: lettersCount,
        capsule: caps.length,
        games: gamesCount,
        songs: songs.length,
        photos: photos.length,
        diary: rounds.filter((r) => r.done).length,
      },
      me: profile,
    });
  }

  return json({ error: 'accion-desconocida' }, 404);
};
