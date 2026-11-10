// Small countdown chip for a dated event (Countdown.astro). The start instant
// comes from the events.json entry (data-countdown-start), so the math is right
// in every viewer's time zone; calendar days are counted in Chicago.
//   2+ Chicago days away   "In 3 days"            / "En 3 días"
//   the day before         "Tomorrow"             / "Mañana"
//   event day, over 1 hour "Starts in 5 h 12 min" / "Empieza en 5 h 12 min"
//   1 hour or less         "Starts in 12 min"     / "Empieza en 12 min"
//   at or after the start  nothing (the chip hides; no claim about it running)
// Templates: countdown.* in src/i18n/en.json and es.json. The chip carries no
// data-i18n (i18n.js would overwrite it); it re-renders on bsl:langchange.
import en from '../i18n/en.json';
import es from '../i18n/es.json';

const DICTS = { en: en.countdown, es: es.countdown };
const TZ = 'America/Chicago';

let dateFmt = null;
function chicagoDate(ms) {
  if (!dateFmt) {
    dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateFmt.format(new Date(ms));
}

// Whole calendar days between two YYYY-MM-DD dates.
function dayGap(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// The phrase for `nowMs`, or '' once the start time is reached.
// Also returns the stage, used for styling and for the update interval.
export function countdown(startISO, nowMs, lang = 'en') {
  const dict = DICTS[lang] || DICTS.en;
  const startMs = new Date(startISO).getTime();
  const left = startMs - nowMs;
  if (!(left > 0)) return { text: '', stage: 'over' };
  const days = dayGap(chicagoDate(nowMs), chicagoDate(startMs));
  if (days >= 2) return { text: dict.days.replace('{n}', String(days)), stage: 'days' };
  if (days === 1) return { text: dict.tomorrow, stage: 'tomorrow' };
  const total = Math.ceil(left / 60000); // whole minutes, rounded up: never "0 min"
  if (total > 60) {
    return { text: dict.hours.replace('{h}', String(Math.floor(total / 60))).replace('{m}', String(total % 60)), stage: 'today' };
  }
  return { text: dict.minutes.replace('{m}', String(total)), stage: 'final' };
}

function currentLang() {
  try {
    return localStorage.getItem('bsl-lang') === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

// Numbers get their own spans so only the digits that change flip.
function paint(el, text, animate) {
  const out = el.querySelector('[data-countdown-text]');
  if (!out) return;
  const parts = text.split(/(\d+)/).filter((p) => p !== '');
  const old = Array.from(out.childNodes).map((n) => n.textContent);
  const sameShape = old.length === parts.length && parts.every((p, i) => /^\d+$/.test(p) === /^\d+$/.test(old[i] || ''));
  if (sameShape) {
    parts.forEach((p, i) => {
      const node = out.childNodes[i];
      if (node.textContent === p) return;
      node.textContent = p;
      if (animate && node.nodeType === 1) {
        node.classList.remove('cd-flip');
        void node.offsetWidth; // restart the flip
        node.classList.add('cd-flip');
      }
    });
    return;
  }
  out.textContent = '';
  parts.forEach((p) => {
    if (/^\d+$/.test(p)) {
      const s = document.createElement('span');
      s.className = 'cd-num';
      s.textContent = p;
      out.appendChild(s);
    } else {
      out.appendChild(document.createTextNode(p));
    }
  });
  if (animate) {
    out.classList.remove('cd-swap');
    void out.offsetWidth;
    out.classList.add('cd-swap');
  }
}

function mountOne(el) {
  const start = el.getAttribute('data-countdown-start');
  if (!start || Number.isNaN(new Date(start).getTime())) return;
  let timer = 0;
  let first = true;

  const render = () => {
    clearTimeout(timer);
    const now = Date.now();
    const { text, stage } = countdown(start, now, currentLang());
    el.setAttribute('data-stage', stage);
    if (!text) {
      // Hidden but still holding its space: no layout shift.
      el.classList.add('is-over');
      el.setAttribute('aria-hidden', 'true');
      return;
    }
    paint(el, text, !first);
    first = false;
    // Event day: on the next minute. Before: hourly, or sooner at the Chicago
    // midnight that changes the wording, or at the start.
    const startMs = new Date(start).getTime();
    let wait;
    if (stage === 'today' || stage === 'final') {
      const left = startMs - now;
      wait = left % 60000 || 60000;
    } else {
      wait = 3600000;
      const step = 60000;
      // Find the next instant (within the hour) where the Chicago date changes.
      const today = chicagoDate(now);
      for (let t = now + step; t < now + wait; t += step) {
        if (chicagoDate(t) !== today) {
          wait = t - now;
          break;
        }
      }
    }
    timer = window.setTimeout(render, Math.max(1000, wait + 250));
  };

  render();
  document.addEventListener('bsl:langchange', () => {
    first = true; // a language swap is not a tick: no flip
    render();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
}

export function mountCountdowns(root = document) {
  try {
    root.querySelectorAll('[data-countdown-start]').forEach(mountOne);
  } catch {
    // Fail silent: the server-rendered text stays.
  }
}
