/* ═══════════════════════════════════════════════════════════
   API del portal · Netlify Functions v2 + Blobs
   GET/POST /api?action=...      (config.path = '/api')

   action=auth     POST {code, profile}      → {ok, token}
   action=presence POST {thinking?} + headers → estado compartido

   Seguridad:
   - ACCESS_CODE vive SOLO en env vars de Netlify (nunca en el repo).
   - token = HMAC-SHA256(ACCESS_CODE, "portal:" + profile) → el código
     jamás viaja tras el login y el token no lo revela.
   - timingSafeEqual en cada comparación.
   - Throttle por IP en Blobs: 10 fallos / 15 min → 429.
   ═══════════════════════════════════════════════════════════ */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const config = { path: '/api' };

const PROFILES = ['daniel', 'kitzya'];
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 10;
const THINK_STALE_MS = 5 * 60 * 1000;

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

    const profile = request.headers.get('x-portal-profile') || '';
    const token = request.headers.get('x-portal-token') || '';
    if (!PROFILES.includes(profile) || !safeEqual(token, tokenFor(code, profile))) {
      return json({ error: 'no-autorizado' }, 401);
    }

    const body = await readJson(request);
    const now = Date.now();
    const otherId = profile === 'daniel' ? 'kitzya' : 'daniel';

    /* Escritura por clave propia: cada quien solo toca la suya → aunque la
       réplica tarde (consistencia eventual), jamás se pisan los datos del otro. */
    await store.set('presence-' + profile + '.json', JSON.stringify({ lastSeen: now }));
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
    return json(state);
  }

  return json({ error: 'accion-desconocida' }, 404);
};
