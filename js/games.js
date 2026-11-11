/* ═══════════════════════════════════════════════════════════
   GAMES · pestaña Juegos
   Partidas por turnos (tres en raya, 4 en línea, memoria,
   ahorcado) + quizzes de pareja.
   IIFE: no declara nada en el scope global.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PANEL_ID = 'panel-juegos';
  const CACHE_KEY = 'games-v1';
  const PROGRESS_KEY = 'games-quiz-v1';
  const NAMES = { daniel: 'Daniel', kitzya: 'Kitzya' };
  const KINDS = ['ttt', 'four', 'memory', 'hangman'];
  const KIND_NAME = {
    ttt: 'Tres en raya',
    four: '4 en línea',
    memory: 'Memoria',
    hangman: 'Ahorcado',
  };
  const QUIZ_KINDS = ['conoces', 'estooaquello'];
  const MEM_SYMBOLS = ['🌸', '🎀', '💗', '🌷', '✨', '🍓', '🌙', '💫'];
  const ALPHA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  const TTT_CELLS = 9;
  const MEM_CELLS = 16;
  const FOUR_COLS = 7;
  const HANGMAN_MAX_WRONG = 6;
  const OFFLINE_NOTE = 'Sin conexión: estás viendo la última partida guardada.';

  const mod = {
    ready: false,
    fetching: false,
    me: 'kitzya',
    kind: null,
    games: [],
    game: null,
    lastCells: [],
    busy: false,
    writable: true,
    note: '',
    noteOffline: false,
    wordOpen: false,
    quizKind: 'conoces',
    quiz: {
      conoces: { data: null, answers: {}, loading: false, saving: false, dirty: false },
      estooaquello: { data: null, answers: {}, loading: false, saving: false, dirty: false },
    },
  };

  let wordForm = null;
  let hangmanArt = null;

  /* ── utilidades ── */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function svg(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  }

  function sfx(name) {
    try {
      const fn = window[name];
      if (typeof fn !== 'function') return;
      const args = Array.prototype.slice.call(arguments, 1);
      fn.apply(null, args);
    } catch (e) {}
  }

  function other() { return mod.me === 'daniel' ? 'kitzya' : 'daniel'; }
  function otherName() { return NAMES[other()] || 'la otra persona'; }
  function isActive() {
    const panel = $(PANEL_ID);
    return !!panel && !panel.hidden;
  }
  function showMsg(node, text) {
    if (!node) return;
    node.textContent = text || '';
    node.hidden = !text;
  }
  function gameMsg(text) { showMsg($('gamesMsg'), text); }

  function quizState(kind) {
    const key = kind || mod.quizKind;
    if (!mod.quiz[key]) mod.quiz[key] = { data: null, answers: {}, loading: false, saving: false, dirty: false };
    return mod.quiz[key];
  }

  /* ── errores → español de tú, sobrio ── */
  function gameError(res) {
    if (!res || res.status === 0) return 'Sin conexión. Inténtalo cuando vuelvas a tener red.';
    if (res.status === 401) return 'Tu sesión ya no es válida. Entra otra vez.';
    switch (res.error) {
      case 'revision-antigua': return 'La partida se movió. Ya la actualicé en pantalla.';
      case 'no-es-tu-turno': return 'Todavía no es tu turno.';
      case 'partida-cerrada': return 'Esta partida ya terminó.';
      case 'casilla-invalida': return 'Esa casilla no se puede usar.';
      case 'columna-llena': return 'Esa columna ya está llena.';
      case 'letra-invalida': return 'Esa letra no vale.';
      case 'letra-repetida': return 'Esa letra ya la usaste.';
      case 'palabra-invalida': return 'Escribe una palabra de al menos 3 letras.';
      case 'juego-desconocido': return 'Ese juego no existe.';
      case 'partida-en-curso': return 'Todavía no se puede borrar: la partida sigue en curso o lleva menos de 7 días parada.';
      case 'no-existe': return 'Esa partida ya no existe.';
      case 'respuesta-invalida': return 'Elige una de las opciones.';
      case 'quiz-desconocido': return 'Ese quiz no existe.';
      default: return 'No se pudo completar. Inténtalo otra vez.';
    }
  }

  /* ── caché de la última partida conocida ── */
  function saveCache() {
    PortalCache.set(CACHE_KEY, {
      games: mod.games,
      kind: mod.kind,
      gameId: mod.game ? mod.game.id : null,
    });
  }

  function setWritable(ok) {
    mod.writable = ok !== false;
    const ng = $('btnNewGame');
    if (ng) ng.disabled = !mod.writable;
    const del = $('btnDeleteGame');
    if (del) del.disabled = !mod.writable;
  }

  /* ── progreso local de los quizzes ── */
  function readProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) { return {}; }
  }
  function saveProgress() {
    const all = readProgress();
    QUIZ_KINDS.forEach((kind) => {
      const st = mod.quiz[kind];
      if (!st) return;
      const answers = st.answers || {};
      if (Object.keys(answers).length) all[kind] = answers;
      else delete all[kind];
    });
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function clearProgress(kind) {
    const all = readProgress();
    delete all[kind];
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
  }

  /* ── lectura ── */
  async function load() {
    if (!mod.ready || mod.fetching) return;
    mod.fetching = true;
    try {
      const res = await PortalAPI('games');
      if (res.ok && res.data && Array.isArray(res.data.games)) {
        mod.games = res.data.games;
        setWritable(true);
        if (mod.noteOffline) { mod.note = ''; mod.noteOffline = false; }
        saveCache();
        gameMsg('');
      } else if (res.status === 0) {
        const cached = PortalCache.get(CACHE_KEY);
        if (cached && Array.isArray(cached.games)) mod.games = cached.games;
        setWritable(false);
        mod.note = OFFLINE_NOTE;
        mod.noteOffline = true;
      } else if (res.status === 401) {
        return;   /* portal.js ya muestra el acceso */
      } else {
        const cached = PortalCache.get(CACHE_KEY);
        if (cached && Array.isArray(cached.games)) mod.games = cached.games;
        gameMsg(gameError(res));
      }

      if (mod.game && mod.game.id) {
        const fresh = mod.games.filter((g) => g.id === mod.game.id)[0];
        if (fresh) applyGame(fresh);
        else { mod.game = null; mod.lastCells = []; }
      }
      if (mod.kind) syncGameFromList();
      render();

      if (isActive()) {
        const st = quizState();
        if (st.data && !st.dirty && !st.saving) loadQuiz(mod.quizKind, true);
        else loadQuiz(mod.quizKind, false);
      }
    } finally {
      mod.fetching = false;
    }
  }

  function pickGame(kind) {
    const open = mod.games.filter((g) => g.kind === kind && g.status === 'open')[0];
    if (open) return open;
    if (mod.game && mod.game.kind === kind && mod.game.status === 'done') return mod.game;
    return null;
  }

  function syncGameFromList() {
    if (!mod.kind) return;
    const target = pickGame(mod.kind);
    if (target && (!mod.game || mod.game.id !== target.id)) applyGame(target);
  }

  function diffCells(prev, next) {
    if (!prev || !next || prev.kind !== next.kind) return [];
    if (next.kind === 'ttt' || next.kind === 'four') {
      const a = Array.isArray(prev.board) ? prev.board : [];
      const b = Array.isArray(next.board) ? next.board : [];
      const out = [];
      for (let i = 0; i < b.length; i++) {
        if (!a[i] && b[i]) out.push(i);
      }
      return out;
    }
    if (next.kind === 'memory') {
      const a = prev.shown || {};
      const b = next.shown || {};
      return Object.keys(b)
        .filter((key) => a[key] === undefined)
        .map((key) => Number(key))
        .filter((n) => Number.isInteger(n));
    }
    return [];
  }

  function applyGame(game) {
    if (!game || !game.id) return;
    /* si el estado no cambió (latido), el resalte de la última ficha se queda */
    const diff = diffCells(mod.game, game);
    const sameGame = !!mod.game && mod.game.id === game.id;
    mod.lastCells = diff.length ? diff : (sameGame ? mod.lastCells : []);
    const found = mod.games.filter((g) => g.id === game.id)[0];
    if (found) {
      const idx = mod.games.indexOf(found);
      mod.games[idx] = game;
    } else {
      mod.games.unshift(game);
    }
    mod.game = game;
    if (KINDS.indexOf(game.kind) >= 0) mod.kind = game.kind;
    saveCache();
    render();
  }

  /* ── pintado ── */
  function render() {
    renderPicker();
    renderStatus();
    renderActions();
    renderWordForm();
    renderBoard();
  }

  function renderPicker() {
    const picker = $('gamePicker');
    if (!picker) return;
    /* el selector sigue activo sin red: permite ver la última partida guardada */
    picker.querySelectorAll('.game-pick').forEach((btn) => {
      const on = btn.getAttribute('data-game') === mod.kind;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function renderStatus() {
    const node = $('gameStatus');
    if (!node) return;
    node.textContent = '';
    const game = mod.game;
    let main;
    if (!mod.kind) main = 'Elige un juego para empezar la partida.';
    else if (!game) {
      main = mod.kind === 'hangman'
        ? 'Escribe una palabra de al menos 3 letras y que la adivine ' + otherName() + '.'
        : 'Todavía no hay partida de ' + KIND_NAME[mod.kind].toLowerCase() + '. Toca «Empezar partida».';
    } else {
      main = statusFor(game);
    }
    node.appendChild(el('span', 'game-status-main', main));
    if (mod.note) node.appendChild(el('span', 'game-status-note', mod.note));
  }

  function statusFor(game) {
    if (game.status === 'done') return endText(game);
    const mine = game.turn === mod.me;
    if (game.kind === 'hangman') {
      if (mine) return 'Tu turno: adivina la palabra letra por letra.';
      return 'Escribiste la palabra. Espera a que ' + otherName() + ' la adivine.';
    }
    if (game.kind === 'memory') {
      const score = game.score || {};
      const turno = mine ? 'Tu turno: destapa dos cartas.' : 'Es el turno de ' + otherName() + '.';
      return turno + ' Marcador: tú ' + (score[mod.me] || 0) + ' · ' + otherName() + ' ' + (score[other()] || 0) + '.';
    }
    return mine ? 'Tu turno.' : 'Es el turno de ' + otherName() + '.';
  }

  function endText(game) {
    const win = game.winner;
    if (game.kind === 'hangman') {
      const secret = typeof game.secret === 'string' ? game.secret : '';
      if (win === mod.me) {
        return game.players[1] === mod.me
          ? 'Adivinaste la palabra: ' + secret + '.'
          : 'Ganaste: no adivinaron tu palabra. Era ' + secret + '.';
      }
      return game.players[1] === mod.me
        ? 'Se acabaron los intentos, la palabra era ' + secret + '.'
        : otherName() + ' adivinó tu palabra: ' + secret + '.';
    }
    if (win === mod.me) return 'Ganaste esta partida.';
    if (!win) return 'Empate.';
    return 'Ganó ' + (NAMES[win] || win) + '.';
  }

  function renderActions() {
    const game = mod.game;
    const ng = $('btnNewGame');
    if (ng) {
      ng.textContent = 'Empezar partida';
      ng.disabled = !mod.writable;
    }
    const del = $('btnDeleteGame');
    if (del) {
      del.hidden = !(game && game.status === 'done');
      del.disabled = !mod.writable;
    }
  }

  /* ── tablero ── */
  function renderBoard() {
    const board = $('gameBoard');
    const word = $('hangmanWord');
    const keyboard = $('hangmanKeyboard');
    const game = mod.game;

    if (hangmanArt) hangmanArt.hidden = !(game && game.kind === 'hangman');
    if (word) word.hidden = !(game && game.kind === 'hangman');
    if (keyboard) keyboard.hidden = !(game && game.kind === 'hangman');

    if (!board) return;
    board.textContent = '';
    board.className = 'game-board';
    if (!game) return;

    if (game.kind === 'ttt') renderTtt(game, board);
    else if (game.kind === 'four') renderFour(game, board);
    else if (game.kind === 'memory') renderMemory(game, board);
    else if (game.kind === 'hangman') renderHangman(game);
  }

  function myMark(game) {
    const players = Array.isArray(game.players) ? game.players : [];
    return players[0] === mod.me ? 'X' : 'O';
  }

  function canPlay(game) {
    return !!game && game.status === 'open' && game.turn === mod.me &&
      mod.writable && !mod.busy;
  }

  function cellLabel(kind, pos, value, mark) {
    const where = kind === 'four'
      ? 'Columna ' + (pos + 1)
      : kind === 'memory' ? 'Carta ' + (pos + 1) : 'Casilla ' + (pos + 1);
    if (!value) return where + ', vacía';
    return where + ', ' + (value === mark ? 'tu ficha' : 'su ficha');
  }

  function renderTtt(game, board) {
    board.className = 'game-board board-ttt';
    board.textContent = '';
    const cells = Array.isArray(game.board) ? game.board : [];
    const mark = myMark(game);
    const playable = canPlay(game);
    for (let i = 0; i < TTT_CELLS; i++) {
      const value = cells[i] ? String(cells[i]) : '';
      const cell = el('button', 'board-cell');
      cell.type = 'button';
      cell.setAttribute('data-cell', String(i));
      if (value) {
        cell.textContent = value;
        cell.classList.add(value === 'X' ? 'is-x' : 'is-o', 'is-marked');
        cell.disabled = true;
      } else {
        cell.disabled = !playable;
      }
      if (mod.lastCells.indexOf(i) >= 0) cell.classList.add('is-last');
      cell.setAttribute('aria-label', cellLabel('ttt', i, value, mark));
      board.appendChild(cell);
    }
  }

  function renderFour(game, board) {
    board.className = 'game-board board-four';
    board.textContent = '';
    const cells = Array.isArray(game.board) ? game.board : [];
    const mark = myMark(game);
    const playable = canPlay(game);
    for (let i = 0; i < cells.length; i++) {
      const col = i % FOUR_COLS;
      const value = cells[i] ? String(cells[i]) : '';
      const cell = el('button', 'board-cell');
      cell.type = 'button';
      cell.setAttribute('data-cell', String(col));
      cell.setAttribute('data-index', String(i));
      if (value) {
        cell.textContent = value;
        cell.classList.add(value === 'X' ? 'is-x' : 'is-o', 'is-marked');
        cell.disabled = true;
      } else {
        cell.disabled = !playable;
      }
      if (mod.lastCells.indexOf(i) >= 0) cell.classList.add('is-last');
      cell.setAttribute('aria-label', cellLabel('four', col, value, mark));
      board.appendChild(cell);
    }
  }

  function memSymbol(value) {
    if (typeof value === 'number' && value >= 0 && value < MEM_SYMBOLS.length) {
      return MEM_SYMBOLS[value];
    }
    return String(value);
  }

  function renderMemory(game, board) {
    board.className = 'game-board board-memory';
    board.textContent = '';
    const shown = game.shown && typeof game.shown === 'object' ? game.shown : {};
    const total = Number(game.total) > 0 ? Number(game.total) : MEM_CELLS;
    const playable = canPlay(game);

    /* el mazo trae cada símbolo dos veces: dos cartas vistas con el mismo
       símbolo son par hecho; una sola vista es el par que está al aire */
    const counts = {};
    Object.keys(shown).forEach((key) => {
      const symbol = shown[key];
      const id = String(symbol);
      counts[id] = (counts[id] || 0) + 1;
    });

    for (let i = 0; i < total; i++) {
      const symbol = shown[i];
      const up = symbol !== undefined && symbol !== null;
      const matched = up && counts[String(symbol)] === 2;
      const card = el('button', 'board-cell');
      card.type = 'button';
      card.setAttribute('data-cell', String(i));
      card.setAttribute('data-index', String(i));
      if (up) {
        card.textContent = memSymbol(symbol);
        card.classList.add('is-up');
        card.classList.add(matched ? 'is-matched' : 'is-pending');
        card.disabled = matched || !playable;
      } else {
        card.textContent = '?';
        card.classList.add('is-down');
        card.disabled = !playable;
      }
      if (mod.lastCells.indexOf(i) >= 0) card.classList.add('is-last');
      const where = 'Carta ' + (i + 1) + ', ';
      card.setAttribute('aria-label', up ? where + (matched ? 'emparejada' : 'descubierta') : where + 'oculta');
      board.appendChild(card);
    }
  }

  /* ── ahorcado ── */
  function renderHangman(game) {
    const word = $('hangmanWord');
    const keyboard = $('hangmanKeyboard');
    const guesses = Array.isArray(game.guesses) ? game.guesses.map(String) : [];
    const wrong = Math.min(Math.max(Number(game.wrong) || 0, 0), HANGMAN_MAX_WRONG);
    const done = game.status === 'done';
    const secret = typeof game.secret === 'string' ? game.secret : '';

    if (word) {
      word.textContent = '';
      if (done && secret) {
        word.setAttribute('aria-label', 'La palabra: ' + secret);
        secret.split('').forEach((letter) => {
          if (letter === ' ') {
            word.appendChild(el('span', 'hw-space', ''));
            return;
          }
          const upper = letter.toUpperCase();
          const node = el('span', 'hw-letter', upper);
          node.classList.add(guesses.indexOf(upper) >= 0 ? 'is-ok' : 'is-missed');
          word.appendChild(node);
        });
      } else {
        word.setAttribute('aria-label', 'La palabra está oculta hasta el final');
        word.appendChild(el('span', 'hw-hint',
          guesses.length ? 'Letras usadas: ' + guesses.join(' · ') : 'Todavía no pruebas letras.'));
      }
    }

    if (keyboard) {
      keyboard.textContent = '';
      const playable = canPlay(game);
      ALPHA.forEach((letter) => {
        const key = el('button', 'hangman-key', letter);
        key.type = 'button';
        key.setAttribute('data-letter', letter);
        key.setAttribute('aria-label', 'Letra ' + letter);
        const used = guesses.indexOf(letter) >= 0 ||
          (letter === 'Ñ' && guesses.indexOf('N') >= 0);
        if (used) {
          key.classList.add('is-used');
          key.disabled = true;
          if (done && secret) {
            key.classList.add(secret.indexOf(letter) >= 0 ||
              (letter === 'Ñ' && secret.indexOf('N') >= 0) ? 'is-hit' : 'is-missed');
          }
        } else {
          key.disabled = !playable;
        }
        keyboard.appendChild(key);
      });
    }

    renderHangmanArt(wrong);
  }

  function renderHangmanArt(wrong) {
    if (!hangmanArt) return;
    hangmanArt.textContent = '';
    const svgNs = 'http://www.w3.org/2000/svg';
    const drawing = document.createElementNS(svgNs, 'svg');
    drawing.setAttribute('viewBox', '0 0 120 140');
    drawing.setAttribute('width', '120');
    drawing.setAttribute('height', '140');
    drawing.setAttribute('aria-hidden', 'true');
    drawing.setAttribute('focusable', 'false');

    /* horca siempre visible */
    const gallows = ['#D8A7BC', 4];
    drawing.appendChild(line('M12 134 H104', gallows));
    drawing.appendChild(line('M30 134 V14', gallows));
    drawing.appendChild(line('M30 14 H80', gallows));
    drawing.appendChild(line('M80 14 V26', ['#D8A7BC', 3]));

    /* el muñeco aparece fallo a fallo: 6 como máximo */
    const body = ['#FF375F', 4];
    const parts = [
      function () { drawing.appendChild(circlePart(80, 40, 12)); },
      function () { drawing.appendChild(line('M80 52 V94', body)); },
      function () { drawing.appendChild(line('M80 60 L62 76', body)); },
      function () { drawing.appendChild(line('M80 60 L98 76', body)); },
      function () { drawing.appendChild(line('M80 94 L66 118', body)); },
      function () { drawing.appendChild(line('M80 94 L94 118', body)); },
    ];
    for (let i = 0; i < Math.min(wrong, HANGMAN_MAX_WRONG); i++) parts[i]();

    hangmanArt.appendChild(drawing);
    hangmanArt.appendChild(el('p', 'hangman-fails',
      'Fallos: ' + Math.min(wrong, HANGMAN_MAX_WRONG) + ' de ' + HANGMAN_MAX_WRONG));
  }

  function line(d, style) {
    return svg('path', {
      d: d,
      stroke: style[0],
      'stroke-width': String(style[1]),
      'stroke-linecap': 'round',
      fill: 'none',
    });
  }
  function circlePart(cx, cy, r) {
    return svg('circle', {
      cx: String(cx), cy: String(cy), r: String(r),
      fill: 'none', stroke: '#FF375F', 'stroke-width': '4',
    });
  }

  /* ── campo de palabra (ahorcado) ── */
  function buildWordForm() {
    const form = el('form', 'game-word-form');
    form.noValidate = true;

    const label = el('label', 'field-label');
    label.textContent = 'Palabra para adivinar';
    label.setAttribute('for', 'gamesWord');

    const input = el('input', 'input');
    input.type = 'text';
    input.id = 'gamesWord';
    input.maxLength = 24;
    input.autocomplete = 'off';
    input.placeholder = 'Mínimo 3 letras';
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');

    const hint = el('p', 'field-hint');
    hint.textContent = 'Se manda una sola vez y no se vuelve a mostrar.';

    const actions = el('div', 'form-actions');
    const submit = el('button', 'btn', 'Empezar partida');
    submit.type = 'submit';
    const cancel = el('button', 'btn-ghost', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', () => {
      openWordForm(false);
      const ng = $('btnNewGame');
      if (ng) ng.focus();
    });
    actions.appendChild(submit);
    actions.appendChild(cancel);

    const msg = el('p', 'form-msg');
    msg.id = 'gamesWordMsg';
    msg.setAttribute('role', 'alert');
    msg.hidden = true;

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(hint);
    form.appendChild(actions);
    form.appendChild(msg);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitWord();
    });
    return form;
  }

  function openWordForm(on) {
    mod.wordOpen = !!on;
    renderWordForm();
    if (mod.wordOpen && wordForm) {
      const input = wordForm.querySelector('.input');
      if (input) input.focus();
    }
  }

  function renderWordForm() {
    if (!wordForm) return;
    const hangmanReady = mod.kind === 'hangman' && (!mod.game || mod.game.status !== 'open');
    const show = hangmanReady && mod.wordOpen && mod.writable;
    wordForm.hidden = !show;
    const msg = $('gamesWordMsg');
    if (msg && !show) { msg.textContent = ''; msg.hidden = true; }
  }

  function wordMsg(text) {
    const msg = $('gamesWordMsg');
    if (!msg) { gameMsg(text); return; }
    msg.textContent = text || '';
    msg.hidden = !text;
  }

  function sanitizeWord(raw) {
    return String(raw || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 24);
  }

  function submitWord() {
    if (!wordForm || mod.busy) return;
    const input = wordForm.querySelector('.input');
    const word = sanitizeWord(input ? input.value : '');
    if (word.replace(/ /g, '').length < 3) {
      wordMsg('Escribe una palabra de al menos 3 letras.');
      if (input) input.focus();
      return;
    }
    wordMsg('');
    create(word);
  }

  /* ── creación de partida ── */
  async function create(word) {
    const kind = mod.kind;
    if (!kind || KINDS.indexOf(kind) < 0) { gameMsg('Elige primero un juego.'); return; }
    if (mod.busy || !mod.writable) return;

    mod.busy = true;
    const btn = $('btnNewGame');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }
    gameMsg('');

    try {
      const body = { op: 'create', kind: kind };
      if (kind === 'hangman' && word) body.word = word;
      const res = await PortalAPI('games', { method: 'POST', body: body });

      if (res.ok && res.data && res.data.game) {
        mod.note = res.data.reused ? 'Ya tenían una partida abierta de este juego: es esta.' : '';
        mod.noteOffline = false;
        applyGame(res.data.game);
        if (wordForm) { wordForm.reset(); openWordForm(false); }
        mod.busy = false;
        if (btn) { btn.disabled = !mod.writable; btn.textContent = label; }
        render();
        sfx('sndPop');
        return;
      }

      if (res.data && res.data.game) applyGame(res.data.game);
      gameMsg(gameError(res));
    } finally {
      mod.busy = false;
      if (btn) { btn.disabled = !mod.writable; btn.textContent = label; }
      render();
    }
  }

  /* ── movimientos ── */
  async function move(payload) {
    const game = mod.game;
    if (!game || mod.busy || !mod.writable) return;
    if (game.status !== 'open' || game.turn !== mod.me) return;

    mod.busy = true;
    try {
      const body = { op: 'move', id: game.id, rev: game.rev };
      if (payload && payload.cell !== undefined) body.cell = payload.cell;
      if (payload && payload.letter !== undefined) body.letter = payload.letter;

      const res = await PortalAPI('games', { method: 'POST', body: body });
      if (res.ok && res.data && res.data.game) {
        const wasOpen = game.status === 'open';
        applyGame(res.data.game);
        if (wasOpen && mod.game.status === 'done') {
          sfx('sndChime');
          celebrate();
        } else {
          sfx('sndPop');
        }
        gameMsg('');
        mod.busy = false;
        render();
        return;
      }

      if (res.data && res.data.game) applyGame(res.data.game);
      gameMsg(gameError(res));
    } finally {
      mod.busy = false;
      render();
    }
  }

  function celebrate() {
    const board = $('gameBoard');
    const rect = board ? board.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    sfx('burst', x, y, 8);
  }

  /* ── borrar partida ── */
  async function deleteGame() {
    const game = mod.game;
    if (!game || mod.busy) return;
    if (!confirm('¿Borrar esta partida? No se puede deshacer.')) return;

    mod.busy = true;
    try {
      const res = await PortalAPI('games', { method: 'DELETE', body: { id: game.id } });
      if (res.ok) {
        mod.games = mod.games.filter((g) => g.id !== game.id);
        mod.game = null;
        mod.lastCells = [];
        mod.note = '';
        mod.noteOffline = false;
        saveCache();
        gameMsg('');
        render();
        return;
      }
      gameMsg(gameError(res));
      if (res.status !== 0) await load();
      else render();
    } finally {
      mod.busy = false;
      render();
    }
  }

  /* ── quizzes ── */
  function stripAnswers(questions) {
    /* la respuesta correcta nunca sale al cliente: solo el porcentaje */
    return questions.map((q) => ({ id: q.id, text: q.text, options: q.options }));
  }

  async function loadQuiz(kind, force) {
    if (QUIZ_KINDS.indexOf(kind) < 0) return;
    const st = quizState(kind);
    if (st.loading) return;
    if (st.data && !force) return;

    st.loading = true;
    if (kind === mod.quizKind) renderQuiz();
    try {
      const res = await PortalAPI('quiz', { query: { kind: kind } });
      if (res.ok && res.data && Array.isArray(res.data.questions)) {
        st.data = {
          kind: res.data.kind || kind,
          questions: stripAnswers(res.data.questions),
          mine: res.data.mine || null,
          theirs: res.data.theirs || null,
          match: typeof res.data.match === 'number' ? res.data.match : null,
        };
        const serverMine = st.data.mine || {};
        const local = readProgress()[kind] || {};
        const merged = {};
        st.data.questions.forEach((q) => {
          if (serverMine[q.id] !== undefined) merged[q.id] = Number(serverMine[q.id]);
          else if (local[q.id] !== undefined) merged[q.id] = Number(local[q.id]);
        });
        st.answers = merged;
        st.dirty = false;
        saveProgress();
        if (isComplete(st)) clearProgress(kind);
        gameMsg('');
      } else if (kind === mod.quizKind) {
        gameMsg(gameError(res));
      }
    } finally {
      st.loading = false;
      if (kind === mod.quizKind) renderQuiz();
    }
  }

  function isComplete(st) {
    if (!st.data) return false;
    return st.data.questions.every((q) => st.answers[q.id] !== undefined);
  }

  function nextUnanswered(st) {
    if (!st.data) return -1;
    for (let i = 0; i < st.data.questions.length; i++) {
      const q = st.data.questions[i];
      if (st.answers[q.id] === undefined) return i;
    }
    return -1;
  }

  function quizResultText(st) {
    const data = st.data;
    if (!data) return '';
    const answered = isComplete(st);
    if (data.theirs && typeof data.match === 'number' && answered) {
      return mod.quizKind === 'conoces'
        ? 'Le atinaste al ' + data.match + ' % de lo que preguntaste.'
        : 'Coinciden en el ' + data.match + ' %.';
    }
    if (data.theirs) {
      return answered
        ? 'Comparando respuestas…'
        : otherName() + ' ya respondió. Termina de responder para ver cuánto coinciden.';
    }
    return 'Falta que ' + otherName() + ' responda para ver el resultado.';
  }

  function renderQuiz() {
    const tabs = $('quizTabs');
    const qEl = $('quizQuestion');
    const oEl = $('quizOptions');
    const rEl = $('quizResult');
    if (!qEl || !oEl || !rEl) return;
    const st = quizState();

    if (tabs) {
      tabs.querySelectorAll('.quiz-tab').forEach((btn) => {
        const on = btn.getAttribute('data-quiz') === mod.quizKind;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    qEl.textContent = '';
    oEl.textContent = '';
    rEl.textContent = '';
    rEl.hidden = true;

    if (st.loading && !st.data) {
      qEl.appendChild(el('p', 'quiz-hint', 'Cargando las preguntas…'));
      return;
    }
    if (!st.data) {
      qEl.appendChild(el('p', 'quiz-hint', 'Toca la pestaña otra vez para cargar el quiz.'));
      return;
    }

    const result = quizResultText(st);
    if (result) { rEl.textContent = result; rEl.hidden = false; }

    const index = nextUnanswered(st);
    if (index < 0) {
      qEl.appendChild(el('p', 'quiz-done',
        'Listo: respondiste las ' + st.data.questions.length + ' preguntas.'));
      const again = el('button', 'quiz-option is-wide', 'Volver a responder');
      again.type = 'button';
      again.setAttribute('data-again', '1');
      again.setAttribute('aria-label', 'Volver a responder el quiz');
      again.disabled = st.saving || !mod.writable;
      oEl.appendChild(again);
      return;
    }

    const question = st.data.questions[index];
    qEl.appendChild(el('p', 'quiz-step',
      'Pregunta ' + (index + 1) + ' de ' + st.data.questions.length));
    qEl.appendChild(el('h3', 'quiz-text', question.text));

    question.options.forEach((option, i) => {
      const btn = el('button', 'quiz-option', option);
      btn.type = 'button';
      btn.setAttribute('data-qid', question.id);
      btn.setAttribute('data-idx', String(i));
      const chosen = st.answers[question.id] === i;
      if (chosen) {
        btn.classList.add('is-chosen');
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.disabled = st.saving || !mod.writable;
      oEl.appendChild(btn);
    });
  }

  async function chooseQuiz(qid, index) {
    const st = quizState();
    if (!st.data || st.saving) return;
    const question = st.data.questions.filter((q) => q.id === qid)[0];
    if (!question || index < 0 || index >= question.options.length) return;

    st.saving = true;
    st.dirty = true;
    st.answers[qid] = index;
    saveProgress();
    renderQuiz();

    try {
      const res = await PortalAPI('quiz', {
        method: 'POST',
        body: { kind: mod.quizKind, answers: st.answers },
      });
      if (res.ok) {
        st.dirty = false;
        gameMsg('');
        await loadQuiz(mod.quizKind, true);
      } else {
        delete st.answers[qid];
        st.dirty = false;
        saveProgress();
        gameMsg(gameError(res));
      }
    } finally {
      st.saving = false;
      renderQuiz();
    }
  }

  function restartQuiz() {
    const st = quizState();
    st.answers = {};
    /* marcamos dirty para que un latido no devuelva las respuestas viejas */
    st.dirty = true;
    clearProgress(mod.quizKind);
    saveProgress();
    renderQuiz();
  }

  /* ── enlaces de interfaz (una sola vez) ── */
  function wire() {
    const picker = $('gamePicker');
    if (picker) {
      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.game-pick');
        if (!btn || btn.disabled || mod.busy) return;
        const kind = btn.getAttribute('data-game');
        if (KINDS.indexOf(kind) < 0) return;
        sfx('ensureAudio');
        sfx('haptic', btn);
        mod.kind = kind;
        mod.note = '';
        mod.noteOffline = false;
        const game = pickGame(kind);
        if (game) applyGame(game);
        else {
          mod.game = null;
          mod.lastCells = [];
          render();
        }
        saveCache();
      });
    }

    const board = $('gameBoard');
    if (board) {
      board.addEventListener('click', (e) => {
        const cell = e.target.closest('.board-cell');
        if (!cell || cell.disabled || mod.busy) return;
        const game = mod.game;
        if (!game || !canPlay(game)) return;
        const raw = cell.getAttribute('data-cell');
        const value = Number(raw);
        if (!Number.isInteger(value)) return;
        if (game.kind === 'four') {
          if (value < 0 || value >= FOUR_COLS) return;
        } else if (game.kind === 'ttt') {
          if (value < 0 || value >= TTT_CELLS) return;
        } else if (game.kind === 'memory') {
          if (value < 0 || value >= MEM_CELLS) return;
        } else {
          return;
        }
        sfx('ensureAudio');
        sfx('sndPop');
        sfx('haptic', cell);
        move({ cell: value });
      });
    }

    const keyboard = $('hangmanKeyboard');
    if (keyboard) {
      keyboard.addEventListener('click', (e) => {
        const key = e.target.closest('.hangman-key');
        if (!key || key.disabled || mod.busy) return;
        const game = mod.game;
        if (!game || !canPlay(game)) return;
        const letter = key.getAttribute('data-letter');
        if (!letter || letter.length !== 1) return;
        sfx('ensureAudio');
        sfx('sndPop');
        sfx('haptic', key);
        move({ letter: letter });
      });
    }

    const ng = $('btnNewGame');
    if (ng) {
      ng.addEventListener('click', () => {
        if (mod.busy) return;
        sfx('ensureAudio');
        sfx('haptic', ng);
        if (!mod.kind) { gameMsg('Elige primero un juego.'); return; }
        /* el ahorcado siempre pide la palabra antes de crear una partida nueva */
        if (mod.kind === 'hangman' && (!mod.game || mod.game.status !== 'open')) {
          openWordForm(true);
          return;
        }
        create();
      });
    }

    const del = $('btnDeleteGame');
    if (del) del.addEventListener('click', deleteGame);

    const wordHost = $('hangmanWord');
    if (wordHost && wordHost.parentNode && !hangmanArt) {
      hangmanArt = el('div', 'hangman-art');
      hangmanArt.hidden = true;
      wordHost.parentNode.insertBefore(hangmanArt, wordHost);
    }

    const boardCard = $('gameBoard');
    if (boardCard && boardCard.parentNode && !wordForm) {
      wordForm = buildWordForm();
      wordForm.hidden = true;
      boardCard.parentNode.insertBefore(wordForm, boardCard.nextSibling);
    }

    const tabs = $('quizTabs');
    if (tabs) {
      tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-tab');
        if (!btn || btn.disabled) return;
        const kind = btn.getAttribute('data-quiz');
        if (QUIZ_KINDS.indexOf(kind) < 0) return;
        sfx('ensureAudio');
        sfx('haptic', btn);
        mod.quizKind = kind;
        renderQuiz();
        loadQuiz(kind, true);
      });
    }

    const options = $('quizOptions');
    if (options) {
      options.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-option');
        if (!btn || btn.disabled) return;
        if (btn.getAttribute('data-again')) {
          sfx('ensureAudio');
          sfx('haptic', btn);
          restartQuiz();
          return;
        }
        if (!mod.writable) { gameMsg('Sin conexión: no se puede guardar la respuesta.'); return; }
        const qid = btn.getAttribute('data-qid');
        const index = Number(btn.getAttribute('data-idx'));
        if (!qid || !Number.isInteger(index)) return;
        sfx('ensureAudio');
        sfx('sndPop');
        sfx('haptic', btn);
        chooseQuiz(qid, index);
      });
    }

    addEventListener('offline', () => {
      setWritable(false);
      render();
    });
    addEventListener('online', () => {
      setWritable(true);
      load();
    });
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
    setWritable(navigator.onLine !== false);

    /* con o sin red: la última partida conocida nunca deja el tablero en blanco */
    const cached = PortalCache.get(CACHE_KEY);
    if (cached && Array.isArray(cached.games)) {
      mod.games = cached.games;
      if (KINDS.indexOf(cached.kind) >= 0) mod.kind = cached.kind;
      const saved = mod.games.filter((g) => g.id === cached.gameId)[0];
      mod.game = saved || null;
      mod.lastCells = [];
      if (!saved && mod.kind) {
        const open = pickGame(mod.kind);
        if (open) mod.game = open;
      }
      render();
    }

    if (isActive()) {
      load();
      loadQuiz(mod.quizKind, true);
    }
  });

  PortalBus.on('portal:tab', (detail) => {
    if (!mod.ready || !detail) return;
    if (detail.tab === 'juegos') {
      load();
      loadQuiz(mod.quizKind, true);
    }
  });

  PortalBus.on('portal:heartbeat', () => {
    if (mod.ready && isActive()) load();
  });

  PortalBus.on('portal:auth-lost', () => {
    mod.busy = false;
  });
})();
