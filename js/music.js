/* ═══════════════════════════════════════════════════════════
   MUSIC · pestaña "Música"
   canción del día · playlist · globo flotante · escucha juntos.
   IIFE: no declara nada en el scope global.
   El portal nunca reproduce audio: abre el link del proveedor
   en una pestaña nueva y sincroniza con el reloj del cliente.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-musica';
  const CACHE_KEY = 'music-v1';
  const BUBBLE_KEY = 'bubble-dismissed';      // sessionStorage, songId cerrado
  const SYNC_LABEL = 'Escuchar juntos 🎧';
  const SYNC_STALE_S = 30;                    // pasado este margen, resincronizar
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };
  const TZ = (window.PortalTime && PortalTime.tz) || 'America/Mexico_City';

  const mod = {
    ready: false,
    fetching: false,
    light: false,
    songs: [],
    now: null,                                // { songId, by, at }
    sync: null,                               // { songId, startAt, by }
    me: 'kitzya',
    timer: null,                              // setInterval de la cuenta
  };

  const dayFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ, day: 'numeric', month: 'short',
  });

  /* ── utilidades ── */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  function nameOf(who) {
    return NAMES[who] || who || 'alguien';
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
    if (res.error === 'link-no-permitido') return 'Solo YouTube o Spotify.';
    if (res.error === 'no-existe') return 'Esa canción ya no existe.';
    return 'No se pudo guardar. Inténtalo otra vez.';
  }

  /* sonido y háptica: vienen de audio.js y ui.js, nunca deben romper el módulo */
  function ping(fn) {
    try { ensureAudio(); if (typeof fn === 'function') fn(); } catch (e) {}
  }
  function hapticEl(node) {
    try { if (typeof haptic === 'function') haptic(node); } catch (e) {}
  }

  /* ── datos de la canción ── */
  function thumbOf(song) {
    const meta = song && song.meta ? song.meta : null;
    const thumb = meta && typeof meta.thumb === 'string' ? meta.thumb : '';
    return /^https:\/\//.test(thumb) ? thumb : '';
  }
  function songTitle(song) {
    const meta = song && song.meta ? song.meta : null;
    const title = meta && typeof meta.title === 'string' ? meta.title.trim() : '';
    return title || 'Canción sin título';
  }
  function songArtist(song) {
    const meta = song && song.meta ? song.meta : null;
    const artist = meta && typeof meta.artist === 'string' ? meta.artist.trim() : '';
    return artist;
  }
  function shortDay(ms) {
    return Number.isFinite(ms) ? dayFmt.format(new Date(ms)) : '';
  }

  function activeSong() {
    const id = mod.now && mod.now.songId ? String(mod.now.songId) : '';
    if (!id) return null;
    return mod.songs.find((s) => s.id === id) || null;
  }

  /* ── globo cerrado (sessionStorage puede fallar sin romper nada) ── */
  function readDismissed() {
    try { return sessionStorage.getItem(BUBBLE_KEY) || ''; } catch (e) { return ''; }
  }
  function writeDismissed(id) {
    try { sessionStorage.setItem(BUBBLE_KEY, id); } catch (e) {}
  }
  function clearDismissed() {
    try { sessionStorage.removeItem(BUBBLE_KEY); } catch (e) {}
  }

  /* ── red ── */
  function setNetwork(ok) {
    ['songSubmit', 'btnSync'].forEach((id) => {
      const btn = $(id);
      if (btn) btn.disabled = !ok;
    });
  }

  function readMe() {
    try {
      const saved = JSON.parse(localStorage.getItem('portal-session-v1') || 'null');
      if (saved && saved.profile) return saved.profile;
    } catch (e) {}
    return mod.me;
  }

  /* ── lectura completa ── */
  async function load() {
    if (!mod.ready || mod.fetching) return;
    mod.fetching = true;
    try {
      const res = await PortalAPI('music');

      if (res.ok && res.data) {
        mod.songs = Array.isArray(res.data.songs) ? res.data.songs : [];
        mod.now = res.data.now || null;
        mod.sync = res.data.sync || null;
        setNetwork(true);
        showMsg($('musicMsg'), '');
        PortalCache.set(CACHE_KEY, { songs: mod.songs, now: mod.now, sync: mod.sync });
      } else {
        setNetwork(res.status !== 0);
        showMsg($('musicMsg'), errorText(res));
        if (res.status === 0) {
          const cached = PortalCache.get(CACHE_KEY);
          if (cached) {
            if (Array.isArray(cached.songs)) mod.songs = cached.songs;
            mod.now = cached.now || null;
            mod.sync = cached.sync || null;
          }
        }
      }

      renderAll();
    } finally {
      mod.fetching = false;
    }
  }

  /* ── lectura ligera del latido: solo la canción activa ── */
  async function lightLoad() {
    if (!mod.ready || mod.light) return;
    if (!mod.now || !mod.now.songId) return;    // sin canción activa, ninguna lectura

    mod.light = true;
    try {
      const res = await PortalAPI('music', { query: { view: 'now' } });
      if (!res.ok || !res.data) return;

      mod.songs = Array.isArray(res.data.songs) ? res.data.songs : [];
      mod.now = res.data.now || null;
      if (res.data.sync) mod.sync = res.data.sync;

      renderBubble();
      if (isActive()) { renderNow(); renderSongs(); }
    } finally {
      mod.light = false;
    }
  }

  /* ── pintado ── */
  function renderAll() {
    renderNow();
    renderSongs();
    renderBubble();
    paintSync();
  }

  function renderNow() {
    const song = activeSong();

    const empty = $('nowEmpty');
    const body = $('nowBody');
    const syncCard = $('syncCard');
    if (empty) empty.hidden = !!song;
    if (body) body.hidden = !song;
    if (syncCard) syncCard.hidden = !song;

    const card = $('nowCard');
    if (card) card.classList.toggle('is-empty', !song);

    if (!song) {
      stopSyncTimer();
      paintSync();
      return;
    }

    const thumb = thumbOf(song);
    const art = $('nowArt');
    if (art) {
      if (thumb) { art.src = thumb; art.hidden = false; }
      else { art.removeAttribute('src'); art.hidden = true; }
      art.alt = '';
    }

    setText('nowTitle', songTitle(song));

    const artist = songArtist(song);
    const artistEl = $('nowArtist');
    if (artistEl) { artistEl.textContent = artist; artistEl.hidden = !artist; }

    setText('nowBy', 'De parte de ' + nameOf(song.by));
    paintSync();
  }

  function renderSongs() {
    const list = $('songsList');
    if (!list) return;
    list.textContent = '';

    if (!mod.songs.length) {
      list.appendChild(el('p', 'songs-empty',
        'Todavía no hay canciones. Dedica la primera con el link de abajo.'));
      return;
    }
    mod.songs.forEach((song) => list.appendChild(songItem(song)));
  }

  function songItem(song) {
    const title = songTitle(song);
    const thumb = thumbOf(song);

    const item = el('article', 'song-item ios-card');
    if (song.id) item.setAttribute('data-song-id', song.id);

    if (thumb) {
      const img = el('img', 'song-item-art');
      img.src = thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      item.appendChild(img);
    } else {
      item.appendChild(el('div', 'song-item-art song-item-art-empty', '♪'));
    }

    const body = el('div', 'song-item-body');
    body.appendChild(el('h3', 'song-item-title', title));

    const note = typeof song.note === 'string' ? song.note.trim() : '';
    if (note) body.appendChild(el('p', 'song-item-note', note));

    const when = shortDay(song.at);
    body.appendChild(el('p', 'song-item-by',
      when ? 'De ' + nameOf(song.by) + ' · ' + when : 'De ' + nameOf(song.by)));

    const actions = el('div', 'song-item-actions');
    const activeId = mod.now && mod.now.songId ? String(mod.now.songId) : '';

    if (song.id === activeId) {
      actions.appendChild(el('span', 'song-item-flag', 'Canción del día'));
    } else {
      const setBtn = el('button', 'link-btn', 'Poner como canción del día');
      setBtn.type = 'button';
      setBtn.setAttribute('data-song-now', song.id);
      setBtn.setAttribute('aria-label', 'Poner ' + title + ' como canción del día');
      actions.appendChild(setBtn);
    }

    if (song.by === mod.me) {
      const del = el('button', 'link-btn danger', 'Borrar');
      del.type = 'button';
      del.setAttribute('data-song-del', song.id);
      del.setAttribute('aria-label', 'Borrar ' + title);
      actions.appendChild(del);
    }

    body.appendChild(actions);
    item.appendChild(body);
    return item;
  }

  /* ── globo flotante (visible en todas las pestañas) ── */
  function renderBubble() {
    const bubble = $('songBubble');
    if (!bubble) return;

    const song = activeSong();
    const id = mod.now && mod.now.songId ? String(mod.now.songId) : '';
    if (!song || !id) { bubble.hidden = true; return; }

    const dismissed = readDismissed();
    if (dismissed === id) { bubble.hidden = true; return; }
    if (dismissed) clearDismissed();

    const thumb = thumbOf(song);
    const art = $('bubbleArt');
    if (art) {
      if (thumb) { art.src = thumb; art.hidden = false; }
      else { art.removeAttribute('src'); art.hidden = true; }
      art.alt = '';
    }

    const title = songTitle(song);
    const who = nameOf(song.by);
    setText('bubbleTitle', title);
    setText('bubbleBy', 'De parte de ' + who);

    bubble.setAttribute('aria-label',
      'Canción actual: ' + title + ', de parte de ' + who + '. Se abre en una pestaña nueva.');
    bubble.tabIndex = 0;
    bubble.hidden = false;
  }

  /* ── escucha sincronizada (reloj del cliente) ── */
  function syncState() {
    const sync = mod.sync;
    if (!sync || !Number.isFinite(sync.startAt)) return null;

    const song = activeSong();
    if (!song || String(sync.songId) !== song.id) return null;

    const diff = sync.startAt - Date.now();
    if (diff > 0) {
      return { stale: false, text: 'Faltan ' + Math.ceil(diff / 1000) + ' s para empezar juntos' };
    }
    const secs = Math.floor(-diff / 1000);
    if (secs >= SYNC_STALE_S) {
      return { stale: true, text: 'Pasaron más de 30 s. Vuelve a sincronizar para empezar juntos.' };
    }
    return { stale: false, text: 'Empezó hace ' + secs + ' s · ¿ya le diste play?' };
  }

  function paintSync() {
    const btn = $('btnSync');
    const out = $('syncCountdown');
    const state = syncState();

    if (!state) {
      if (out) out.textContent = '';
      if (btn) btn.textContent = SYNC_LABEL;
      return;
    }
    if (out) out.textContent = state.text;
    if (btn) btn.textContent = state.stale ? 'Volver a sincronizar' : SYNC_LABEL;
  }

  function stopSyncTimer() {
    if (mod.timer) { clearInterval(mod.timer); mod.timer = null; }
  }
  function startSyncTimer() {
    stopSyncTimer();
    mod.timer = setInterval(paintSync, 1000);
  }

  function openOutside(url) {
    if (!url) return;
    let win = null;
    try { win = window.open(url, '_blank', 'noopener'); } catch (e) {}
    if (!win) showMsg($('musicMsg'), 'Tu navegador no abrió la pestaña nueva. Abre el link a mano: ' + url);
  }

  async function doSync() {
    const song = activeSong();
    if (!song) { showMsg($('musicMsg'), 'Todavía no hay canción del día.'); return; }

    const btn = $('btnSync');
    const label = btn ? btn.textContent : SYNC_LABEL;
    if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando…'; }
    showMsg($('musicMsg'), '');

    const res = await PortalAPI('music-sync', { method: 'POST', body: { songId: song.id } });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) { showMsg($('musicMsg'), errorText(res)); return; }

    mod.sync = res.data || null;
    paintSync();
    openOutside(song.url);
    startSyncTimer();
  }

  /* ── escritura ── */
  async function submitSong(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = $('songFormMsg');
    const urlEl = $('songUrl');
    const noteEl = $('songNote');
    const url = urlEl ? urlEl.value.trim() : '';
    const note = noteEl ? noteEl.value.trim().slice(0, 140) : '';

    if (!url) {
      showMsg(msg, 'Pega un link de YouTube o de Spotify.');
      if (urlEl) urlEl.focus();
      return;
    }

    const btn = $('songSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg(msg, '');

    const res = await PortalAPI('music', { method: 'POST', body: { url: url, note: note } });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) {
      if (res.status === 0) setNetwork(false);
      showMsg(msg, errorText(res));
      return;
    }

    setNetwork(true);
    if (form) form.reset();
    showMsg(msg, '');
    ping(sndChime);
    await load();
  }

  async function setNow(id) {
    if (!id) return;
    showMsg($('musicMsg'), '');

    const res = await PortalAPI('music-now', { method: 'POST', body: { songId: id } });
    if (!res.ok) { showMsg($('musicMsg'), errorText(res)); return; }

    mod.now = res.data || { songId: id };
    ping(sndPop);
    renderAll();
  }

  async function deleteSong(id) {
    if (!id) return;
    const song = mod.songs.find((s) => s.id === id);
    const label = song ? songTitle(song) : 'esta canción';
    if (!confirm('¿Borrar "' + label + '" de la playlist? No se puede deshacer.')) return;

    const res = await PortalAPI('music', { method: 'DELETE', body: { id: id } });
    if (!res.ok) { showMsg($('musicMsg'), errorText(res)); return; }

    mod.songs = mod.songs.filter((s) => s.id !== id);
    if (mod.now && mod.now.songId === id) mod.now = null;
    if (mod.sync && mod.sync.songId === id) mod.sync = null;
    stopSyncTimer();
    showMsg($('musicMsg'), '');
    renderAll();
  }

  /* ── enlaces de interfaz (una sola vez) ── */
  function wire() {
    const form = $('songForm');
    if (form) form.addEventListener('submit', submitSong);

    const btn = $('btnSync');
    if (btn) {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        hapticEl(btn);
        doSync();
      });
    }

    const list = $('songsList');
    if (list) {
      list.addEventListener('click', (e) => {
        const set = e.target.closest('[data-song-now]');
        if (set) {
          hapticEl(set);
          setNow(set.getAttribute('data-song-now'));
          return;
        }
        const del = e.target.closest('[data-song-del]');
        if (del) deleteSong(del.getAttribute('data-song-del'));
      });
    }

    const bubble = $('songBubble');
    if (bubble) {
      bubble.addEventListener('click', (e) => {
        if (e.target.closest('#bubbleClose')) return;
        const song = activeSong();
        if (!song) return;
        hapticEl(bubble);
        ping(sndPop);
        openOutside(song.url);
      });
      bubble.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          bubble.click();
        }
      });
    }

    const close = $('bubbleClose');
    if (close && bubble) {
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = mod.now && mod.now.songId ? String(mod.now.songId) : '';
        if (id) writeDismissed(id);
        bubble.hidden = true;
      });
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

    if (!detail || !detail.profile) mod.me = readMe();

    wire();
    setNetwork(navigator.onLine !== false);

    const cached = PortalCache.get(CACHE_KEY);
    if (cached) {
      if (Array.isArray(cached.songs)) mod.songs = cached.songs;
      mod.now = cached.now || null;
      mod.sync = cached.sync || null;
    }
    renderAll();                       // nunca dejar la tarjeta en blanco

    if (isActive()) load();
  });

  PortalBus.on('portal:tab', (detail) => {
    if (!mod.ready) return;
    stopSyncTimer();                   // la cuenta se reinicia al volver a Música
    if (detail && detail.tab === 'musica') load();
  });

  PortalBus.on('portal:heartbeat', () => {
    if (!mod.ready) return;
    if (isActive()) { load(); return; }
    lightLoad();                       // el globo se refresca desde cualquier pestaña
  });

  PortalBus.on('portal:auth-lost', () => {
    stopSyncTimer();
    setNetwork(false);
    showMsg($('musicMsg'), 'Tu sesión ya no es válida. Entra otra vez.');
  });

  addEventListener('offline', () => setNetwork(false));
  addEventListener('online', () => {
    setNetwork(true);
    if (isActive()) load(); else lightLoad();
  });
  addEventListener('pagehide', stopSyncTimer);
})();
