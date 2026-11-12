/* ═══════════════════════════════════════════════════════════
   CINEMA · películas por ver, calificación y ruleta (pestaña Música y cine)
   IIFE: no declara nada en el scope global.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-musica';
  const CACHE_KEY = 'cinema-v1';
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };

  const mod = {
    ready: false,
    fetching: false,
    items: [],
    me: 'kitzya',
  };

  const starIcons = ['☆', '☆', '☆', '☆', '☆'];

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
  function listSkeleton(show) {
    const list = $('#watchList');
    const result = $('#rouletteResult');
    if (!list || !result) return;
    if (show) {
      list.classList.add('is-loading');
      result.classList.add('is-loading');
      result.textContent = '';
      result.hidden = false;
    } else {
      list.classList.remove('is-loading');
      result.classList.remove('is-loading');
    }
  }
  function setNetwork(ok) {
    const btns = ['watchSubmit'];
    btns.forEach((id) => { const b = $(id); if (b) b.disabled = !ok; });
  }

  /* ── lectura ── */
  async function load() {
    if (!mod.ready || mod.fetching) return;
    mod.fetching = true;
    listSkeleton(true);
    try {
      const res = await PortalAPI('watch');
      if (res.ok && res.data && Array.isArray(res.data.items)) {
        mod.items = res.data.items;
        setNetwork(true);
        PortalCache.set(CACHE_KEY, mod.items);
      } else if (res.status === 0) {
        setNetwork(false);
        const cached = PortalCache.get(CACHE_KEY);
        if (Array.isArray(cached)) mod.items = cached;
      }
      renderList();
      renderRoulette();
    } finally {
      mod.fetching = false;
      listSkeleton(false);
    }
  }

  /* ── lista de películas ── */
  function renderList() {
    const list = $('#watchList');
    if (!list) return;
    list.textContent = '';

    mod.items.forEach((item) => list.appendChild(watchItem(item)));
  }

  function myRating(item) {
    return mod.me === 'daniel' ? item.ratingA : item.ratingB;
  }
  function otherRating(item) {
    return mod.me === 'daniel' ? item.ratingB : item.ratingA;
  }

  function watchItem(item) {
    const card = el('article', 'watch-item ios-card');
    if (item.id) card.setAttribute('data-watch-id', item.id);
    const head = el('div', 'watch-head');
    head.appendChild(el('span', 'watch-title', item.title));
    const by = el('span', 'watch-by', 'Añadido por ' + (NAMES[item.by] || item.by));
    head.appendChild(by);
    card.appendChild(head);

    const meta = el('div', 'watch-meta');
    const ratingBlock = el('div', 'watch-rating');
    const label = el('span', 'watch-label', 'Tu calificación');
    ratingBlock.appendChild(label);
    const stars = el('div', 'watch-stars');
    for (let i = 1; i <= 5; i++) {
      const btn = el('button', 'star-btn' + (myRating(item) === i ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Calificar con ' + i + ' estrella' + (i !== 1 ? 's' : ''));
      btn.setAttribute('data-rating', String(i));
      btn.textContent = starIcons[i - 1];
      btn.addEventListener('click', () => submitRating(item.id, i));
      stars.appendChild(btn);
    }
    ratingBlock.appendChild(stars);
    const other = otherRating(item);
    if (other) {
      const ot = el('span', 'watch-other', (NAMES[mod.me === 'daniel' ? 'kitzya' : 'daniel'] || '') + ': ' + other + ' ★');
      ratingBlock.appendChild(ot);
    }
    meta.appendChild(ratingBlock);
    card.appendChild(meta);

    if (item.by === mod.me) {
      const del = el('button', 'link-btn danger', 'Borrar');
      del.type = 'button';
      del.setAttribute('data-delete-watch', item.id);
      del.setAttribute('aria-label', 'Borrar esta película');
      card.appendChild(del);
    }
    return card;
  }

  async function submitRating(id, rating) {
    if (rating < 1 || rating > 5) return;
    const card = document.querySelector('.watch-item[data-watch-id="' + id + '"]');
    const btns = card ? card.querySelectorAll('[data-rating]') : document.querySelectorAll('[data-rating]');
    btns.forEach((b) => b.disabled = true);
    listSkeleton(true);
    const res = await PortalAPI('watch', {
      method: 'POST',
      body: { id: id, rating: rating },
    });
    btns.forEach((b) => b.disabled = false);
    if (!res.ok) { listSkeleton(false); showMsg($('#watchMsg'), errorText(res)); return; }
    showMsg($('#watchMsg'), '');
    await load();
  }

  async function deleteItem(id) {
    if (!id) return;
    if (!confirm('¿Borrar esta película de la lista?')) return;
    listSkeleton(true);
    const res = await PortalAPI('watch', { method: 'DELETE', body: { id: id } });
    if (!res.ok) { listSkeleton(false); showMsg($('#watchMsg'), errorText(res)); return; }
    showMsg($('#watchMsg'), '');
    await load();
  }

  /* ── ruleta ── */
  function bothRated() {
    return mod.items.filter((i) => i.ratingA != null && i.ratingB != null);
  }
  function lastRoulette() {
    try {
      const raw = sessionStorage.getItem('roulette-last-v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveRoulette(item) {
    try { sessionStorage.setItem('roulette-last-v1', JSON.stringify(item)); } catch (e) {}
  }

  function renderRoulette() {
    const res = $('#rouletteResult');
    if (!res) return;
    const both = bothRated();
    const last = lastRoulette();
    const pool = both.filter((i) => !last || i.id !== last.id);
    const target = pool.length ? pool : both.length ? both : null;

    if (!target) {
      res.textContent = 'Nada que sortear todavía. Calificáis las mismas películas y la ruleta gira.';
      res.hidden = false;
      $('#btnRoulette').disabled = true;
      return;
    }
    $('#btnRoulette').disabled = false;
    if (last && target.id === last.id) {
      // ya salió esta semana, no repetir hasta que haya otra
      res.textContent = 'Ya salió esta semana: "' + target.title + '".';
      return;
    }
    res.textContent = '';
  }

  async function runRoulette() {
    const both = bothRated();
    const last = lastRoulette();
    const pool = both.filter((i) => !last || i.id !== last.id);
    if (!pool.length) {
      showMsg($('#watchMsg'), 'Nada que sortear todavía.');
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    saveRoulette(pick);
    await load();
    const res = $('#rouletteResult');
    if (res) {
      res.textContent = 'La ruleta eligió: "' + pick.title + '" — ¡a verla juntos!';
    }
  }

  /* ── escritura ── */
  async function submitWatch(e) {
    e.preventDefault();
    const title = ($('#watchTitle') ? $('#watchTitle').value : '').trim();
    if (!title) { showMsg($('#watchMsg'), 'Escribe un título.'); return; }
    const btn = $('#watchSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg($('#watchMsg'), '');
    listSkeleton(true);

    const res = await PortalAPI('watch', { method: 'POST', body: { title: title } });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    listSkeleton(false);
    if (!res.ok) { showMsg($('#watchMsg'), errorText(res)); return; }
    if ($('#watchTitle')) $('#watchTitle').value = '';
    showMsg($('#watchMsg'), '');
    showMsg($('#watchMsg'), 'Guardado');
    setTimeout(() => { showMsg($('#watchMsg'), ''); }, 1500);
    await load();
  }

  /* ── enlaces de interfaz ── */
  function wire() {
    const form = $('#watchForm');
    if (form) form.addEventListener('submit', submitWatch);

    const list = $('#watchList');
    if (list) {
      list.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete-watch]');
        if (del) { deleteItem(del.getAttribute('data-delete-watch')); return; }
        const star = e.target.closest('[data-rating]');
        if (star) {
          const item = star.closest('.watch-item');
          const id = item.getAttribute('data-watch-id');
          if (id) submitRating(id, Number(star.getAttribute('data-rating')));
        }
      });
    }

    const btnRoulette = $('#btnRoulette');
    if (btnRoulette) {
      btnRoulette.addEventListener('click', runRoulette);
    }
  }

  /* ── asignar data-watch-id a las tarjetas tras renderizar ── */
  function tagItems() {
    const list = $('#watchList');
    if (!list) return;
    list.querySelectorAll('.watch-item').forEach((card, i) => {
      card.setAttribute('data-watch-id', mod.items[i] && mod.items[i].id || '');
    });
  }

  const _renderList = renderList;
  renderList = function () {
    _renderList();
    tagItems();
  };

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
    if (Array.isArray(cached)) {
      mod.items = cached;
      renderList();
      renderRoulette();
    }
    if (isActive()) load();
  });

  PortalBus.on('portal:tab', (detail) => {
    if (!mod.ready || !detail) return;
    if (detail.tab === 'musica') load();
  });

  PortalBus.on('portal:heartbeat', () => {
    if (mod.ready && isActive()) load();
  });

  addEventListener('offline', () => setNetwork(false));
  addEventListener('online', () => setNetwork(true));
})();
