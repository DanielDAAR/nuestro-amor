/* ═══════════════════════════════════════════════════════════
   PORTAL · acceso, pestañas, presencia, relojes, flor, PWA
   Carga después de api.js y home.js (scope global compartido):
   reutiliza bell/chime (audio.js) y burst (ui.js).
   Único emisor de portal:ready, portal:tab y portal:heartbeat.
   ═══════════════════════════════════════════════════════════ */

const TZ = 'America/Mexico_City';
const SESSION_KEY = 'portal-session-v1';
const DAY_KEY = 'portal-day-v1';       // día con presencia ya enviado (local)
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

/* Si api.js no llegó a cargar, el portal sigue viéndose:
   bus vacío en vez de pantalla en blanco. */
if (typeof window.PortalBus !== 'object' || window.PortalBus === null) {
  window.PortalBus = { on: function () {}, emit: function () {} };
}
const PortalBus = window.PortalBus;

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
    if (typeof PortalAPI !== 'function') {
      setGateError('No se pudo conectar. Revisa tu conexión.');
      return;
    }
    const res = await PortalAPI('auth', {
      method: 'POST',
      body: { code: code, profile: profile },
    });
    if (res.status === 429) { setGateError('Demasiados intentos. Espera unos minutos.'); return; }
    if (res.status === 401) { setGateError('Código incorrecto. Revísalo e inténtalo otra vez.'); gateCode.select(); return; }
    if (res.status === 0) { setGateError('Sin conexión. Vuelve a intentarlo cuando haya red.'); return; }
    if (!res.ok || !res.data || !res.data.token) { setGateError('No se pudo conectar. Inténtalo otra vez.'); return; }
    saveSession({ profile: profile, token: res.data.token, at: Date.now() });
    startPortal(profile);
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
  PortalBus.emit('portal:tab', { tab: id });
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

/* ── sesión vencida: la avisa api.js, aquí se responde ── */
PortalBus.on('portal:auth-lost', () => {
  if (!session) return;
  stopHeartbeat();
  clearSession();
  session = null;
  lastCountdown = null;
  renderCountdown();
  showGate('Tu sesión ya no es válida. Entra otra vez.');
});

/* ── cuenta regresiva ── */
let lastCountdown = null;

const countdownValueEl = document.getElementById('countdownValue');
const countdownLabelEl = document.getElementById('countdownLabel');
const countdownForm = document.getElementById('countdownForm');
const countdownWhenEl = document.getElementById('countdownWhen');
const countdownNoteEl = document.getElementById('countdownNote');
const countdownMsgEl = document.getElementById('countdownMsg');
const countdownEditEl = document.getElementById('countdownEdit');
const countdownClearEl = document.getElementById('countdownClear');
const countdownCancelEl = document.getElementById('countdownCancel');
const offlinePillEl = document.getElementById('offlinePill');

function countdownMsg(text) {
  if (!countdownMsgEl) return;
  countdownMsgEl.textContent = text || '';
  countdownMsgEl.hidden = !text;
}

/* Día del portal: la fecha local, no la del servidor. */
function todayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  return o.year + '-' + o.month + '-' + o.day;
}

/* La tarjeta se repinta sola: cae la fecha, la cuenta avanza. */
function renderCountdown() {
  if (!countdownValueEl) return;
  const cd = lastCountdown;

  if (!cd || !cd.when) {
    countdownValueEl.textContent = 'Sin fecha todavía';
    countdownLabelEl.textContent = 'Fija el día en que nos vemos';
    if (countdownClearEl) countdownClearEl.hidden = true;
    if (countdownEditEl) countdownEditEl.setAttribute('aria-label', 'Fijar la fecha');
    return;
  }

  const remaining = cd.when - Date.now();
  if (remaining <= 0) {
    countdownValueEl.textContent = 'Ya pasó';
    countdownLabelEl.textContent = cd.label || 'Fija otra fecha cuando quieras';
  } else {
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor(remaining / 3600000) % 24;
    const mins = Math.floor(remaining / 60000) % 60;
    if (days > 0) {
      const tail = [];
      if (hours) tail.push(hours + ' h');
      if (mins) tail.push(mins + ' min');
      const detail = tail.length ? tail.join(' ') : 'en punto';
      countdownValueEl.textContent = days + (days === 1 ? ' día' : ' días');
      countdownLabelEl.textContent = cd.label ? detail + ' · ' + cd.label : detail;
    } else if (hours > 0) {
      countdownValueEl.textContent = hours + ' h ' + mins + ' min';
      countdownLabelEl.textContent = cd.label || 'Es hoy';
    } else if (mins > 0) {
      countdownValueEl.textContent = mins + ' min';
      countdownLabelEl.textContent = cd.label || 'Es hoy';
    } else {
      countdownValueEl.textContent = 'menos de un minuto';
      countdownLabelEl.textContent = cd.label || 'Es hoy';
    }
  }

  if (countdownClearEl) countdownClearEl.hidden = false;
  if (countdownEditEl) countdownEditEl.setAttribute('aria-label', 'Cambiar la fecha');
}

function showCountdownForm() {
  if (!countdownForm) return;
  countdownForm.hidden = false;
  if (countdownEditEl) countdownEditEl.hidden = true;
  if (countdownWhenEl) {
    countdownWhenEl.min = PortalTime.toInput(Date.now() + 60000);
    countdownWhenEl.value = lastCountdown && lastCountdown.when
      ? PortalTime.toInput(lastCountdown.when)
      : '';
  }
  if (countdownNoteEl) {
    countdownNoteEl.value = lastCountdown && lastCountdown.label ? lastCountdown.label : '';
  }
  countdownMsg('');
  if (countdownWhenEl) countdownWhenEl.focus();
}

function hideCountdownForm() {
  if (!countdownForm) return;
  countdownForm.hidden = true;
  if (countdownEditEl) countdownEditEl.hidden = false;
  countdownMsg('');
}

if (countdownEditEl) {
  countdownEditEl.addEventListener('click', showCountdownForm);
}
if (countdownCancelEl) {
  countdownCancelEl.addEventListener('click', hideCountdownForm);
}

if (countdownForm) {
  countdownForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const when = toEpoch(countdownWhenEl ? countdownWhenEl.value : '');
    if (when === null) { countdownMsg('Elige una fecha y hora.'); return; }
    const label = countdownNoteEl ? countdownNoteEl.value.trim().slice(0, 60) : '';
    const btn = countdownForm.querySelector('button[type="submit"]');
    const btnLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    countdownMsg('');

    const res = await PortalAPI('countdown', { method: 'POST', body: { when: when, label: label } });

    if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
    if (!res.ok) {
      countdownMsg(res.status === 0 ? 'Sin conexión. Inténtalo cuando vuelvas a tener red.' : 'No se pudo guardar. Inténtalo otra vez.');
      return;
    }
    lastCountdown = res.data;
    renderCountdown();
    hideCountdownForm();
  });
}

if (countdownClearEl) {
  countdownClearEl.addEventListener('click', async () => {
    if (!lastCountdown || !lastCountdown.when) return;
    if (!confirm('¿Quitar la fecha del próximo encuentro?')) return;
    const res = await PortalAPI('countdown', { method: 'POST', body: { clear: true } });
    if (!res.ok) {
      countdownMsg(res.status === 0 ? 'Sin conexión. Inténtalo cuando vuelvas a tener red.' : 'No se pudo quitar. Inténtalo otra vez.');
      return;
    }
    lastCountdown = res.data;
    renderCountdown();
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
  renderCountdown();
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
  isOffline = true;
  if (otherStatusEl) otherStatusEl.textContent = 'sin conexión';
  if (otherDotEl) otherDotEl.classList.remove('is-online');
  if (offlinePillEl) offlinePillEl.hidden = false;
}

function clearOffline() {
  isOffline = false;
  if (offlinePillEl) offlinePillEl.hidden = true;
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
  if (typeof PortalAPI !== 'function') { setOffline(); return false; }

  const body = {};
  if (thinking) body.thinking = true;

  /* la marca del día se envía una sola vez al día local */
  let sentDay = null;
  const day = todayKey();
  try {
    if (localStorage.getItem(DAY_KEY) !== day) { body.day = day; sentDay = day; }
  } catch (e) {}

  const res = await PortalAPI('presence', { method: 'POST', body: body });

  if (!res.ok) {
    if (res.status !== 401) setOffline();
    return false;
  }
  clearOffline();
  if (sentDay) {
    try { localStorage.setItem(DAY_KEY, sentDay); } catch (e) {}
  }

  const state = res.data;
  renderPresence(state);
  lastCountdown = state && state.countdown ? state.countdown : null;
  renderCountdown();
  PortalBus.emit('portal:heartbeat', { state: state });
  return true;
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

  /* los módulos (memories.js…) arrancan aquí: cubre sesión guardada y login */
  PortalBus.emit('portal:ready', { profile: profile });
}

if (session) {
  startPortal(session.profile);
} else {
  document.body.classList.add('gate-open');   // gate visible por defecto
}

tickClocks();
setInterval(tickClocks, 10000);
renderCountdown();

/* ── PWA: registrar el service worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
