// Loads src/data/news.json, checks every post at build time, and formats
// dates in both languages. A bad post fails the build on purpose, so a
// broken sweep never reaches the live site. Schema: src/data/NEWS-README.md.
import raw from './news.json';

export const KINDS = ['event', 'news', 'press', 'action'];

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};
const SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Plain strings or {en, es} pairs both work for labels and locations.
export function pick(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || '';
}

function validate(posts) {
  const errors = [];
  const seen = new Set();
  const bilingual = (v) => v && typeof v.en === 'string' && v.en.trim() && typeof v.es === 'string' && v.es.trim();
  const labelOk = (v) => (typeof v === 'string' && v.trim()) || bilingual(v);
  if (!Array.isArray(posts)) throw new Error('news.json must be an array of posts');
  posts.forEach((p, i) => {
    const at = `news.json post #${i + 1} (${p && p.slug})`;
    if (!p || typeof p !== 'object') return errors.push(`${at}: not an object`);
    if (!SLUG_RE.test(p.slug || '')) errors.push(`${at}: slug must be lowercase words joined by hyphens`);
    if (seen.has(p.slug)) errors.push(`${at}: duplicate slug`);
    seen.add(p.slug);
    if (!DATE_RE.test(p.date || '')) errors.push(`${at}: date must be YYYY-MM-DD`);
    if (!KINDS.includes(p.kind)) errors.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
    if (!bilingual(p.title)) errors.push(`${at}: title needs en and es`);
    if (!bilingual(p.summary)) errors.push(`${at}: summary needs en and es`);
    const b = p.body || {};
    ['en', 'es'].forEach((l) => {
      if (!Array.isArray(b[l]) || !b[l].length || b[l].some((s) => typeof s !== 'string' || !s.trim())) {
        errors.push(`${at}: body.${l} must be a list of paragraphs`);
      }
    });
    if (!p.source || !labelOk(p.source.label) || !p.source.href) errors.push(`${at}: every post needs source {label, href}`);
    if (p.expires && !DATE_RE.test(p.expires)) errors.push(`${at}: expires must be YYYY-MM-DD`);
    if (p.event) {
      const ok = (s) => DATE_RE.test(s || '') || DATETIME_RE.test(s || '');
      if (!ok(p.event.start)) errors.push(`${at}: event.start must be YYYY-MM-DD or an ISO datetime with offset`);
      if (p.event.end && !ok(p.event.end)) errors.push(`${at}: event.end must be YYYY-MM-DD or an ISO datetime with offset`);
      if (!labelOk(p.event.location)) errors.push(`${at}: event.location is required`);
    }
    (p.links || []).forEach((l, j) => {
      if (!l || !bilingual(l.label) || !l.href) errors.push(`${at}: links[${j}] needs label {en, es} and href`);
    });
    if (JSON.stringify(p).includes('\u2014')) errors.push(`${at}: contains an emdash; use a comma, colon or new sentence`);
  });
  if (errors.length) throw new Error('news.json failed checks:\n  ' + errors.join('\n  '));
}

validate(raw);

// Newest first; posts with the same date keep their order in the file.
export const posts = raw
  .map((p, i) => ({ p, i }))
  .sort((a, b) => (a.p.date === b.p.date ? a.i - b.i : a.p.date < b.p.date ? 1 : -1))
  .map(({ p }) => p);

export function getPost(slug) {
  return posts.find((p) => p.slug === slug);
}

// Internal links ("/volunteer") get the site base; external ones open a new tab.
export function linkAttrs(href, base = '') {
  if (/^https?:\/\//.test(href)) return { href, target: '_blank', rel: 'noopener noreferrer' };
  return { href: href.startsWith('/') ? `${base}${href}` : href };
}

const parts = (iso) => iso.split('-').map(Number);

// "Oct 19, 2026" / "19 de oct, 2026" (matches the NextUp ledger)
export function stampDate(iso, lang) {
  const [y, m, d] = parts(iso);
  return lang === 'es' ? `${d} de ${SHORT.es[m - 1]}, ${y}` : `${SHORT.en[m - 1]} ${d}, ${y}`;
}

// "October 19, 2026" / "19 de octubre de 2026"
export function longDate(iso, lang) {
  const [y, m, d] = parts(iso);
  return lang === 'es' ? `${d} de ${MONTHS.es[m - 1]} de ${y}` : `${MONTHS.en[m - 1]} ${d}, ${y}`;
}

// Wall-clock date and time in Chicago for an ISO datetime.
function chicago(isoDateTime) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const o = Object.fromEntries(f.formatToParts(new Date(isoDateTime)).map((x) => [x.type, x.value]));
  const time = o.minute === '00' ? `${o.hour} ${o.dayPeriod}` : `${o.hour}:${o.minute} ${o.dayPeriod}`;
  return { date: `${o.year}-${o.month}-${o.day}`, time };
}

function split(value) {
  if (DATE_RE.test(value)) return { date: value, time: null };
  return chicago(value);
}

// One line for when an event happens, in either language.
export function eventWhen(event, lang) {
  const s = split(event.start);
  const e = event.end ? split(event.end) : null;
  const es = lang === 'es';
  if (!e || e.date === s.date) {
    let line = longDate(s.date, lang);
    if (s.time) line += ` • ${s.time}`;
    if (s.time && e && e.time) line += es ? ` a ${e.time}` : ` to ${e.time}`;
    return line;
  }
  const [sy, sm, sd] = parts(s.date);
  const [ey, em, ed] = parts(e.date);
  let line;
  if (es) {
    if (sy === ey && sm === em) line = `Del ${sd} al ${ed} de ${MONTHS.es[sm - 1]} de ${sy}`;
    else if (sy === ey) line = `Del ${sd} de ${MONTHS.es[sm - 1]} al ${ed} de ${MONTHS.es[em - 1]} de ${sy}`;
    else line = `Del ${longDate(s.date, 'es')} al ${longDate(e.date, 'es')}`;
  } else {
    if (sy === ey && sm === em) line = `${MONTHS.en[sm - 1]} ${sd} to ${ed}, ${sy}`;
    else if (sy === ey) line = `${MONTHS.en[sm - 1]} ${sd} to ${MONTHS.en[em - 1]} ${ed}, ${sy}`;
    else line = `${longDate(s.date, 'en')} to ${longDate(e.date, 'en')}`;
  }
  if (s.time) line += ` • ${s.time}`;
  return line;
}

// The Chicago date after which an event is past (end date, else start date).
export function eventLastDay(event) {
  return split(event.end || event.start).date;
}

// Build-time view of what the home strip should carry. The strip also
// re-checks expiry in the browser, since the site is only rebuilt on deploy.
export function todayChicago() {
  return chicago(new Date().toISOString()).date;
}

// Kind chips are data, not UI copy, so they ride with the posts.
export const KIND_LABELS = {
  event: { en: 'Event', es: 'Evento' },
  news: { en: 'News', es: 'Noticias' },
  press: { en: 'Press', es: 'Prensa' },
  action: { en: 'Take Action', es: 'Actúa' },
};
