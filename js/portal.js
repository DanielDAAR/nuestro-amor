/* ═══════════════════════════════════════════════════════════
   PORTAL · acceso, pestañas, presencia, relojes, flor, PWA
   Carga después de ui.js y home.js (scope global compartido):
   reutiliza bell/chime (audio.js) y burst (ui.js).
   ═══════════════════════════════════════════════════════════ */

const API_URL = '/api';
const TZ = 'America/Mexico_City';
const SESSION_KEY = 'portal-session-v1';
const HEARTBEAT_MS = 15000;      // latido de presencia
const ONLINE_MS = 45000;         // sin latido 45 s → "ya no está en línea"
const THINK_MS = 90000;          // la flor dura 90 s
const THINK_COOLDOWN_MS = 30000; // no spamear "pensando en ti"

const PROFILE_NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };

/* ── sesión ── */
function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s && s.profile && s.token) return s;
  } catch (e) {}
  return null;
}
function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

/* ── pantalla de acceso ── */
const gate = document.getElementById('gate');
const gateCode = document.getElementById('gateCode');
const gateError = document.getElementById('gateError');
const gateBtns = Array.from(document.querySelectorAll('[data-profile]'));

function setGateError(msg) {
  gateError.textContent = msg || '';
  gateError.hidden = !msg;
}
function showGate(msg) {
  gate.classList.remove('is-out');
  document.body.classList.add('gate-open');
  setGateError(msg || '');
  if (msg) gateCode.focus();
}
function hideGate() {
  gate.classList.add('is-out');
  document.body.classList.remove('gate-open');
  setGateError('');
}

async function login(profile) {
  const code = (gateCode.value || '').replace(/\D/g, '');
  if (code.length !== 6) {
    setGateError('El código tiene 6 dígitos.');
    gateCode.focus();
    return;
  }
  const pressed = gateBtns.find((b) => b.dataset.profile === profile);
  const original = pressed.textContent;
  gateBtns.forEach((b) => { b.disabled = true; });
  pressed.textContent = 'Entrando…';
  setGateError('');

  try {
    const r = await fetch(API_URL + '?action=auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, profile }),
    });
    if (r.status === 429) { setGateError('Demasiados intentos. Espera unos minutos.'); return; }
    if (r.status === 401) { setGateError('Código incorrecto. Revísalo e inténtalo otra vez.'); gateCode.select(); return; }
    if (!r.ok) { setGateError('No se pudo conectar. Revisa tu conexión.'); return; }
    const data = await r.json();
    if (!data.token) { setGateError('No se pudo conectar. Inténtalo otra vez.'); return; }
    saveSession({ profile: profile, token: data.token, at: Date.now() });
    startPortal(profile);
  } catch (e) {
    setGateError('Sin conexión. Vuelve a intentarlo cuando haya red.');
  } finally {
    gateBtns.forEach((b) => { b.disabled = false; });
    pressed.textContent = original;
  }
}

gateBtns.forEach((b) => b.addEventListener('click', () => login(b.dataset.profile)));
gateCode.addEventListener('input', () => {
  gateCode.value = gateCode.value.replace(/\D/g, '').slice(0, 6);
});

/* ── pestañas ── */
function selectTab(id) {
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === id;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    const on = p.id === 'panel-' + id;
    p.hidden = !on;
    p.classList.toggle('is-active', on);
  });
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => selectTab(t.dataset.tab));
});

/* ── copia por perfil (Inicio habla de los dos) ── */
function applyProfileCopy(profile) {
  if (profile !== 'daniel') return;
  document.querySelectorAll('[data-for-daniel]').forEach((el) => {
    el.innerHTML = el.getAttribute('data-for-daniel');
  });
}

/* ── presencia ── */
let session = loadSession();
let hbTimer = null;
let lastThinkShown = '';
let thinkCooldownAt = 0;
let isOffline = false;

const selfNameEl = document.getElementById('selfName');
const selfStatusEl = document.getElementById('selfStatus');
const otherNameEl = document.getElementById('otherName');
const otherStatusEl = document.getElementById('otherStatus');
const otherDotEl = document.getElementById('otherDot');
const clockSelfEl = document.getElementById('clockSelf');
const clockOtherEl = document.getElementById('clockOther');
const btnThink = document.getElementById('btnThink');
const btnSwitch = document.getElementById('btnSwitch');

const clockFmt = new Intl.DateTimeFormat('es-MX', {
  timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
});

function tickClocks() {
  const t = clockFmt.format(new Date());
  if (clockSelfEl) clockSelfEl.textContent = t;
  if (clockOtherEl) clockOtherEl.textContent = t;
}

function agoText(ts) {
  if (!ts) return 'aún no entra';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'hace un momento';
  const min = Math.floor(diff / 60000);
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.floor(min / 60);
  if (h < 24) return 'hace ' + h + ' h';
  return 'hace más de un día';
}

function setOffline() {
  if (isOffline) return;
  isOffline = true;
  if (otherStatusEl) otherStatusEl.textContent = 'sin conexión';
  if (otherDotEl) otherDotEl.classList.remove('is-online');
}

function renderPresence(state) {
  const me = session ? session.profile : 'kitzya';
  const other = me === 'daniel' ? 'kitzya' : 'daniel';

  if (selfNameEl) selfNameEl.textContent = PROFILE_NAMES[me];
  if (selfStatusEl) selfStatusEl.textContent = 'eres tú';
  if (otherNameEl) otherNameEl.textContent = PROFILE_NAMES[other];

  const o = state[other] || {};
  const online = !!o.lastSeen && Date.now() - o.lastSeen < ONLINE_MS;
  if (otherStatusEl) otherStatusEl.textContent = online ? 'en línea' : agoText(o.lastSeen);
  if (otherDotEl) otherDotEl.classList.toggle('is-online', online);

  // flor de "pensando en ti" (solo si es para mí y es nueva)
  const th = state.thinking;
  if (th && th.to === me && th.by !== me && Date.now() - th.at < THINK_MS && lastThinkShown !== String(th.at)) {
    lastThinkShown = String(th.at);
    bloom(PROFILE_NAMES[th.by] || 'Alguien');
  }
}

async function sync(thinking) {
  if (!session) return false;
  try {
    const r = await fetch(API_URL + '?action=presence', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-portal-profile': session.profile,
        'x-portal-token': session.token,
      },
      body: JSON.stringify(thinking ? { thinking: true } : {}),
    });
    if (r.status === 401) {
      stopHeartbeat();
      clearSession();
      session = null;
      showGate('Tu sesión ya no es válida. Entra otra vez.');
      return false;
    }
    if (!r.ok) throw new Error('http');
    const state = await r.json();
    isOffline = false;
    renderPresence(state);
    return true;
  } catch (e) {
    setOffline();
    return false;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  sync();
  hbTimer = setInterval(() => { if (!document.hidden) sync(); }, HEARTBEAT_MS);
}
function stopHeartbeat() {
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
}

/* ── flor "pensando en ti" (el momento del portal) ── */
function bloom(name) {
  const el = document.getElementById('bloom');
  const txt = document.getElementById('bloomText');
  if (!el || !txt) return;
  txt.textContent = name + ' está pensando en ti';
  el.hidden = false;
  el.classList.remove('is-in');
  void el.offsetWidth;                 // reinicia la animación
  el.classList.add('is-in');
  try { ensureAudio(); sndChime(); } catch (e) {}
  if (el._t) clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => { el.hidden = true; }, 500);
  }, 3200);
}

/* ── botones de presencia ── */
if (btnThink) {
  btnThink.addEventListener('click', async () => {
    if (!session || Date.now() < thinkCooldownAt) return;
    thinkCooldownAt = Date.now() + THINK_COOLDOWN_MS;
    btnThink.disabled = true;
    btnThink.textContent = 'Enviado 🌸';
    try { ensureAudio(); sndChime(); } catch (e) {}
    try {
      const rb = btnThink.getBoundingClientRect();
      burst(rb.left + rb.width / 2, rb.top + rb.height / 2, 10);
    } catch (e) {}
    const ok = await sync(true);
    if (!ok) {
      btnThink.textContent = 'Sin conexión';
      thinkCooldownAt = Date.now() + 5000;
      setTimeout(() => {
        btnThink.disabled = false;
        btnThink.textContent = 'Pensando en ti 🌸';
      }, 5000);
      return;
    }
    setTimeout(() => {
      btnThink.disabled = false;
      btnThink.textContent = 'Pensando en ti 🌸';
    }, THINK_COOLDOWN_MS);
  });
}

if (btnSwitch) {
  btnSwitch.addEventListener('click', () => {
    if (!confirm('¿Cambiar de perfil? Tendrás que poner el código otra vez.')) return;
    clearSession();
    location.reload();
  });
}

/* ── conexión ── */
addEventListener('online', () => { if (session) sync(); });
addEventListener('offline', setOffline);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && session) sync();
});

/* ── arranque ── */
function startPortal(profile) {
  hideGate();
  applyProfileCopy(profile);
  session = loadSession();
  if (typeof renderReply === 'function') renderReply();  // re-aplica la clave por perfil
  startHeartbeat();
}

if (session) {
  startPortal(session.profile);
} else {
  document.body.classList.add('gate-open');   // gate visible por defecto
}

tickClocks();
setInterval(tickClocks, 10000);

/* ── PWA: registrar el service worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
