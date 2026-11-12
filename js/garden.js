/* ═══════════════════════════════════════════════════════════
   GARDEN · jardín compartido, logros y reto de la semana (pestaña Jardín)
   Reutiliza flowerSVG() (global, de home.js) y .garden/.flower/.grown (home.css).
   IIFE: no declara nada en el scope global.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-jardin';
  const CACHE_KEY = 'garden-v1';
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };

  const mod = {
    ready: false,
    fetching: false,
    data: null,
    me: 'kitzya',
    heartbeatCount: 0,
  };

  const FLOWER_COLORS = [
    ['#FF8FA8', '#FFE066'],
    ['#E8A0BF', '#FFF3B0'],
    ['#C9E8D8', '#FFE066'],
    ['#F7C6CE', '#FFB7C5'],
    ['#E6D7F1', '#FFF3B0'],
    ['#FF6B8D', '#FFE066'],
  ];

  /* ── utilidades ── */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function isActive() {
    const panel = $(PANEL_ID);
    return !!panel && !panel.hidden;
  }
  function showMsg(node, text) {
    if (!node) return;
    node.textContent = text || '';
    node.hidden = !text;
  }
  function errorText(res) {
    if (!res || res.status === 0) return 'Sin conexión. Inténtalo cuando vuelvas a tener red.';
    if (res.status === 401) return 'Tu sesión ya no es válida. Entra otra vez.';
    return 'No se pudo guardar. Inténtalo otra vez.';
  }
  function setNetwork(ok) {
    const btns = ['challengePromptSubmit', 'challengeAnswerSubmit'];
    btns.forEach((id) => { const b = $(id); if (b) b.disabled = !ok; });
  }

  /* ── fecha local ── */
  function todayKey() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const o = {};
    parts.forEach((p) => { o[p.type] = p.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function fmtDate(ms) {
    if (!Number.isFinite(ms)) return '';
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City', day: 'numeric', month: 'short',
    }).format(new Date(ms));
  }

  /* ── lectura ── */
  async function load() {
    if (!mod.ready || mod.fetching) return;
    mod.fetching = true;
    try {
      const res = await PortalAPI('garden');
      if (res.ok && res.data) {
        mod.data = res.data;
        mod.data.me = mod.me;
        setNetwork(true);
        PortalCache.set(CACHE_KEY, mod.data);
      } else if (res.status === 0) {
        setNetwork(false);
        const cached = PortalCache.get(CACHE_KEY);
        if (cached) mod.data = cached;
      }
      renderGarden();
      renderAchievements();
      loadChallenge();
    } finally {
      mod.fetching = false;
    }
  }

  /* ── jardín ── */
  function renderGarden() {
    const ground = document.getElementById('gardenShared');
    const countEl = $('#gardenCount');
    if (!ground || !countEl) return;

    const data = mod.data;
    const owners = data && Array.isArray(data.owners) ? data.owners : [];
    const flowers = Math.floor(owners.length / 3);

    ground.textContent = '';
    const visible = owners.slice(0, 60 * 3); // 60 flores = 180 owners
    visible.forEach((owner, i) => {
      const colors = FLOWER_COLORS[i % FLOWER_COLORS.length];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 120 120');
      svg.setAttribute('class', 'flower');
      svg.setAttribute('aria-label', 'Flor de ' + (NAMES[owner] || owner));
      svg.innerHTML =
        '<g fill="' + colors[0] + '">' +
        '<ellipse cx="60" cy="36" rx="14" ry="20"/>' +
        '<ellipse cx="60" cy="36" rx="14" ry="20" transform="rotate(72 60 60)"/>' +
        '<ellipse cx="60" cy="36" rx="14" ry="20" transform="rotate(144 60 60)"/>' +
        '<ellipse cx="60" cy="36" rx="14" ry="20" transform="rotate(216 60 60)"/>' +
        '<ellipse cx="60" cy="36" rx="14" ry="20" transform="rotate(288 60 60)"/>' +
        '</g>' +
        '<circle cx="60" cy="60" r="14" fill="' + colors[1] + '"/>' +
        '<circle cx="60" cy="60" r="6.5" fill="#FFF3B0"/>';
      ground.appendChild(svg);
    });
    // animación de crecimiento tras pintar
    requestAnimationFrame(() => {
      ground.querySelectorAll('.flower').forEach((f) => f.classList.add('grown'));
    });

    if (owners.length > 180) {
      const resto = Math.floor((owners.length - 180) / 3);
      const extra = el('p', 'garden-extra', 'y ' + resto + ' más');
      ground.parentNode.insertBefore(extra, ground.nextSibling);
    }

    countEl.textContent = flowers + ' flor' + (flowers !== 1 ? 'es' : '') + ' · ' + owners.length + ' punto' + (owners.length !== 1 ? 's' : '');
  }

  /* ── logros ── */
  function renderAchievements() {
    const list = $('#achievementsList');
    if (!list) return;
    list.textContent = '';

    const data = mod.data;
    const achievements = data && Array.isArray(data.achievements) ? data.achievements : [];
    if (!achievements.length) return;

    achievements.forEach((a) => {
      const item = el('div', 'achievement-item ios-card');
      item.style.padding = '10px 14px';
      item.style.marginBottom = '8px';
      const badge = el('span', 'achievement-badge', a.reached ? '✅' : '⭕');
      badge.style.fontSize = '20px';
      badge.style.marginRight = '8px';
      item.appendChild(badge);
      const title = el('span', 'achievement-title', a.text);
      if (!a.reached) { item.style.opacity = '0.55'; title.style.textDecoration = 'line-through'; }
      item.appendChild(title);
      list.appendChild(item);
    });
  }

  /* ── reto de la semana ── */
  async function loadChallenge() {
    const card = $('#challengeCard');
    const promptEl = $('#challengePrompt');
    const form = $('#challengePromptForm');
    const input = $('#challengePromptInput');
    const submit = $('#challengePromptSubmit');
    const answerBox = document.getElementById('challenge-answer');
    const photoInput = $('#challengePhoto');
    const noteInput = $('#challengeNote');
    const answerSubmit = $('#challengeAnswerSubmit');
    const msg = $('#challengeMsg');
    if (!card || !promptEl || !form || !input || !submit || !answerBox || !photoInput || !noteInput || !answerSubmit || !msg) return;

    const res = await PortalAPI('challenge');
    if (!res.ok) { showMsg(msg, errorText(res)); return; }
    const challenge = res.data && res.data.challenge ? res.data.challenge : null;

    if (challenge && challenge.prompt) {
      promptEl.textContent = challenge.prompt;
      form.hidden = true;
      answerBox.hidden = false;
      renderAnswers(challenge);
    } else {
      promptEl.textContent = 'Todavía no hay reto esta semana.';
      form.hidden = false;
      answerBox.hidden = true;
    }
  }

  function renderAnswers(challenge) {
    const answers = challenge && challenge.answers ? challenge.answers : {};
    const container = document.getElementById('challengeAnswers') || createAnswersContainer();
    container.textContent = '';

    ['daniel', 'kitzya'].forEach((profile) => {
      const ans = answers[profile];
      if (!ans || (!ans.photoId && !ans.note)) return;
      const box = el('div', 'challenge-response');
      const who = el('span', 'challenge-who', NAMES[profile] || profile);
      who.style.display = 'block';
      who.style.fontSize = '13px';
      who.style.fontWeight = '600';
      who.style.color = 'var(--label-secondary)';
      box.appendChild(who);
      if (ans.note) {
        const note = el('p', 'challenge-note', ans.note);
        box.appendChild(note);
      }
      if (ans.photoId) {
        const img = document.createElement('img');
        img.className = 'photo-thumb';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.setAttribute('aria-label', 'Foto del reto de ' + (NAMES[profile] || profile));
        PortalAPI('photo', { query: { id: ans.photoId }, binary: true }).then((r) => {
          if (r.ok && r.blob) {
            img.src = URL.createObjectURL(r.blob);
            setTimeout(() => URL.revokeObjectURL(img.src), 60000);
          } else {
            img.style.display = 'none';
          }
        }).catch(() => { img.style.display = 'none'; });
        box.appendChild(img);
      }
      container.appendChild(box);
    });
  }

  function createAnswersContainer() {
    const card = $('#challengeCard');
    const container = document.createElement('div');
    container.id = 'challengeAnswers';
    container.className = 'stack';
    container.style.marginTop = '10px';
    card.appendChild(container);
    return container;
  }

  async function submitPrompt(e) {
    e.preventDefault();
    const input = $('#challengePromptInput');
    const prompt = (input ? input.value : '').trim();
    if (!prompt) { showMsg($('#challengeMsg'), 'Escribe el reto.'); return; }
    const btn = $('#challengePromptSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg($('#challengeMsg'), '');

    const res = await PortalAPI('challenge', { method: 'POST', body: { prompt: prompt } });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) { showMsg($('#challengeMsg'), errorText(res)); return; }
    if (input) input.value = '';
    showMsg($('#challengeMsg'), '');
    showMsg($('challengeMsg'), 'Guardado');
    setTimeout(() => { showMsg($('challengeMsg'), ''); }, 1500);
    await loadChallenge();
    await load();
  }

  async function submitAnswer(e) {
    e.preventDefault();
    const photoInput = $('#challengePhoto');
    const noteInput = $('#challengeNote');
    const file = photoInput && photoInput.files && photoInput.files[0];
    if (!file) { showMsg($('#challengeMsg'), 'Selecciona una foto.'); return; }

    const res = await compressAndUpload(file, noteInput ? noteInput.value.trim() : '');
    if (!res) return;
    const { photo, note } = res;

    const challengeRes = await PortalAPI('challenge', {
      method: 'POST',
      body: { photoId: photo.id, note: note },
    });
    if (!challengeRes.ok) { showMsg($('#challengeMsg'), errorText(challengeRes)); return; }
    showMsg($('#challengeMsg'), '');
    showMsg($('challengeMsg'), 'Guardado');
    setTimeout(() => { showMsg($('challengeMsg'), ''); }, 1500);
    if (photoInput) photoInput.value = '';
    if (noteInput) noteInput.value = '';
    await loadChallenge();
    await load();
  }

  async function compressAndUpload(file, note) {
    const msg = $('#challengeMsg');
    const btn = $('#challengeAnswerSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Subiendo…'; }
    showMsg(msg, '');

    try {
      const dataUrl = await compressImage(file);
      const res = await PortalAPI('album', {
        method: 'POST',
        body: { dataUrl: dataUrl, phrase: note || '', date: Date.now() },
      });
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (!res.ok) {
        if (res.error === 'foto-grande') showMsg(msg, 'La foto pesa demasiado, elige otra.');
        else showMsg(msg, errorText(res));
        return null;
      }
      showMsg(msg, '');
      return { photo: res.data.photo, note: note };
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      showMsg(msg, 'No se pudo subir la foto. Inténtalo otra vez.');
      return null;
    }
  }

  /* Compresión: lado mayor a 1600 px, calidades 0.82 → 0.7 → 0.6, máx 1,5 MB */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        reject(new Error('formato-invalido'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 1600;
        let w = img.width, h = img.height;
        if (w > h && w > maxSide) { h = Math.round(h * (maxSide / w)); w = maxSide; }
        else if (h > maxSide) { w = Math.round(w * (maxSide / h)); h = maxSide; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const tryQuality = (q) => {
          const mime = file.type === 'image/png' ? 'image/jpeg' : file.type;
          const data = canvas.toDataURL(mime, q);
          const bytes = Math.round((data.length - 'data:' + mime + ';base64,'.length) * 3 / 4);
          if (bytes <= 1.5 * 1024 * 1024) return data;
          return null;
        };
        for (const q of [0.82, 0.7, 0.6]) {
          const data = tryQuality(q);
          if (data) { resolve(data); return; }
        }
        reject(new Error('foto-grande'));
      };
      img.onerror = () => reject(new Error('formato-invalido'));
      img.src = URL.createObjectURL(file);
    });
  }

  /* ── enlaces de interfaz ── */
  function wire() {
    const form = $('#challengePromptForm');
    if (form) form.addEventListener('submit', submitPrompt);

    const answerForm = document.getElementById('challengeAnswerForm') || null;
    const answerSubmit = $('#challengeAnswerSubmit');
    if (answerSubmit) {
      answerSubmit.addEventListener('click', submitAnswer);
    }
  }

  /* ── arranque ── */
  PortalBus.on('portal:ready', (detail) => {
    if (detail && detail.profile) mod.me = detail.profile;
    if (mod.ready) {
      if (isActive()) load();
      return;
    }
    mod.ready = true;
    if (!detail || !detail.profile) {
      try {
        const saved = JSON.parse(localStorage.getItem('portal-session-v1') || 'null');
        if (saved && saved.profile) mod.me = saved.profile;
      } catch (e) {}
    }
    wire();
    setNetwork(navigator.onLine !== false);
    const cached = PortalCache.get(CACHE_KEY);
    if (cached) {
      mod.data = cached;
      mod.data.me = mod.me;
      renderGarden();
      renderAchievements();
    }
    if (isActive()) load();
  });

  PortalBus.on('portal:tab', (detail) => {
    if (!mod.ready || !detail) return;
    if (detail.tab === 'jardin') load();
  });

  PortalBus.on('portal:heartbeat', () => {
    if (!mod.ready || !isActive()) return;
    mod.heartbeatCount = (mod.heartbeatCount || 0) + 1;
    if (mod.heartbeatCount % 4 === 0) load(); // cada 4.º latido (~60 s)
  });

  addEventListener('offline', () => setNetwork(false));
  addEventListener('online', () => setNetwork(true));
})();
