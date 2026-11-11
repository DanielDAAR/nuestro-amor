/* ═══════════════════════════════════════════════════════════
   MEMORIES · pestaña Cartas
   Cartas con fecha de apertura + cápsula del tiempo.
   IIFE: no declara nada en el scope global.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-cartas';
  const CACHE_KEY = 'memories-v1';
  const TZ = 'America/Mexico_City';
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };

  const mod = {
    ready: false,
    fetching: false,
    letters: [],
    capsule: null,
    me: 'kitzya',
    open: new Set(),
  };

  const longFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
  const shortFmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric', month: 'short',
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
  function otherName() {
    return NAMES[mod.me === 'daniel' ? 'kitzya' : 'daniel'];
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
    if (res.error === 'fecha-invalida') return 'Esa fecha no es válida.';
    if (res.error === 'capsula-abierta') return 'La cápsula ya se abrió.';
    if (res.error === 'texto-invalido') return 'El texto no es válido.';
    if (res.error === 'no-es-tuya') return 'Eso no es tuyo.';
    return 'No se pudo guardar. Inténtalo otra vez.';
  }

  function setNetwork(ok) {
    ['letterSubmit', 'capsuleSubmit', 'capsuleAddSubmit'].forEach((id) => {
      const btn = $(id);
      if (btn) btn.disabled = !ok;
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
      ]);
      const lettersRes = results[0];
      const capsuleRes = results[1];

      let fresh = false;
      if (lettersRes.ok && lettersRes.data && Array.isArray(lettersRes.data.letters)) {
        mod.letters = lettersRes.data.letters;
        fresh = true;
      }
      if (capsuleRes.ok && capsuleRes.data) {
        mod.capsule = capsuleRes.data;
        fresh = true;
      }

      if (fresh) {
        setNetwork(true);
        PortalCache.set(CACHE_KEY, { letters: mod.letters, capsule: mod.capsule });
      } else if (lettersRes.status === 0 || capsuleRes.status === 0) {
        setNetwork(false);
        const cached = PortalCache.get(CACHE_KEY);
        if (cached) {
          if (Array.isArray(cached.letters)) mod.letters = cached.letters;
          if (cached.capsule) mod.capsule = cached.capsule;
        }
      }

      renderLetters();
      renderCapsule();
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
    await load();
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
      renderLetters();
      renderCapsule();
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

  addEventListener('offline', () => setNetwork(false));
  addEventListener('online', () => setNetwork(true));
})();
