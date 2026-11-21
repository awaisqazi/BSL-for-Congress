// sigchofor25-forms: the bot check in front of the site's Google Forms.
//
// The browser sends POST /submit with JSON { form, token, fields, hp }.
//   form   one of the keys in FORMS below
//   token  the Cloudflare Turnstile token from the widget on the page
//   fields [name, value] pairs from new FormData(form); pairs keep repeated
//          checkbox values in order
//   hp     true when the form's hidden honeypot input was filled
// The Worker checks the token with Cloudflare siteverify, keeps only the
// whitelisted entry.* fields, caps their length, and posts them to the same
// Google Form the page used to post to directly. It answers { ok: true } only
// when Google answered 200.
//
// Field values are people's names, phones, emails and addresses. Never log
// them, never echo them back (except in DRY_RUN, which only runs in dev).

const ORIGINS = [
  'https://sigchofor25.com',
  'https://www.sigchofor25.com',
  'https://byronfor25.com',
  'https://www.byronfor25.com',
];
const HOSTNAMES = ORIGINS.map((o) => new URL(o).hostname);
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_BODY = 16 * 1024; // bytes of JSON from the browser
const MAX_PAIRS = 80;
const MAX_TOKEN = 2048; // Turnstile's documented token limit
const MAX_REPEAT = 20; // values kept for one repeatable checkbox field

// Per-form config. URLs, entry names and option values are frozen: they must
// match the Google Forms exactly. `repeat` marks checkbox fields that may
// appear more than once; every other field keeps its first value only.
// `cap` is the maximum length in characters after trimming.
const VOLUNTEER_FORM = {
  url: 'https://docs.google.com/forms/d/e/1FAIpQLSeUKnQVp4auTqHdFZeDrGlAOYAjmOO0sE19Xm11Pee2ayuuWQ/formResponse',
  fields: {
    'entry.661274230': { cap: 80 }, // first name
    'entry.449873967': { cap: 80 }, // last name
    'entry.378191335': { cap: 254 }, // email
    'entry.763325091': { cap: 40 }, // phone
    'entry.113002180': { cap: 80 }, // city
    'entry.1587719447': { cap: 10 }, // ZIP
    'entry.1014527396': { cap: 200, repeat: true }, // how to help
  },
};

const FORMS = {
  // /volunteer sign-up and /genz post to the same Google Form.
  volunteer: VOLUNTEER_FORM,
  genz: VOLUNTEER_FORM,
  petition: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSeYiVz1TB2tsAFdh1OakH62dM7XGCNBnaJz57Mn1beP0dqE6A/formResponse',
    fields: {
      'entry.1710222697': { cap: 120 }, // name
      'entry.1317557731': { cap: 254 }, // email
      'entry.2114998122': { cap: 40 }, // phone
      'entry.1117716304': { cap: 80 }, // city
      'entry.1494610555': { cap: 10 }, // ZIP
      'entry.854369982': { cap: 200, repeat: true }, // I want to
      'entry.10606465': { cap: 200, repeat: true }, // comfortable with
    },
  },
  lobbyday: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSduq6GJUMgqyfdRicBZ2Ovgatj63o-hMDKqTizlw7fW2QZQow/formResponse',
    fields: {
      'entry.992725186': { cap: 120 },
      'entry.155083142': { cap: 40 },
      'entry.485612208': { cap: 254 },
      'entry.1700439271': { cap: 300 },
      'entry.159860446': { cap: 300 },
      'entry.708292807': { cap: 300, repeat: true },
      'entry.1521471241': { cap: 300 },
      'entry.1098109836': { cap: 300 },
      'entry.1696229938': { cap: 1000 },
    },
  },
  // Event-card "I'm coming" form: no Google Form. The Worker only checks the
  // token; the browser then writes its row to the campaign database.
  rsvp: { url: null, fields: {} },
};

const isDev = (env) => env.ALLOW_DEV === '1';

function corsOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (ORIGINS.includes(origin)) return origin;
  if (isDev(env) && DEV_ORIGIN.test(origin)) return origin;
  return null;
}

function json(status, body, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

// Keep only whitelisted names, in the order the browser sent them, trimmed
// and capped. Non-repeatable fields keep their first value.
export function cleanFields(config, pairs) {
  const out = [];
  const seen = new Map();
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [name, value] = pair;
    if (typeof name !== 'string' || typeof value !== 'string') continue;
    const rule = Object.prototype.hasOwnProperty.call(config.fields, name) ? config.fields[name] : null;
    if (!rule) continue;
    const count = seen.get(name) || 0;
    if (count >= (rule.repeat ? MAX_REPEAT : 1)) continue;
    seen.set(name, count + 1);
    out.push([name, value.trim().slice(0, rule.cap)]);
  }
  return out;
}

async function verifyToken(token, ip, env) {
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set('remoteip', ip);
  let res;
  try {
    res = await fetch(SITEVERIFY, { method: 'POST', body });
  } catch {
    return { ok: false, codes: ['network'] };
  }
  if (!res.ok) return { ok: false, codes: [`http-${res.status}`] };
  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, codes: ['bad-json'] };
  }
  if (data.success !== true) return { ok: false, codes: data['error-codes'] || [] };
  // Outside dev the token must come from one of the campaign's own hostnames.
  if (!isDev(env) && !HOSTNAMES.includes(data.hostname)) return { ok: false, codes: ['hostname'] };
  return { ok: true };
}

async function handleSubmit(request, env, origin) {
  if (!env.TURNSTILE_SECRET) {
    console.error('forms-gateway: TURNSTILE_SECRET is not set');
    return json(500, { ok: false, reason: 'config' }, origin);
  }

  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, reason: 'bad_request' }, origin);
  }
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY) return json(413, { ok: false, reason: 'too_large' }, origin);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) {
    return json(413, { ok: false, reason: 'too_large' }, origin);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, reason: 'bad_request' }, origin);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, reason: 'bad_request' }, origin);
  }

  const { form, token, fields = [], hp } = body;
  const config = typeof form === 'string' && Object.prototype.hasOwnProperty.call(FORMS, form) ? FORMS[form] : null;
  if (!config) return json(400, { ok: false, reason: 'unknown_form' }, origin);
  if (!Array.isArray(fields) || fields.length > MAX_PAIRS) {
    return json(400, { ok: false, reason: 'bad_request' }, origin);
  }

  // Honeypot filled: thank the bot, forward nothing.
  if (hp === true || hp === 1 || hp === '1') {
    console.log(JSON.stringify({ form, outcome: 'honeypot' }));
    return json(200, { ok: true }, origin);
  }

  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN) {
    return json(403, { ok: false, reason: 'captcha' }, origin);
  }
  const check = await verifyToken(token, request.headers.get('CF-Connecting-IP'), env);
  if (!check.ok) {
    console.log(JSON.stringify({ form, outcome: 'captcha', codes: check.codes }));
    return json(403, { ok: false, reason: 'captcha' }, origin);
  }

  if (!config.url) return json(200, { ok: true }, origin);

  const clean = cleanFields(config, fields);
  const payload = new URLSearchParams(clean).toString();

  // Dev only: show what would go to Google instead of sending it.
  if (env.DRY_RUN === '1' && isDev(env)) {
    return json(200, { ok: true, dryRun: true, url: config.url, body: payload, fields: clean }, origin);
  }

  let res;
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload,
      redirect: 'manual', // a redirect means Google wants a sign-in, not success
    });
  } catch {
    console.log(JSON.stringify({ form, outcome: 'upstream', status: 'network' }));
    return json(502, { ok: false, reason: 'upstream' }, origin);
  }
  if (res.status !== 200) {
    console.log(JSON.stringify({ form, outcome: 'upstream', status: res.status }));
    return json(502, { ok: false, reason: 'upstream' }, origin);
  }
  return json(200, { ok: true }, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = corsOrigin(request, env);

    if (url.pathname !== '/submit') return json(404, { ok: false, reason: 'not_found' }, origin);
    if (!origin) return json(403, { ok: false, reason: 'origin' }, null);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, reason: 'method' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Allow: 'POST, OPTIONS',
          'Access-Control-Allow-Origin': origin,
          Vary: 'Origin',
        },
      });
    }

    try {
      return await handleSubmit(request, env, origin);
    } catch {
      return json(500, { ok: false, reason: 'error' }, origin);
    }
  },
};
