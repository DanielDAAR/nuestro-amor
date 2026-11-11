/* ═══════════════════════════════════════════════════════
   MEMORIES · pestaña Cartas
   Cartas con fecha de apertura + cápsula del tiempo
   + álbum de fotos privadas + diario a dos voces.
   IIFE: no declara nada en el scope global.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-cartas';
  const CACHE_KEY = 'memories-v1';
  const TZ = 'America/Mexico_City';
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };

  /* ── álbum: se comprime en el teléfono antes de salir ── */
  const PHOTO_MAX_SIDE = 1600;
  const PHOTO_MAX_BYTES = 1572864;               /* 1,5 MB */
  const PHOTO_QUALITIES = [0.82, 0.7, 0.6];
  const PHOTO_TOO_BIG = 'La foto pesa demasiado, elige otra.';
  const PHOTO_FAIL = 'No se pudo preparar la foto. Inténtalo otra vez.';

  /* ── diario a dos voces ── */
  const DIARY_HINT = 'Cada uno escribe su parte. La del otro se ve cuando las dos están escritas.';
  const DIARY_REVELADA = 'Esta ronda ya se reveló y no se edita.';
  const OFFLINE_NOTE = 'Sin conexión: estás viendo lo último que se guardó.';
  const OFFLINE_EMPTY = 'Sin conexión. Inténtalo cuando vuelvas a tener red.';

  const mod = {
    ready: false,
    fetching: false,
    letters: [],
    capsule: null,
    photos: [],
    diary: null,
    me: 'kitzya',
    open: new Set(),
    netOk: true,
    albumOk: true,
    diaryOk: true,
    diaryEdit: null,        /* null = cerrado · '' = ronda nueva · id = editar la mía */
    diaryDraft: '',
    offlineNote: false,
  };

  /* blob URLs creados para el álbum: se revocan al repintar o al borrar */
  const photoUrls = [];

  const longFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
  const shortFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric', month: 'short',
  });
  const dayFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric', month: 'long', year: 'numeric',
  });

  /* ── utilidades ── */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function longDate(ms) {
    return Number.isFinite(ms) ? longFmt.format(new Date(ms)) : '';
  }
  function shortDate(ms) {
    return Number.isFinite(ms) ? shortFmt.format(new Date(ms)) : '';
  }
  function dayDate(ms) {
    return Number.isFinite(ms) ? dayFmt.format(new Date(ms)) : '';
  }
  function otherName() {
    return NAMES[mod.me === 'daniel' ? 'kitzya' : 'daniel'];
  }
  /* daniel → a, kitzya → b */
  function mySlot() { return mod.me === 'daniel' ? 'a' : 'b'; }
  function isActive() {
    const panel = $(PANEL_ID);
    return !!panel && !panel.hidden;
  }
  function showMsg(node, text) {
    if (!node) return;
    node.textContent = text || '';
    node.hidden = !text;
  }
  function fx(name) {
    try {
      const fn = window[name];
      if (typeof fn !== 'function') return;
      const args = Array.prototype.slice.call(arguments, 1);
      fn.apply(null, args);
    } catch (e) {}
  }
  function errorText(res) {
    if (!res || res.status === 0) return 'Sin conexión. Inténtalo cuando vuelvas a tener red.';
    if (res.status === 401) return 'Tu sesión ya no es válida. Entra otra vez.';
    if (res.error === 'fecha-invalida') return 'Esa fecha no es válida.';
    if (res.error === 'capsula-abierta') return 'La cápsula ya se abrió.';
    if (res.error === 'texto-invalido') return 'El texto no es válido.';
    if (res.error === 'no-es-tuya') return 'Eso no es tuyo.';
    if (res.error === 'formato-invalido') return 'Solo se aceptan fotos JPEG o PNG.';
    if (res.error === 'foto-grande') return PHOTO_TOO_BIG;
    if (res.error === 'revelada') return DIARY_REVELADA;
    return 'No se pudo guardar. Inténtalo otra vez.';
  }

  function noteOffline(text) {
    if (mod.offlineNote) return;
    mod.offlineNote = true;
    showMsg($('memoriesMsg'), text);
  }
  function clearOfflineNote() {
    if (!mod.offlineNote) return;
    mod.offlineNote = false;
    showMsg($('memoriesMsg'), '');
  }

  /* cada parte se escribe solo si su lectura fue bien */
  function syncWrites() {
    const net = mod.netOk !== false;
    const albumOk = net && mod.albumOk !== false;
    const diaryOk = net && mod.diaryOk !== false;

    const albumForm = $('albumForm');
    if (albumForm) {
      albumForm.querySelectorAll('input, textarea, button').forEach((node) => {
        node.disabled = !albumOk;
      });
    }

    const diaryForm = $('diaryForm');
    if (diaryForm) {
      diaryForm.querySelectorAll('textarea, button').forEach((node) => {
        node.disabled = !diaryOk;
      });
    }

    const scope = $(PANEL_ID) || document;
    scope.querySelectorAll('[data-diary-write], [data-diary-edit]').forEach((node) => {
      node.disabled = !diaryOk;
    });
  }

  function setNetwork(ok) {
    mod.netOk = ok !== false;
    ['letterSubmit', 'capsuleSubmit', 'capsuleAddSubmit'].forEach((id) => {
      const btn = $(id);
      if (btn) btn.disabled = !ok;
    });
    syncWrites();
  }

  function saveCache() {
    PortalCache.set(CACHE_KEY, {
      letters: mod.letters,
      capsule: mod.capsule,
      photos: Array.isArray(mod.photos) ? mod.photos : [],
      diary: mod.diary || null,
    });
  }

  /* ── lectura ── */
  async function load() {
    if (!mod.ready || mod.fetching) return;
    mod.fetching = true;
    try {
      const results = await Promise.all([
        PortalAPI('letters'),
        PortalAPI('capsule'),
        PortalAPI('album'),
        PortalAPI('diary'),
      ]);
      const lettersRes = results[0];
      const capsuleRes = results[1];
      const albumRes = results[2];
      const diaryRes = results[3];

      let fresh = false;

      if (lettersRes.ok && lettersRes.data && Array.isArray(lettersRes.data.letters)) {
        mod.letters = lettersRes.data.letters;
        fresh = true;
      }
      if (capsuleRes.ok && capsuleRes.data) {
        mod.capsule = capsuleRes.data;
        fresh = true;
      }

      mod.albumOk = !!(albumRes.ok && albumRes.data && Array.isArray(albumRes.data.photos));
      if (mod.albumOk) {
        mod.photos = albumRes.data.photos;
        fresh = true;
      }
      mod.diaryOk = !!(diaryRes.ok && diaryRes.data);
      if (mod.diaryOk) {
        mod.diary = diaryRes.data;
        fresh = true;
      }

      if (fresh) {
        setNetwork(true);
        saveCache();
        clearOfflineNote();
      } else {
        setNetwork(false);
        const cached = PortalCache.get(CACHE_KEY);
        if (cached) {
          if (Array.isArray(cached.letters)) mod.letters = cached.letters;
          if (cached.capsule) mod.capsule = cached.capsule;
          if (Array.isArray(cached.photos)) mod.photos = cached.photos;
          if (cached.diary) mod.diary = cached.diary;
          noteOffline(OFFLINE_NOTE);
        } else {
          noteOffline(OFFLINE_EMPTY);
        }
      }

      renderLetters();
      renderCapsule();
      renderAlbum();
      renderDiary();
    } finally {
      mod.fetching = false;
    }
  }

  /* ── cartas ── */
  function renderLetters() {
    const list = $('lettersList');
    if (!list) return;
    list.textContent = '';

    const empty = $('lettersEmpty');
    if (empty) empty.hidden = mod.letters.length > 0;

    mod.letters.forEach((letter) => list.appendChild(letterCard(letter)));
  }

  function letterCard(letter) {
    const mine = letter.from === mod.me;
    const sealed = !!letter.sealed;
    const hasTitle = typeof letter.title === 'string' && letter.title.length > 0;
    const hasBody = typeof letter.body === 'string' && letter.body.length > 0;
    const canOpen = hasTitle || hasBody;
    const isOpen = canOpen && mod.open.has(letter.id);

    const card = el('article', 'letter-card ios-card');
    if (letter.id) card.setAttribute('data-letter-id', letter.id);
    if (sealed) card.classList.add('is-sealed');
    if (isOpen) card.classList.add('is-open');

    const head = el('button', 'letter-head');
    head.type = 'button';
    head.appendChild(el('span', 'letter-who', 'De ' + (NAMES[letter.from] || letter.from)));
    const when = el('time', 'letter-when', shortDate(letter.createdAt));
    if (Number.isFinite(letter.createdAt)) {
      when.dateTime = new Date(letter.createdAt).toISOString();
    }
    head.appendChild(when);

    if (canOpen) {
      head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      head.appendChild(el('span', 'letter-caret', '›'));
    } else {
      head.disabled = true;
    }
    card.appendChild(head);

    if (canOpen) {
      const content = el('div', 'letter-content');
      if (hasTitle) content.appendChild(el('div', 'letter-title', letter.title));
      if (hasBody) content.appendChild(el('p', 'letter-text', letter.body));
      card.appendChild(content);
    }

    const foot = el('div', 'letter-foot');
    let pill;
    if (sealed && !mine) pill = 'Sellada hasta el ' + longDate(letter.opensAt);
    else if (sealed && mine) pill = 'Solo tú la ves · se abre el ' + longDate(letter.opensAt);
    else if (letter.opensAt) pill = 'Se abrió el ' + longDate(letter.opensAt);
    else pill = 'Sin fecha de apertura';
    foot.appendChild(el('span', 'letter-pill', pill));

    if (mine) {
      const del = el('button', 'link-btn danger', 'Borrar');
      del.type = 'button';
      del.setAttribute('data-delete-letter', letter.id);
      del.setAttribute('aria-label', 'Borrar esta carta');
      foot.appendChild(del);
    }
    card.appendChild(foot);

    return card;
  }

  /* ── cápsula ── */
  function renderCapsule() {
    const status = $('capsuleStatus');
    const sub = $('capsuleSub');
    const setForm = $('capsuleForm');
    const addForm = $('capsuleAddForm');
    const list = $('capsuleList');
    if (!status || !sub || !setForm || !addForm || !list) return;

    const capsule = mod.capsule;
    let statusText = 'Sin fecha todavía';
    let subText = 'Pongan el día en que se abre.';
    let showSet = true;
    let showAdd = false;

    if (capsule && capsule.opensAt) {
      if (capsule.sealed) {
        const mine = capsule.mine || 0;
        const theirs = capsule.theirs || 0;
        statusText = 'Sellada hasta el ' + longDate(capsule.opensAt);
        subText = mine + (mine === 1 ? ' tuya' : ' tuyas') +
          ' · ' + theirs + ' de ' + otherName();
        showSet = false;
        showAdd = !!capsule.canAdd;
      } else if (capsule.opened) {
        statusText = 'Abierta desde el ' + longDate(capsule.opensAt);
        subText = 'Ya pueden leer todo lo que guardaron.';
        showSet = false;
        showAdd = false;
      }
    }

    status.textContent = statusText;
    sub.textContent = subText;
    setForm.hidden = !showSet;
    addForm.hidden = !showAdd;

    list.textContent = '';
    const entries = capsule && Array.isArray(capsule.entries) ? capsule.entries : [];
    if (!entries.length) {
      list.appendChild(el('p', 'capsule-empty',
        capsule && capsule.sealed
          ? 'Todavía no hay nada guardado. Pueden empezar hoy.'
          : 'Nada guardado todavía.'));
      return;
    }
    entries.forEach((entry) => list.appendChild(capsuleEntry(entry)));
  }

  function capsuleEntry(entry) {
    const box = el('div', 'capsule-entry');
    const head = el('div', 'capsule-entry-head');
    head.appendChild(el('span', 'capsule-entry-who', NAMES[entry.by] || entry.by));
    const when = el('time', 'capsule-entry-when', shortDate(entry.at));
    if (Number.isFinite(entry.at)) {
      when.dateTime = new Date(entry.at).toISOString();
    }
    head.appendChild(when);

    if (entry.by === mod.me) {
      const del = el('button', 'link-btn danger', 'Borrar');
      del.type = 'button';
      del.setAttribute('data-delete-entry', entry.id);
      del.setAttribute('aria-label', 'Borrar esta entrada de la cápsula');
      head.appendChild(del);
    }
    box.appendChild(head);
    box.appendChild(el('p', 'capsule-entry-text', entry.text));
    return box;
  }

  /* ══════════════════════════════════════════════════════
     ÁLBUM · fotos privadas
     los metadatos viven en cache-memories-v1; los bytes
     se piden de uno en uno con photo?id= y se pintan con
     URL.createObjectURL (se revoca al repintar o borrar).
     ══════════════════════════════════════════════════════ */
  function renderAlbum() {
    const grid = $('photoGrid');
    if (!grid) return;

    revokePhotos();
    grid.textContent = '';

    if (!mod.photos.length) {
      grid.appendChild(el('p', 'album-empty',
        mod.albumOk
          ? 'Todavía no hay fotos. La primera puede ser de hoy.'
          : 'Sin conexión y ninguna foto guardada todavía.'));
      syncWrites();
      return;
    }

    mod.photos.forEach((photo) => grid.appendChild(photoCell(photo)));
    syncWrites();
  }

  function photoCell(photo) {
    const mine = photo.by === mod.me;
    const name = NAMES[photo.by] || 'alguien';
    const phrase = typeof photo.phrase === 'string' ? photo.phrase.trim() : '';
    const when = dayDate(photo.date);

    const cell = el('figure', 'photo-cell');
    if (photo.id) cell.setAttribute('data-photo-id', photo.id);

    const img = el('img');
    img.alt = phrase ? phrase : 'Foto de ' + (mine ? 'ti' : name);
    img.loading = 'lazy';
    img.decoding = 'async';
    cell.appendChild(img);

    const fallback = el('div', 'photo-cell-fallback', 'Sin conexión');
    fallback.hidden = true;
    cell.appendChild(fallback);

    const meta = el('figcaption', 'photo-meta');
    meta.appendChild(el('p', 'photo-phrase', phrase ? phrase : 'Sin frase'));
    meta.appendChild(el('p', 'photo-when',
      (mine ? 'Tuya' : 'De ' + name) + (when ? ' · ' + when : '')));

    if (mine && photo.id) {
      const del = el('button', 'link-btn danger photo-delete', 'Borrar');
      del.type = 'button';
      del.setAttribute('data-delete-photo', photo.id);
      del.setAttribute('aria-label', 'Borrar esta foto del álbum');
      meta.appendChild(del);
    }
    cell.appendChild(meta);

    if (photo.id) loadPhotoInto(cell, photo.id);
    return cell;
  }

  function loadPhotoInto(cell, id) {
    const img = cell.querySelector('img');
    const fallback = cell.querySelector('.photo-cell-fallback');

    const failed = () => {
      if (img) { img.removeAttribute('src'); img.hidden = true; }
      if (fallback) fallback.hidden = false;
    };

    PortalAPI('photo', { query: { id: id }, binary: true }).then((res) => {
      if (!cell.isConnected) return;               /* la lista ya se repintó */
      if (!res.ok || !res.blob) { failed(); return; }

      let url = '';
      try { url = URL.createObjectURL(res.blob); } catch (e) { url = ''; }
      if (!url) { failed(); return; }

      photoUrls.push({ id: id, url: url });
      img.addEventListener('load', () => {
        if (fallback) fallback.hidden = true;
      }, { once: true });
      img.addEventListener('error', () => {
        failed();
        revokePhoto(id);
      }, { once: true });
      img.src = url;
    }).catch(failed);
  }

  function revokePhoto(id) {
    for (let i = photoUrls.length - 1; i >= 0; i--) {
      if (photoUrls[i].id !== id) continue;
      try { URL.revokeObjectURL(photoUrls[i].url); } catch (e) {}
      photoUrls.splice(i, 1);
    }
  }

  function revokePhotos() {
    while (photoUrls.length) {
      try { URL.revokeObjectURL(photoUrls.pop().url); } catch (e) {}
    }
  }

  /* ── compresión en el teléfono ── */
  function dataUrlBytes(dataUrl) {
    const raw = String(dataUrl);
    const comma = raw.indexOf(',');
    if (comma < 0) return Infinity;
    const b64 = raw.slice(comma + 1);
    let pad = 0;
    if (b64.slice(-2) === '==') pad = 2;
    else if (b64.slice(-1) === '=') pad = 1;
    return Math.floor(b64.length * 3 / 4) - pad;
  }

  function drawPhoto(file, mime, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (!w || !h) { reject(new Error('medidas')); return; }
          if (w > PHOTO_MAX_SIDE || h > PHOTO_MAX_SIDE) {
            const scale = PHOTO_MAX_SIDE / Math.max(w, h);
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('canvas')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL(mime, quality));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('lectura'));
      };
      img.src = url;
    });
  }

  async function buildPhoto(file) {
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    let dataUrl = '';
    for (let i = 0; i < PHOTO_QUALITIES.length; i++) {
      dataUrl = await drawPhoto(file, mime, PHOTO_QUALITIES[i]);
      if (!dataUrl) return { error: PHOTO_FAIL };
      if (dataUrlBytes(dataUrl) <= PHOTO_MAX_BYTES) return { dataUrl: dataUrl };
    }
    return { error: PHOTO_TOO_BIG };
  }

  function todayInput() {
    const now = PortalTime.toInput(Date.now());
    return now ? now.slice(0, 10) : '';
  }

  function resetAlbumForm() {
    const form = $('albumForm');
    if (form && typeof form.reset === 'function') form.reset();
    const dateEl = $('photoDate');
    if (dateEl) dateEl.value = todayInput();
  }

  async function submitAlbum(e) {
    e.preventDefault();
    const msg = $('albumMsg');
    const input = $('photoInput');
    const phraseEl = $('photoPhrase');
    const dateEl = $('photoDate');
    const file = input && input.files && input.files[0] ? input.files[0] : null;

    if (!file) { showMsg(msg, 'Elige una foto primero.'); return; }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      showMsg(msg, 'Solo se aceptan fotos JPEG o PNG.');
      return;
    }

    let when = null;
    if (dateEl && dateEl.value) {
      when = toEpoch(dateEl.value + 'T12:00');
      if (when === null) { showMsg(msg, 'Esa fecha no es válida.'); return; }
    }

    const btn = $('albumSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Preparando…'; }
    showMsg(msg, '');

    let prepared;
    try {
      prepared = await buildPhoto(file);
    } catch (err) {
      prepared = { error: PHOTO_FAIL };
    }
    if (prepared.error) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      showMsg(msg, prepared.error);
      return;
    }

    if (btn) btn.textContent = 'Guardando…';
    const res = await PortalAPI('album', {
      method: 'POST',
      body: {
        dataUrl: prepared.dataUrl,
        phrase: phraseEl ? phraseEl.value.trim().slice(0, 140) : '',
        date: when,
      },
    });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) {
      showMsg(msg, res.error === 'foto-grande' ? PHOTO_TOO_BIG : errorText(res));
      return;
    }

    fx('haptic', btn);
    fx('sndPop');
    resetAlbumForm();
    showMsg(msg, '');
    showMsg($('memoriesMsg'), 'Guardado');
    setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);

    /* la foto nueva aparece arriba al instante */
    if (res.ok && res.data.photo) {
      mod.photos.unshift(res.data.photo);
      const grid = $('photoGrid');
      if (grid) {
        grid.insertBefore(photoCell(res.data.photo), grid.firstChild);
        const empty = grid.querySelector('.album-empty');
        if (empty) empty.remove();
      }
      saveCache();
    }
    return;
  }

  async function deletePhoto(id) {
    if (!id) return;
    if (!confirm('¿Borrar esta foto? No se puede deshacer.')) return;
    const res = await PortalAPI('album', { method: 'DELETE', body: { id: id } });
    if (!res.ok) { showMsg($('memoriesMsg'), errorText(res)); return; }
    revokePhoto(id);
    mod.photos = mod.photos.filter((photo) => photo.id !== id);
    showMsg($('memoriesMsg'), '');
    await load();
  }

  /* ══════════════════════════════════════════════════════
     DIARIO A DOS VOCES · daniel→a, kitzya→b
     una sola ronda abierta; se revela con el segundo texto.
     No existe borrado.
     ══════════════════════════════════════════════════════ */
  function diaryParts() {
    const diary = mod.diary || { current: null, revealed: [] };
    const revealed = Array.isArray(diary.revealed) ? diary.revealed : [];
    const current = diary.current || null;
    const open = current && !current.done ? current : null;

    const rounds = revealed.slice();
    if (current && current.done && !rounds.some((r) => r.id === current.id)) rounds.push(current);
    return { open: open, rounds: rounds, known: mod.diaryOk };
  }

  function diaryPill(round) {
    if (round.hasOther) {
      return round.mine ? 'Las dos partes están escritas' : 'Ya falta la tuya';
    }
    return 'Falta la de ' + otherName();
  }

  function diaryHintText(open) {
    if (!open) return DIARY_HINT;
    if (open.hasOther) {
      return open.mine
        ? 'Las dos partes ya están escritas: se revela al guardar.'
        : 'Ya falta la tuya: ' + otherName() + ' ya escribió la suya.';
    }
    return open.mine
      ? 'Escribiste tu parte. Se revela cuando ' + otherName() + ' escriba la suya.'
      : 'Todavía no hay nada escrito. La ronda espera las dos partes.';
  }

  function diarySide(slot, side) {
    const box = el('div', 'diary-side');
    const mine = slot === mySlot();
    if (mine) box.classList.add('is-mine');

    const who = (mine ? 'Tú · ' : '') + (NAMES[slot] || slot);
    box.appendChild(el('span', 'diary-who', who));

    if (!side || typeof side.text !== 'string') {
      box.appendChild(el('p', 'diary-text is-empty', 'Sin texto todavía.'));
      return box;
    }

    box.appendChild(el('p', 'diary-text', side.text));
    const when = el('time', 'diary-when', shortDate(side.at));
    if (Number.isFinite(side.at)) when.dateTime = new Date(side.at).toISOString();
    box.appendChild(when);
    return box;
  }

  function diaryRound(round) {
    const box = el('article', 'diary-round is-done');
    if (round.id) box.setAttribute('data-diary-id', round.id);

    const head = el('div', 'diary-actions');
    head.appendChild(el('span', 'diary-pill', 'Revelada'));
    const when = el('time', 'diary-when', shortDate(round.completedAt));
    if (Number.isFinite(round.completedAt)) when.dateTime = new Date(round.completedAt).toISOString();
    head.appendChild(when);
    box.appendChild(head);

    box.appendChild(diarySide('a', round.a));
    box.appendChild(diarySide('b', round.b));
    return box;
  }

  function diaryOpenCard(round) {
    const box = el('article', 'diary-round is-open');
    if (round.id) box.setAttribute('data-diary-id', round.id);

    const head = el('div', 'diary-actions');
    head.appendChild(el('span', 'diary-pill', diaryPill(round)));
    box.appendChild(head);

    /* solo mi texto: el del otro no viaja hasta que estén las dos partes */
    box.appendChild(diarySide(mySlot(), round.mine ? { text: round.mine, at: round.mineAt } : null));

    const actions = el('div', 'diary-actions');
    const btn = el('button', 'btn-ghost', round.mine ? 'Editar mi parte' : 'Escribir mi parte');
    btn.type = 'button';
    if (round.mine && round.id) btn.setAttribute('data-diary-edit', round.id);
    else if (round.id) btn.setAttribute('data-diary-write', round.id);
    else btn.setAttribute('data-diary-write', '');
    btn.setAttribute('aria-label', round.mine ? 'Editar mi parte de esta ronda' : 'Escribir mi parte de esta ronda');
    actions.appendChild(btn);
    box.appendChild(actions);
    return box;
  }

  function diaryStartCard(known) {
    const box = el('article', 'diary-round is-new');

    const actions = el('div', 'diary-actions');
    const btn = el('button', 'btn-ghost', 'Escribir mi parte');
    btn.type = 'button';
    btn.setAttribute('data-diary-write', '');
    btn.setAttribute('aria-label', 'Escribir mi parte del diario');
    actions.appendChild(btn);
    box.appendChild(actions);

    box.appendChild(el('p', 'diary-text is-empty',
      known
        ? 'Todavía no hay rondas escritas. Empiecen una cuando quieran.'
        : 'Sin conexión y nada guardado todavía.'));
    return box;
  }

  function renderDiary() {
    const list = $('diaryList');
    if (!list) return;
    list.textContent = '';

    const parts = diaryParts();
    const open = parts.open;
    const rounds = parts.rounds;

    if (!rounds.length && !open) {
      list.appendChild(diaryStartCard(parts.known));
    } else {
      if (open) list.appendChild(diaryOpenCard(open));
      rounds.forEach((round) => list.appendChild(diaryRound(round)));
    }

    const hint = $('diaryHint');
    if (hint) hint.textContent = diaryHintText(open);

    const form = $('diaryForm');
    if (form) {
      form.hidden = mod.diaryEdit === null;
      const text = $('diaryText');
      if (text) text.value = mod.diaryEdit === null ? '' : mod.diaryDraft;
      const submit = $('diarySubmit');
      if (submit) submit.textContent = 'Guardar mi parte';
    }
    syncWrites();
  }

  function openDiaryForm(id) {
    const round = diaryParts().open;
    mod.diaryEdit = id || '';
    mod.diaryDraft = (round && round.mine && (!id || round.id === id)) ? round.mine : '';

    const form = $('diaryForm');
    const text = $('diaryText');
    if (text) text.value = mod.diaryDraft;
    if (form) form.hidden = false;
    showMsg($('diaryMsg'), '');
    syncWrites();
    if (text) text.focus();
  }

  function closeDiaryForm() {
    mod.diaryEdit = null;
    mod.diaryDraft = '';
    const form = $('diaryForm');
    if (form) form.hidden = true;
    const text = $('diaryText');
    if (text) text.value = '';
    showMsg($('diaryMsg'), '');
  }

  async function submitDiary(e) {
    e.preventDefault();
    const msg = $('diaryMsg');
    const textEl = $('diaryText');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) { showMsg(msg, 'Escribe tu parte primero.'); return; }

    const body = { text: text };
    if (mod.diaryEdit) body.id = mod.diaryEdit;

    const btn = $('diarySubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg(msg, '');

    const res = await PortalAPI('diary', { method: 'POST', body: body });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) {
      if (res.error === 'revelada') {
        closeDiaryForm();
        showMsg(msg, DIARY_REVELADA);
        showMsg($('memoriesMsg'), 'Guardado');
        setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);
        await load();
        return;
      }
      showMsg(msg, errorText(res));
      return;
    }

    const round = res.data && res.data.round;
    const revealedNow = !!(round && round.done);
    closeDiaryForm();

    showMsg($('memoriesMsg'), 'Guardado');
    setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);

    if (revealedNow) {
      fx('haptic', btn);
      fx('sndPop');
      const card = $('diaryCard');
      if (card && typeof window.burst === 'function') {
        const box = card.getBoundingClientRect();
        fx('burst', box.left + box.width / 2, box.top + 40, 10);
      }
    }

    await load();
  }

  /* ── escritura ── */
  async function submitLetter(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = $('letterMsg');
    const bodyEl = $('letterBody');
    const titleEl = $('letterTitle');
    const whenEl = $('letterWhen');
    const body = bodyEl ? bodyEl.value.trim() : '';

    if (!body) { showMsg(msg, 'Escribe tu carta primero.'); return; }

    let opensAt = null;
    if (whenEl && whenEl.value) {
      opensAt = toEpoch(whenEl.value);
      if (opensAt === null) { showMsg(msg, 'Esa fecha no es válida.'); return; }
    }

    const btn = $('letterSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg(msg, '');

    const res = await PortalAPI('letters', {
      method: 'POST',
      body: {
        title: titleEl ? titleEl.value.trim().slice(0, 80) : '',
        body,
        opensAt,
      },
    });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) { showMsg(msg, errorText(res)); return; }

    if (form) { form.reset(); form.hidden = true; }
    const toggle = $('letterToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    /* aparece arriba al instante, sin recargar toda la lista */
    const newLetter = { ...res.data, sealed: res.data.sealed };
    mod.letters.unshift(newLetter);
    const list = $('lettersList');
    if (list) {
      list.insertBefore(letterCard(newLetter), list.firstChild);
      const empty = $('lettersEmpty');
      if (empty) empty.hidden = true;
    }
    saveCache();

    showMsg($('memoriesMsg'), 'Guardado');
    setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);
  }

  async function submitCapsuleDate(e) {
    e.preventDefault();
    const msg = $('capsuleMsg');
    const whenEl = $('capsuleWhen');
    const when = toEpoch(whenEl ? whenEl.value : '');
    if (when === null) { showMsg(msg, 'Elige una fecha y hora.'); return; }
    if (when <= Date.now()) { showMsg(msg, 'Elige una fecha futura.'); return; }

    const btn = $('capsuleSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sellando…'; }
    showMsg(msg, '');

    const res = await PortalAPI('capsule', {
      method: 'POST',
      body: { op: 'setdate', when },
    });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) { showMsg(msg, errorText(res)); return; }

    if (whenEl) whenEl.value = '';
    showMsg(msg, '');
    showMsg($('memoriesMsg'), 'Guardado');
    setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);
    await load();
  }

  async function submitCapsuleEntry(e) {
    e.preventDefault();
    const msg = $('capsuleAddMsg');
    const textEl = $('capsuleText');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) { showMsg(msg, 'Escribe algo primero.'); return; }

    const btn = $('capsuleAddSubmit');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    showMsg(msg, '');

    const res = await PortalAPI('capsule', {
      method: 'POST',
      body: { op: 'add', text },
    });

    if (btn) { btn.disabled = false; btn.textContent = label; }
    if (!res.ok) { showMsg(msg, errorText(res)); return; }

    if (textEl) textEl.value = '';
    showMsg(msg, '');
    showMsg($('memoriesMsg'), 'Guardado');
    setTimeout(() => { showMsg($('memoriesMsg'), ''); }, 1500);
    await load();
  }

  async function deleteLetter(id) {
    if (!id) return;
    if (!confirm('¿Borrar esta carta? No se puede deshacer.')) return;
    const res = await PortalAPI('letters', { method: 'DELETE', body: { id } });
    if (!res.ok) { showMsg($('memoriesMsg'), errorText(res)); return; }
    showMsg($('memoriesMsg'), '');
    mod.open.delete(id);
    await load();
  }

  async function deleteEntry(id) {
    if (!id) return;
    if (!confirm('¿Borrar esta entrada de la cápsula? No se puede deshacer.')) return;
    const res = await PortalAPI('capsule', { method: 'DELETE', body: { id } });
    if (!res.ok) { showMsg($('memoriesMsg'), errorText(res)); return; }
    showMsg($('memoriesMsg'), '');
    await load();
  }

  /* ── enlaces de interfaz (una sola vez) ── */
  function wire() {
    const lettersList = $('lettersList');
    if (lettersList) {
      lettersList.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete-letter]');
        if (del) { deleteLetter(del.getAttribute('data-delete-letter')); return; }

        const head = e.target.closest('.letter-head');
        if (!head || head.disabled) return;
        const card = head.closest('.letter-card');
        if (!card) return;
        const open = card.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');

        const id = card.getAttribute('data-letter-id');
        if (id) {
          if (open) mod.open.add(id); else mod.open.delete(id);
        }
      });
    }

    const toggle = $('letterToggle');
    const form = $('letterForm');
    if (toggle && form) {
      toggle.addEventListener('click', () => {
        const open = form.hidden;
        form.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          const first = $('letterTitle');
          if (first) first.focus();
        }
      });
    }

    const cancel = $('letterCancel');
    if (cancel && form && toggle) {
      cancel.addEventListener('click', () => {
        form.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        showMsg($('letterMsg'), '');
      });
    }

    if (form) form.addEventListener('submit', submitLetter);

    const capsuleForm = $('capsuleForm');
    if (capsuleForm) capsuleForm.addEventListener('submit', submitCapsuleDate);

    const capsuleAdd = $('capsuleAddForm');
    if (capsuleAdd) capsuleAdd.addEventListener('submit', submitCapsuleEntry);

    const capsuleList = $('capsuleList');
    if (capsuleList) {
      capsuleList.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete-entry]');
        if (!del) return;
        deleteEntry(del.getAttribute('data-delete-entry'));
      });
    }

    const capsuleWhen = $('capsuleWhen');
    if (capsuleWhen) {
      const setMin = () => {
        capsuleWhen.min = PortalTime.toInput(Date.now() + 60000);
      };
      setMin();
      capsuleWhen.addEventListener('focus', setMin);
    }

    /* ── álbum ── */
    const albumForm = $('albumForm');
    if (albumForm) albumForm.addEventListener('submit', submitAlbum);

    const photoGrid = $('photoGrid');
    if (photoGrid) {
      photoGrid.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete-photo]');
        if (!del) return;
        deletePhoto(del.getAttribute('data-delete-photo'));
      });
    }

    const photoInput = $('photoInput');
    if (photoInput) {
      photoInput.addEventListener('change', () => showMsg($('albumMsg'), ''));
    }

    const photoDate = $('photoDate');
    if (photoDate) {
      photoDate.value = todayInput();
      const setToday = () => {
        if (!photoDate.value) photoDate.value = todayInput();
      };
      photoDate.addEventListener('focus', setToday);
    }

    /* ── diario ── */
    const diaryForm = $('diaryForm');
    if (diaryForm) diaryForm.addEventListener('submit', submitDiary);

    const diaryList = $('diaryList');
    if (diaryList) {
      diaryList.addEventListener('click', (e) => {
        const write = e.target.closest('[data-diary-write]');
        if (write && !write.disabled) {
          openDiaryForm(write.getAttribute('data-diary-write') || '');
          return;
        }
        const edit = e.target.closest('[data-diary-edit]');
        if (edit && !edit.disabled) {
          openDiaryForm(edit.getAttribute('data-diary-edit') || '');
        }
      });
    }

    const diaryCancel = $('diaryCancel');
    if (diaryCancel) diaryCancel.addEventListener('click', closeDiaryForm);

    const diaryText = $('diaryText');
    if (diaryText) {
      diaryText.addEventListener('input', () => { mod.diaryDraft = diaryText.value; });
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
      if (Array.isArray(cached.letters)) mod.letters = cached.letters;
      if (cached.capsule) mod.capsule = cached.capsule;
      if (Array.isArray(cached.photos)) mod.photos = cached.photos;
      if (cached.diary) mod.diary = cached.diary;
      renderLetters();
      renderCapsule();
      renderAlbum();
      renderDiary();
    }

    if (isActive()) load();
  });

  PortalBus.on('portal:tab', (detail) => {
    if (!mod.ready || !detail) return;
    if (detail.tab === 'cartas') load();
  });

  PortalBus.on('portal:heartbeat', () => {
    if (mod.ready && isActive()) load();
  });

  PortalBus.on('portal:auth-lost', () => {
    if (!mod.ready) return;
    mod.albumOk = false;
    mod.diaryOk = false;
    setNetwork(false);
    noteOffline('Tu sesión ya no es válida. Entra otra vez.');
  });

  addEventListener('offline', () => {
    setNetwork(false);
    noteOffline(OFFLINE_NOTE);
  });
  addEventListener('online', () => setNetwork(true));
})();
