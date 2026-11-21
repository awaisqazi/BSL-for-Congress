// Fire-and-forget writes to the campaign database (Supabase). Plain fetch to
// the REST endpoint: no SDK, no external script. Insert-only by design; the
// database refuses reads. Never throws, never blocks: callers fire these next
// to the frozen Google Form posts and never wait on them.
// Plan and rules: supabase/README.md and supabase/site-integration.md.
//
// PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are inlined at build time
// from GitHub repository variables. If either is missing, `enabled` is false
// and every helper is a no-op, so the site behaves exactly as before.
const BASE = import.meta.env.PUBLIC_SUPABASE_URL || '';
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
export const enabled = Boolean(BASE && KEY);

function lang() {
  try {
    if (localStorage.getItem('bsl-lang') === 'es') return 'es';
  } catch {}
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

const cut = (v, n) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, n) : null;
};

const meta = () => ({
  language: lang(),
  source_page: cut(location.pathname, 300),
  user_agent: cut(navigator.userAgent, 400),
});

// Accepts a FormData or a <form>; reads one field or all values of a field.
const fd = (f) => (f instanceof FormData ? f : new FormData(f));
const one = (f, name, n = 200) => cut(f.get(name), n);
const all = (f, name) => f.getAll(name).map((v) => cut(v, 200)).filter(Boolean);

// Honeypot: a nameless hidden input found by id (so the Google post never
// carries it). Filled = bot; the row is saved but flagged.
const hp = (id) => cut(document.getElementById(id)?.value, 200);

async function insert(table, row) {
  if (!enabled) return { ok: false, skipped: true };
  try {
    const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`; // legacy anon JWT only
    const res = await fetch(`${BASE.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
      keepalive: true, // survives the page navigating or the form resetting
    });
    // 409 = this person already RSVPed to this event: success for the visitor.
    return { ok: res.ok || res.status === 409, status: res.status };
  } catch {
    return { ok: false };
  }
}

// /volunteer sign-up form (frozen Google Form field names).
export function volunteer(form) {
  if (!enabled) return Promise.resolve({ ok: false, skipped: true });
  try {
    const f = fd(form);
    return insert('volunteers', {
      first_name: one(f, 'entry.661274230', 80),
      last_name: one(f, 'entry.449873967', 80),
      email: one(f, 'entry.378191335', 254),
      phone: one(f, 'entry.763325091', 20),
      city: one(f, 'entry.113002180', 80),
      zip: one(f, 'entry.1587719447', 5),
      interests: all(f, 'entry.1014527396'),
      honeypot: hp('vol-hp'),
      ...meta(),
    });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// Petition modal (frozen Google Form field names).
export function petitionRequest(form) {
  if (!enabled) return Promise.resolve({ ok: false, skipped: true });
  try {
    const f = fd(form);
    return insert('petition_requests', {
      name: one(f, 'entry.1710222697', 120),
      email: one(f, 'entry.1317557731', 254),
      phone: one(f, 'entry.2114998122', 20),
      city: one(f, 'entry.1117716304', 80),
      zip: one(f, 'entry.1494610555', 5),
      intents: all(f, 'entry.854369982'),
      help_with: all(f, 'entry.10606465'),
      honeypot: hp('pet-hp'),
      ...meta(),
    });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// "I'm coming" mini-form on an event card. eventId = id in events.json.
export function rsvp(eventId, form) {
  if (!enabled) return Promise.resolve({ ok: false, skipped: true });
  try {
    const f = fd(form);
    const bringing = Math.min(10, Math.max(0, parseInt(f.get('bringing'), 10) || 0));
    return insert('event_rsvps', {
      event_id: cut(eventId, 120),
      name: one(f, 'name', 120),
      email: one(f, 'email', 254),
      phone: one(f, 'phone', 20),
      zip: one(f, 'zip', 5),
      bringing_count: bringing,
      honeypot: cut(f.get('website'), 200),
      ...meta(),
    });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// /lobbyday/ registration (frozen Google Form field names), as a "going" RSVP
// for the Springfield Lobby Day entry in events.json. The caller skips people
// who picked "I can't go". zip only when the address field is exactly five
// digits; phone reduced to digits (and a leading +) so the length check holds.
export function rsvpLobbyDay(form) {
  if (!enabled) return Promise.resolve({ ok: false, skipped: true });
  try {
    const f = fd(form);
    const addr = one(f, 'entry.1700439271', 200) || '';
    const digits = (one(f, 'entry.155083142', 40) || '').replace(/[^0-9+]/g, '');
    return insert('event_rsvps', {
      event_id: 'meetup-2026-12-02-springfield-lobby-day',
      name: one(f, 'entry.992725186', 120),
      email: one(f, 'entry.485612208', 254),
      phone: digits.length >= 7 && digits.length <= 20 ? digits : null,
      zip: /^[0-9]{5}$/.test(addr) ? addr : null,
      bringing_count: 0,
      honeypot: hp('ld-hp'),
      ...meta(),
    });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// /canvass/ team form (frozen Google Form field names, see
// src/components/canvass/form-options.js), as a volunteer who knocks doors:
// "Knock on Doors" is the frozen interest value of the /volunteer form, so the
// admin desk lists them with the door knockers. Names, email and phone only;
// address and availability stay in the Google sheet. Phone reduced to digits
// (and a leading +) so the 7 to 20 length check holds; email only when it
// passes the table's pattern.
export function canvassTeam(form) {
  if (!enabled) return Promise.resolve({ ok: false, skipped: true });
  try {
    const f = fd(form);
    const digits = (one(f, 'entry.722306715', 40) || '').replace(/[^0-9+]/g, '');
    const email = one(f, 'entry.1585328537', 254);
    return insert('volunteers', {
      first_name: one(f, 'entry.2027931053', 80),
      last_name: one(f, 'entry.463614577', 80),
      email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      phone: digits.length >= 7 && digits.length <= 20 ? digits : null,
      interests: ['Knock on Doors'],
      honeypot: hp('cv-hp'),
      ...meta(),
    });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// Generic one-tap action log for future features. Keep PII out of payload.
export function action(name, payload = {}) {
  const { language, source_page } = meta();
  return insert('actions', { action: cut(name, 60), payload, language, source_page });
}
