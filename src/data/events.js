// Loads src/data/events.json, checks every entry at build time, and formats
// dates, times and calendar files in both languages. A bad entry fails the
// build on purpose. Schema and rules: src/data/EVENTS-README.md.
import raw from './events.json';

export const KINDS = ['canvass', 'wardnight', 'meetup', 'deadline', 'election'];
// Kinds a neighbor shows up to (cards); the rest are dates on the ledger.
export const SHOWUP_KINDS = ['canvass', 'wardnight', 'meetup'];

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};
const SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};
const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RULE_RE = /^weekly:(SU|MO|TU|WE|TH|FR|SA)$/;

// Plain strings or {en, es} pairs both work for names and places.
export function pick(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || '';
}

function validate(list) {
  const errors = [];
  const seen = new Set();
  const bilingual = (v) => v && typeof v.en === 'string' && v.en.trim() && typeof v.es === 'string' && v.es.trim();
  const labelOk = (v) => (typeof v === 'string' && v.trim()) || bilingual(v);
  const url = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
  if (!Array.isArray(list)) throw new Error('events.json must be an array');
  list.forEach((e, i) => {
    const at = `events.json entry #${i + 1} (${e && e.id})`;
    if (!e || typeof e !== 'object') return errors.push(`${at}: not an object`);
    if (!ID_RE.test(e.id || '')) errors.push(`${at}: id must be lowercase words joined by hyphens`);
    if (seen.has(e.id)) errors.push(`${at}: duplicate id`);
    if (e.id === 'all' || e.id === 'all-es') errors.push(`${at}: "all" is reserved for the /events/all.ics feed`);
    seen.add(e.id);
    if (!KINDS.includes(e.kind)) errors.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
    if (!bilingual(e.title)) errors.push(`${at}: title needs en and es`);
    if (!bilingual(e.line)) errors.push(`${at}: line needs en and es`);
    if (!bilingual(e.action)) errors.push(`${at}: action needs en and es`);
    if (!labelOk(e.location)) errors.push(`${at}: location is required`);
    if (!url(e.source)) errors.push(`${at}: every entry needs a source URL`);
    if (e.recurring) {
      if (!RULE_RE.test(e.rule || '')) errors.push(`${at}: rule must look like weekly:TU`);
      if (!bilingual(e.when)) errors.push(`${at}: when needs en and es`);
      if (!url(e.link)) errors.push(`${at}: recurring entries need a link`);
    } else {
      const ok = (s) => DATE_RE.test(s || '') || DATETIME_RE.test(s || '');
      if (!ok(e.start)) errors.push(`${at}: start must be YYYY-MM-DD or an ISO datetime with offset`);
      if (e.end && !ok(e.end)) errors.push(`${at}: end must be YYYY-MM-DD or an ISO datetime with offset`);
      if (!DATE_RE.test(e.expires || '')) errors.push(`${at}: expires must be YYYY-MM-DD`);
      if (e.rsvp !== null && !url(e.rsvp)) errors.push(`${at}: rsvp must be a URL or null`);
    }
    if (JSON.stringify(e).includes('\u2014')) errors.push(`${at}: contains an emdash; use a comma, colon or new sentence`);
  });
  if (errors.length) throw new Error('events.json failed checks:\n  ' + errors.join('\n  '));
}

validate(raw);

const parts = (iso) => iso.split('-').map(Number);

// Wall-clock date and time in Chicago for an ISO datetime.
function chicago(isoDateTime) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const o = Object.fromEntries(f.formatToParts(new Date(isoDateTime)).map((x) => [x.type, x.value]));
  const time = o.minute === '00' ? `${o.hour} ${o.dayPeriod}` : `${o.hour}:${o.minute} ${o.dayPeriod}`;
  return { date: `${o.year}-${o.month}-${o.day}`, time, period: o.dayPeriod };
}

function split(value) {
  if (DATE_RE.test(value)) return { date: value, time: null };
  return chicago(value);
}

export function todayChicago() {
  return chicago(new Date().toISOString()).date;
}

// Adds days to a YYYY-MM-DD date (calendar arithmetic, no time zone drift).
export function addDays(iso, n) {
  const [y, m, d] = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function weekdayIndex(iso) {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const sortKey = (e) => new Date(DATE_RE.test(e.start) ? `${e.start}T00:00:00-06:00` : e.start).getTime();

export const all = raw;
export const dated = raw.filter((e) => !e.recurring).sort((a, b) => sortKey(a) - sortKey(b));
export const recurring = raw.filter((e) => e.recurring);
export const showUps = dated.filter((e) => SHOWUP_KINDS.includes(e.kind));
export const deadlines = dated.filter((e) => !SHOWUP_KINDS.includes(e.kind));

// Show-up events whose day has not passed yet (Chicago time, at build).
export function upcoming(today = todayChicago()) {
  return showUps.filter((e) => e.expires >= today);
}

export function startDate(e) {
  return split(e.start).date;
}

// Date stamp pieces: { weekday: "Sun", day: "Oct 11" } / { weekday: "dom", day: "11 oct" }
export function stamp(e, lang) {
  const iso = startDate(e);
  const [, m, d] = parts(iso);
  const w = WEEKDAYS[lang][weekdayIndex(iso)];
  return {
    weekday: lang === 'es' ? w.slice(0, 3) : w.slice(0, 3),
    weekdayLong: w,
    day: lang === 'es' ? `${d} ${SHORT.es[m - 1]}` : `${SHORT.en[m - 1]} ${d}`,
  };
}

// "11 AM to 2 PM" / "11 AM a 2 PM"; "5:30 to 7:30 PM" when both are PM.
export function timeRange(e, lang) {
  const s = split(e.start);
  if (!s.time) return '';
  const end = e.end ? split(e.end) : null;
  if (!end || !end.time) return s.time;
  const joiner = lang === 'es' ? ' a ' : ' to ';
  const sTime = s.period === end.period ? s.time.replace(/ (AM|PM)$/, '') : s.time;
  return `${sTime}${joiner}${end.time}`;
}

// Ledger date: "Oct 19 to 26, 2026" / "19 al 26 de oct, 2026"
export function ledgerDate(e, lang) {
  const s = split(e.start).date;
  const en = e.end ? split(e.end).date : s;
  const [sy, sm, sd] = parts(s);
  const [ey, em, ed] = parts(en);
  const es = lang === 'es';
  if (s === en) return es ? `${sd} de ${SHORT.es[sm - 1]}, ${sy}` : `${SHORT.en[sm - 1]} ${sd}, ${sy}`;
  if (sy === ey && sm === em) return es ? `${sd} al ${ed} de ${SHORT.es[sm - 1]}, ${sy}` : `${SHORT.en[sm - 1]} ${sd} to ${ed}, ${sy}`;
  if (sy === ey) return es ? `${sd} de ${SHORT.es[sm - 1]} al ${ed} de ${SHORT.es[em - 1]}, ${sy}` : `${SHORT.en[sm - 1]} ${sd} to ${SHORT.en[em - 1]} ${ed}, ${sy}`;
  return es ? `${sd} de ${SHORT.es[sm - 1]}, ${sy} al ${ed} de ${SHORT.es[em - 1]}, ${ey}` : `${SHORT.en[sm - 1]} ${sd}, ${sy} to ${SHORT.en[em - 1]} ${ed}, ${ey}`;
}

// Where the button goes: the RSVP page, or the sign-up form when there is none.
export function actionHref(e, signupHref) {
  return e.rsvp || signupHref;
}

// Google Maps search for an address (no tracking params).
export function mapHref(e) {
  if (!e.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}`;
}

// ---------- Calendar files (.ics, RFC 5545) ----------

const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Lines longer than 75 octets fold onto continuation lines.
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8');
    if (len + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const utcStamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// The VEVENT lines for one dated entry (shared by the single files and the feed).
function vevent(e, lang, site, stampNow) {
  const title = pick(e.title, lang);
  const loc = [pick(e.location, lang), e.address].filter(Boolean).join(', ');
  const page = `${site}/volunteer/#show-up`;
  const desc = [pick(e.line, lang), e.rsvp ? `RSVP: ${e.rsvp}` : null, page].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}${lang === 'es' ? '-es' : ''}@byronfor25.com`,
    `DTSTAMP:${stampNow}`,
  ];
  if (DATE_RE.test(e.start)) {
    const endIncl = e.end && DATE_RE.test(e.end) ? e.end : e.start;
    lines.push(`DTSTART;VALUE=DATE:${e.start.replace(/-/g, '')}`);
    lines.push(`DTEND;VALUE=DATE:${addDays(endIncl, 1).replace(/-/g, '')}`);
  } else {
    lines.push(`DTSTART:${utcStamp(e.start)}`);
    if (e.end) lines.push(`DTEND:${utcStamp(e.end)}`);
  }
  lines.push(`SUMMARY:${icsEscape(title)}`);
  if (loc) lines.push(`LOCATION:${icsEscape(loc)}`);
  lines.push(`DESCRIPTION:${icsEscape(desc)}`);
  lines.push(`URL:${e.rsvp || page}`);
  lines.push('END:VEVENT');
  return lines;
}

const calHead = (name) => [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Friends of Byron Sigcho Lopez//byronfor25.com//EN',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  ...(name ? [`X-WR-CALNAME:${icsEscape(name)}`, 'X-WR-TIMEZONE:America/Chicago', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D'] : []),
];

export function ics(e, lang, site = 'https://byronfor25.com') {
  const lines = [...calHead(null), ...vevent(e, lang, site, utcStamp(new Date().toISOString())), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// The whole calendar in one file (/events/all.ics, /events/all-es.ics): every
// dated entry, plus each weekly standing shift as an all-day event repeating
// for the next 20 weeks from the build date.
export function icsFeed(lang, site = 'https://byronfor25.com', today = todayChicago()) {
  const now = utcStamp(new Date().toISOString());
  const name = lang === 'es' ? 'Byron Sigcho-Lopez, Distrito 25: fechas' : 'Byron Sigcho-Lopez, 25th Ward: dates';
  const lines = [...calHead(name)];
  dated.forEach((e) => lines.push(...vevent(e, lang, site, now)));
  recurring.forEach((e) => {
    const day = RRULE_DAYS.indexOf(e.rule.split(':')[1]);
    const first = addDays(today, (day - weekdayIndex(today) + 7) % 7);
    const loc = [pick(e.location, lang), e.address].filter(Boolean).join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}${lang === 'es' ? '-es' : ''}@byronfor25.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${first.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${addDays(first, 1).replace(/-/g, '')}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAYS[day]};COUNT=20`,
      `SUMMARY:${icsEscape(pick(e.title, lang))}`,
      ...(loc ? [`LOCATION:${icsEscape(loc)}`] : []),
      `DESCRIPTION:${icsEscape([pick(e.when, lang), pick(e.line, lang), e.link].join('\n'))}`,
      `URL:${e.link}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const icsPath = (e, lang) => `/events/${e.id}${lang === 'es' ? '-es' : ''}.ics`;
export const feedPath = (lang) => `/events/all${lang === 'es' ? '-es' : ''}.ics`;
