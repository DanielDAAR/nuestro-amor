/* ═══════════════════════════════════════════════════════════
   API del portal · Netlify Functions v2 + Blobs
   GET/POST /api?action=...      (config.path = '/api')

   action=auth      POST {code, profile}      → {ok, token}
   action=presence  POST {thinking?} + headers → estado compartido
   action=countdown GET|POST {at} + headers   → cuenta regresiva compartida
   action=letters   GET|POST|DELETE           → cartas con fecha de apertura
   action=capsule   GET|POST {op:...}         → cápsula del tiempo compartida

   Seguridad:
   - ACCESS_CODE vive SOLO en env vars de Netlify (nunca en el repo).
   - token = HMAC-SHA256(ACCESS_CODE, "portal:" + profile) → el código
     jamás viaja tras el login y el token no lo revela.
   - timingSafeEqual en cada comparación (requireAuth).
   - Throttle por IP en Blobs: 10 fallos / 15 min → 429.
   - El sellado de cartas/cápsula se aplica AQUÍ: el servidor no entrega
     el texto antes de la fecha; no es el cliente el que oculta.
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

  return json({ error: 'accion-desconocida' }, 404);
};
