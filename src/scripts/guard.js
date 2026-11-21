// Bot check for the site's forms: Cloudflare Turnstile in the browser, checked
// for real by the forms gateway Worker (cloudflare/forms-gateway), which then
// forwards to the same Google Forms the pages used to post to directly.
//
// Feature flag, decided at build time like supa.js: on only when BOTH
// PUBLIC_TURNSTILE_SITEKEY and PUBLIC_FORMS_ENDPOINT are set. Off, nothing
// here runs and every form posts to Google through its hidden iframe as before.
//
// The Turnstile script loads only on demand (a form near the viewport, first
// focus in a form, or the petition modal opening). One widget lives on the
// page at a time, in the slot of the form being used (GuardSlot.astro).
// Tokens are single use and expire after five minutes, so every send resets
// the widget and an expired token is never sent.
const SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY || '';
const ENDPOINT = import.meta.env.PUBLIC_FORMS_ENDPOINT || '';
export const enabled = Boolean(SITEKEY && ENDPOINT);

const API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SUBMIT_URL = ENDPOINT.replace(/\/+$/, '').replace(/\/submit$/, '') + '/submit';
const TOKEN_WAIT_MS = 120000; // an interactive check can take a person a while
const SEND_WAIT_MS = 20000;

let apiPromise = null;
let active = null; // { form, el, id, lang, token, waiters, busy }

function lang() {
  try {
    if (localStorage.getItem('bsl-lang') === 'es') return 'es';
  } catch {}
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

function loadApi() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = API;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => {
      apiPromise = null; // allow a retry on the next attempt
      s.remove();
      reject(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const slot = (form) => form.querySelector('[data-guard-slot]');

function settle(w, ok, value) {
  const list = w.waiters.splice(0);
  list.forEach((p) => (ok ? p.resolve(value) : p.reject(value)));
}

function unmount() {
  const w = active;
  if (!w) return;
  active = null;
  try {
    window.turnstile?.remove(w.id);
  } catch {}
  if (w.el) w.el.style.minHeight = '';
  settle(w, false, 'gone');
}

async function mount(form) {
  if (active && active.form === form) return active;
  const ts = await loadApi();
  if (active && active.form === form) return active;
  const el = slot(form)?.querySelector('[data-guard-widget]');
  if (!el) throw new Error('slot');
  unmount();
  const w = { form, el, id: null, lang: lang(), token: '', waiters: [], busy: false };
  active = w;
  // Always visible: people see the check before they press submit. The box
  // fills the slot (capped by the slot's own max-width); a slot narrower than
  // Turnstile's 300px minimum gets the compact box instead.
  const narrow = el.clientWidth > 0 && el.clientWidth < 300;
  el.style.minHeight = narrow ? '140px' : '65px'; // hold the room while it loads
  w.id = ts.render(el, {
    sitekey: SITEKEY,
    action: form.dataset.guard || 'form',
    appearance: 'always',
    size: narrow ? 'compact' : 'flexible',
    theme: slot(form)?.dataset.guardTone === 'dark' ? 'dark' : 'light',
    language: w.lang,
    'response-field': false, // the token goes in the JSON body, not the form
    'refresh-expired': 'auto',
    callback: (token) => {
      w.token = token;
      settle(w, true, token);
    },
    'expired-callback': () => {
      w.token = '';
    },
    'timeout-callback': () => {
      w.token = '';
    },
    'error-callback': () => {
      w.token = '';
      settle(w, false, 'captcha');
      return true; // handled: show our own message, Turnstile may still retry
    },
    'unsupported-callback': () => {
      w.token = '';
      settle(w, false, 'captcha');
    },
  });
  return w;
}

function fresh(w) {
  if (!w.token) return '';
  try {
    if (window.turnstile.isExpired(w.id)) return '';
  } catch {
    return '';
  }
  return w.token;
}

async function getToken(form) {
  const w = await mount(form);
  const now = fresh(w);
  if (now) return { w, token: now };
  const token = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      w.waiters = w.waiters.filter((p) => p !== entry);
      reject('timeout');
    }, TOKEN_WAIT_MS);
    const entry = {
      resolve: (t) => (clearTimeout(timer), resolve(t)),
      reject: (r) => (clearTimeout(timer), reject(r)),
    };
    w.waiters.push(entry);
  });
  return { w, token };
}

// A token is spent once it has been sent: clear it and ask for a new one.
function spend(w) {
  w.token = '';
  if (active !== w) return;
  try {
    window.turnstile.reset(w.id);
  } catch {}
}

// Messages: GuardSlot ships each one as a hidden data-i18n span, so the
// language toggle translates them in place; we copy the current text out.
function msgText(form, key) {
  return slot(form)?.querySelector(`[data-guard-msg="${key}"]`)?.textContent.trim() || '';
}

function show(form, kind, key) {
  const el = slot(form)?.querySelector(kind === 'error' ? '[data-guard-error]' : '[data-guard-status]');
  if (!el) return;
  el.dataset.guardKey = key || '';
  el.textContent = key ? msgText(form, key) : '';
}

function clearMessages(form) {
  show(form, 'status', '');
  show(form, 'error', '');
}

function buttons(form) {
  return [...form.querySelectorAll('button[type="submit"], button:not([type]), input[type="submit"]')];
}

// When a form comes near the viewport, load the Turnstile script and show the
// widget in it, unless another form on the page already has it; focusing a
// form always brings the widget to that form. observe:false for forms that
// are always "in view" but invisible (the petition modal): call prime().
export function watch(form, { observe = true } = {}) {
  if (!enabled || !form) return;
  form.addEventListener('focusin', () => prime(form));
  if (observe && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          if (active) loadApi().catch(() => {});
          else prime(form);
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(form);
  }
}

// Render the widget for this form now (it then runs its check in the
// background, so a token is usually ready by the time they press submit).
export function prime(form) {
  if (!enabled || !form) return;
  if (active && active.busy && active.form !== form) return;
  mount(form).catch(() => {});
}

// Send a form through the Worker. `fields` defaults to the form's own
// FormData pairs (exactly what the hidden-iframe post would have carried).
// Resolves { ok: true } or { ok: false, reason }; on failure the visitor
// already sees a message, the buttons are back on and the widget is reset.
export async function send(form, name, { honeypot = false, fields } = {}) {
  if (!enabled) return { ok: false, reason: 'off' };
  if (form.dataset.guardBusy === '1') return { ok: false, reason: 'busy' };
  form.dataset.guardBusy = '1';
  const btns = buttons(form);
  const wasDisabled = btns.map((b) => b.disabled);
  btns.forEach((b) => (b.disabled = true));
  show(form, 'error', '');

  const pairs =
    fields ||
    [...new FormData(form)].filter(([k, v]) => typeof v === 'string' && k !== 'cf-turnstile-response');

  let w = null;
  let result;
  try {
    show(form, 'status', 'checking');
    let token;
    try {
      ({ w, token } = await getToken(form));
    } catch {
      result = { ok: false, reason: 'captcha' };
    }
    if (!result) {
      w.busy = true;
      show(form, 'status', 'sending');
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl && setTimeout(() => ctrl.abort(), SEND_WAIT_MS);
      try {
        const res = await fetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form: name, token, fields: pairs, hp: Boolean(honeypot) }),
          signal: ctrl?.signal,
        });
        const data = await res.json().catch(() => ({}));
        result = res.ok && data.ok === true ? { ok: true } : { ok: false, reason: data.reason || 'upstream' };
      } catch {
        result = { ok: false, reason: 'network' };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  } finally {
    if (w) {
      w.busy = false;
      spend(w);
    }
    btns.forEach((b, i) => (b.disabled = wasDisabled[i]));
    delete form.dataset.guardBusy;
  }

  if (result.ok) {
    clearMessages(form);
  } else {
    show(form, 'status', '');
    show(form, 'error', result.reason === 'captcha' ? 'captcha_failed' : 'failed');
  }
  return result;
}

if (enabled && typeof document !== 'undefined') {
  document.addEventListener('bsl:langchange', () => {
    // Re-copy any message on screen in the new language.
    document.querySelectorAll('[data-guard-slot]').forEach((s) => {
      s.querySelectorAll('[data-guard-key]').forEach((el) => {
        const key = el.dataset.guardKey;
        if (key) el.textContent = s.querySelector(`[data-guard-msg="${key}"]`)?.textContent.trim() || '';
      });
    });
    // Re-render the widget in the new language unless a send is under way.
    const w = active;
    if (w && !w.busy && w.lang !== lang()) {
      const form = w.form;
      unmount();
      mount(form).catch(() => {});
    }
  });
}
