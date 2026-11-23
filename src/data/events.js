// Loads src/data/events.json, checks every entry at build time, and formats
// dates, times and calendar files in both languages. A bad entry fails the
// build on purpose. Schema and rules: src/data/EVENTS-README.md.
import raw from './events.json';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import { norm } from '../scripts/search-norm.js';

export const KINDS = ['canvass', 'wardnight', 'meetup', 'deadline', 'election'];
// Kinds a neighbor shows up to (cards); the rest are dates on the ledger.
export const SHOWUP_KINDS = ['canvass', 'wardnight', 'meetup'];
// Who hosts a shift, for the /volunteer "Hosted by" filter. Derived by
// hostOf(); an entry may set "host" to one of these to override it.
export const HOSTS = ['campaign', 'ward', 'dsa', 'partner'];
// The "Type" filter: the shift kinds, plus "dates" for deadlines and the election.
export const TYPES = ['canvass', 'wardnight', 'meetup', 'dates'];

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
    if ('host' in e && e.host !== null && !HOSTS.includes(e.host)) errors.push(`${at}: host must be one of ${HOSTS.join(', ')} (or leave it out)`);
    if (e.host && !SHOWUP_KINDS.includes(e.kind)) errors.push(`${at}: host is only for shifts (canvass, wardnight, meetup)`);
    if ('slate' in e && typeof e.slate !== 'boolean') errors.push(`${at}: slate must be true or false`);
    if ('geo' in e && !(e.geo && Math.abs(e.geo.lat - 41.85) < 1 && Math.abs(e.geo.lng + 87.68) < 1)) errors.push(`${at}: geo must be {lat, lng} near Chicago (run node ops/geocode-events.mjs)`);
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

export function ics(e, lang, site = 'https://sigchofor25.com') {
  const lines = [...calHead(null), ...vevent(e, lang, site, utcStamp(new Date().toISOString())), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// The whole calendar in one file (/events/all.ics, /events/all-es.ics): every
// dated entry, plus each weekly standing shift as an all-day event repeating
// for the next 20 weeks from the build date.
export function icsFeed(lang, site = 'https://sigchofor25.com', today = todayChicago()) {
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

// Long date: "Saturday, December 5, 2026" / "sábado 5 de diciembre de 2026"
export function dateLong(e, lang) {
  const iso = startDate(e);
  const [y, m, d] = parts(iso);
  const w = WEEKDAYS[lang][weekdayIndex(iso)];
  return lang === 'es' ? `${w} ${d} de ${MONTHS.es[m - 1]} de ${y}` : `${w}, ${MONTHS.en[m - 1]} ${d}, ${y}`;
}

// The end a Google Calendar link uses: the entry's own end, or start plus 2
// hours for a timed entry without one (assumed true then). Date-only entries
// are all-day. Returns { dates, endAssumed }.
function gcalWindow(e) {
  if (DATE_RE.test(e.start)) {
    const last = e.end && DATE_RE.test(e.end) ? e.end : e.start;
    return { dates: `${e.start.replace(/-/g, '')}/${addDays(last, 1).replace(/-/g, '')}`, endAssumed: false };
  }
  const assumed = !e.end;
  const endMs = assumed ? new Date(e.start).getTime() + 2 * 3600 * 1000 : new Date(e.end).getTime();
  return { dates: `${utcStamp(e.start)}/${utcStamp(new Date(endMs).toISOString())}`, endAssumed: assumed };
}

// "Add to Google Calendar" template link for one dated entry.
export function gcalHref(e, lang, site = 'https://sigchofor25.com') {
  const loc = [pick(e.location, lang), e.address].filter(Boolean).join(', ');
  const details = [pick(e.line, lang), `${site}/volunteer/#cal-${startDate(e)}`].join('\n');
  const q = { action: 'TEMPLATE', text: pick(e.title, lang), dates: gcalWindow(e).dates, details, location: loc, ctz: 'America/Chicago' };
  return 'https://calendar.google.com/calendar/render?' + Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

// The public JSON feed (/events/feed.json), read by the sign-up auto-responder.
// Field names are a contract: add fields, never rename or remove them.
export function jsonFeed(site = 'https://sigchofor25.com') {
  const events = showUps.map((e) => {
    const { endAssumed } = gcalWindow(e);
    const words = (lang) => ({
      title: pick(e.title, lang),
      line: pick(e.line, lang),
      weekday: stamp(e, lang).weekdayLong,
      day: stamp(e, lang).day,
      dateLong: dateLong(e, lang),
      time: timeRange(e, lang),
      place: pick(e.location, lang),
      sponsor: e.sponsor || null,
      action: pick(e.action, lang),
    });
    return {
      id: e.id,
      kind: e.kind,
      host: hostOf(e),
      slate: !!e.slate,
      start: e.start,
      end: e.end || null,
      ...(endAssumed ? { endAssumed: true } : {}),
      date: startDate(e),
      expires: e.expires,
      takesSignups: e.rsvp === null,
      en: words('en'),
      es: words('es'),
      address: e.address || null,
      mapUrl: mapHref(e),
      url: `${site}/volunteer/#cal-${startDate(e)}`,
      rsvpUrl: e.rsvp || null,
      ics: { en: site + icsPath(e, 'en'), es: site + icsPath(e, 'es') },
      gcal: { en: gcalHref(e, 'en', site), es: gcalHref(e, 'es', site) },
    };
  });
  const weekly = recurring.map((e) => ({
    id: e.id,
    kind: e.kind,
    host: hostOf(e),
    rule: e.rule,
    en: { title: pick(e.title, 'en'), line: pick(e.line, 'en'), when: pick(e.when, 'en'), place: pick(e.location, 'en'), action: pick(e.action, 'en') },
    es: { title: pick(e.title, 'es'), line: pick(e.line, 'es'), when: pick(e.when, 'es'), place: pick(e.location, 'es'), action: pick(e.action, 'es') },
    link: e.link,
  }));
  return { generated: new Date().toISOString(), site, tz: 'America/Chicago', events, weekly };
}

// ---------- Filters and search on /volunteer ----------

// Host group of a shift; null for deadlines and the election. Order matters:
// an explicit "host" wins, then Ward Night or the 25th Ward Office as a
// sponsor, then the Socialist Slate or a DSA sponsor, then no sponsor (our
// own canvasses and meetups), then any other named sponsor.
export function hostOf(e) {
  if (!SHOWUP_KINDS.includes(e.kind)) return null;
  if (e.host) return e.host;
  const sp = typeof e.sponsor === 'string' ? e.sponsor : '';
  if (e.kind === 'wardnight' || /25th Ward Office/i.test(sp)) return 'ward';
  if (e.slate || /\bDSA\b/.test(sp)) return 'dsa';
  if (!sp) return 'campaign';
  return 'partner';
}

export const typeOf = (e) => (SHOWUP_KINDS.includes(e.kind) ? e.kind : 'dates');

const I18N = { en: en.events, es: es.events };
const label = (key) => [I18N.en[key], I18N.es[key]];

// Date words in both languages: weekday (long and short), month (long and
// short), day number and year, so "sabado", "dic 5" and "Dec 5" all match.
function dateWords(iso) {
  const [y, m, d] = parts(iso);
  const w = weekdayIndex(iso);
  return [WEEKDAYS.en[w], WEEKDAYS.es[w], WEEKDAYS.en[w].slice(0, 3), WEEKDAYS.es[w].slice(0, 3),
    MONTHS.en[m - 1], MONTHS.es[m - 1], SHORT.en[m - 1], SHORT.es[m - 1], String(d), String(y)];
}

// Weekday words only, for a weekly shift (every Tuesday, every Sunday).
export function weekdayWords(dow) {
  return [WEEKDAYS.en[dow], WEEKDAYS.es[dow], WEEKDAYS.en[dow].slice(0, 3), WEEKDAYS.es[dow].slice(0, 3)];
}

// The folded search text for one entry (both languages, whatever the page
// language): title, line, place, address, sponsor, host and type labels and
// the date words. The browser only folds the query (src/scripts/search-norm.js).
export function searchText(e, extra = []) {
  const host = hostOf(e);
  const type = typeOf(e);
  const days = [];
  if (!e.recurring) {
    const from = split(e.start).date;
    const to = e.end ? split(e.end).date : from;
    days.push(...dateWords(from));
    if (to !== from) days.push(...dateWords(to));
  }
  return norm([
    pick(e.title, 'en'), pick(e.title, 'es'), pick(e.line, 'en'), pick(e.line, 'es'),
    pick(e.location, 'en'), pick(e.location, 'es'), e.address, e.sponsor,
    e.recurring ? [pick(e.when, 'en'), pick(e.when, 'es')] : [],
    host ? label(`cal_host_${host}`) : [], label(`cal_type_${type}`),
    days, extra,
  ].flat(2).filter(Boolean).join(' '));
}

// Search text for a date with no entry (the runoff line).
export const dateSearch = (iso, ...text) => norm([...dateWords(iso), ...text, ...label('cal_type_dates')].join(' '));
