/* ═══════════════════════════════════════════════════════════
   API · bus de eventos, cliente HTTP y fechas del portal
   Único archivo que expone en window:
   PortalBus · PortalAPI · PortalCache · PortalTime · toEpoch
   (excepción a la regla de IIFE: los módulos lo necesitan)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PORTAL_SESSION_KEY = 'portal-session-v1';
  const PORTAL_TZ = 'America/Mexico_City';

  /* ── bus de eventos ──
     portal:ready se guarda y se reentrega a quien se suscriba tarde:
     portal.js corre antes que los módulos y emite al arrancar. */
  const listeners = Object.create(null);
  let readyDetail = null;

  const PortalBus = {
    on(name, fn) {
      if (typeof fn !== 'function') return;
      (listeners[name] || (listeners[name] = [])).push(fn);
      if (name === 'portal:ready' && readyDetail !== null) {
        try { fn(readyDetail); } catch (e) {}
      }
    },
    emit(name, detail) {
      if (name === 'portal:ready') readyDetail = detail == null ? {} : detail;
      const list = listeners[name];
      if (!list) return;
      list.slice().forEach((fn) => {
        try { fn(detail); } catch (e) {}
      });
    },
  };

  /* ── sesión (se lee en cada llamada: no depende de portal.js) ── */
  function readSession() {
    try {
      const s = JSON.parse(localStorage.getItem(PORTAL_SESSION_KEY) || 'null');
      if (s && s.profile && s.token) return s;
    } catch (e) {}
    return null;
  }

  /* ── cliente HTTP ──
     Firma: PortalAPI(action, { method, body, query, binary })
     → { ok, status, data, error }  ·  binary añade { blob } */
  async function PortalAPI(action, opts) {
    const options = opts || {};
    const method = String(options.method || 'GET').toUpperCase();
    const params = new URLSearchParams({ action: String(action) });
    if (options.query) {
      Object.keys(options.query).forEach((key) => {
        const value = options.query[key];
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
    }

    const headers = {};
    const session = readSession();
    if (session) {
      headers['x-portal-profile'] = session.profile;
      headers['x-portal-token'] = session.token;
    }

    let body;
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    if (navigator.onLine === false) {
      return { ok: false, status: 0, data: null, error: 'offline' };
    }

    let res;
    try {
      res = await fetch('/api?' + params.toString(), {
        method,
        headers,
        body,
        credentials: 'same-origin',
      });
    } catch (e) {
      return { ok: false, status: 0, data: null, error: 'offline' };
    }

    if (options.binary) {
      if (res.ok) {
        try {
          return { ok: true, status: res.status, data: null, blob: await res.blob(), error: null };
        } catch (e) {
          return { ok: false, status: res.status, data: null, error: 'lectura' };
        }
      }
      let data = null;
      try { data = await res.json(); } catch (e) {}
      if (res.status === 401 && action !== 'auth') {
        PortalBus.emit('portal:auth-lost', { action });
      }
      return { ok: false, status: res.status, data, error: (data && data.error) || 'http' };
    }

    let data = null;
    try { data = await res.json(); } catch (e) {}

    /* el login maneja su propio 401; el resto avisa a portal.js */
    if (res.status === 401 && action !== 'auth') {
      PortalBus.emit('portal:auth-lost', { action });
    }

    if (!res.ok) {
      return { ok: false, status: res.status, data, error: (data && data.error) || 'http' };
    }
    return { ok: true, status: res.status, data, error: null };
  }

  /* ── caché de lecturas para abrir sin red ── */
  const PortalCache = {
    get(key) {
      try {
        const raw = localStorage.getItem('cache-' + key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem('cache-' + key, JSON.stringify(value)); } catch (e) {}
    },
  };

  /* ── fechas locales del portal ──
     toEpoch('YYYY-MM-DDTHH:mm') interpreta el valor de datetime-local
     en America/Mexico_City. Prohibido new Date('YYYY-MM-DD') (eso es UTC). */
  function zoneOffset(ms) {
    const base = Math.floor(ms / 1000) * 1000;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PORTAL_TZ,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(base));
    const o = {};
    parts.forEach((p) => { o[p.type] = p.value; });
    const hour = Number(o.hour) % 24;   // algunos motores devuelven "24"
    const asUTC = Date.UTC(
      Number(o.year), Number(o.month) - 1, Number(o.day),
      hour, Number(o.minute), Number(o.second)
    );
    return asUTC - base;
  }

  function toEpoch(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
    const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const wall = Date.UTC(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4]), Number(m[5]), Number(m[6] || 0)
    );
    let guess = wall - zoneOffset(wall);
    const offset = zoneOffset(guess);
    if (wall - offset !== guess) guess = wall - offset;
    return guess;
  }

  function toInput(ms) {
    if (!Number.isFinite(ms)) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PORTAL_TZ,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(ms));
    const o = {};
    parts.forEach((p) => { o[p.type] = p.value; });
    const hour = String(Number(o.hour) % 24).padStart(2, '0');
    return o.year + '-' + o.month + '-' + o.day + 'T' + hour + ':' + o.minute;
  }

  window.PortalBus = PortalBus;
  window.PortalAPI = PortalAPI;
  window.PortalCache = PortalCache;
  window.PortalTime = { toEpoch, toInput, tz: PORTAL_TZ };
  window.toEpoch = toEpoch;
})();
