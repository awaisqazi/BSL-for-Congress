// Springfield Lobby Day (Wed Dec 2, 2026): the facts every lobbyday surface reads.
// Date, departure time, address, RSVP URL and expiry come from the events.json
// entry; the copy in the lobbyday namespace of src/i18n bakes some of them into
// sentences, so the guard below fails the build if the two ever disagree.
// Brief: events/springfield-lobby-day-2026-12-02/BRIEF.md
import { all, todayChicago } from '../../data/events.js';
import en from '../../i18n/en.json';
import es from '../../i18n/es.json';

export const EVENT_ID = 'meetup-2026-12-02-springfield-lobby-day';
export const ev = all.find((e) => e.id === EVENT_ID) || null;
export const live = Boolean(ev && ev.rsvp && ev.expires && ev.expires >= todayChicago());

// The Google Form behind the rsvp link takes posts at /formResponse.
export const formAction = ev && ev.rsvp ? ev.rsvp.replace(/\/viewform(\?.*)?$/, '/formResponse') : null;

const fmt = (lang, opts) => new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'America/Chicago', ...opts });

// "6:00 AM" in Chicago, from the entry's start.
export function departTime(e = ev) {
  const p = Object.fromEntries(fmt('en', { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(e.start)).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute} ${p.dayPeriod.toUpperCase()}`;
}

// "Wednesday, December 2" / "miércoles, 2 de diciembre"
function longDate(e, lang) {
  return lang === 'es'
    ? fmt('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(e.start))
    : fmt('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(e.start));
}

// "Wed, Dec 2" / "mié, 2 dic"
function shortDate(e, lang) {
  const p = Object.fromEntries(fmt(lang, { weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(new Date(e.start)).map((x) => [x.type, x.value]));
  const wd = p.weekday.replace('.', '');
  const mo = p.month.replace('.', '');
  return lang === 'es' ? `${wd}, ${p.day} ${mo}` : `${wd}, ${mo} ${p.day}`;
}

// Guard: run while the event is live. A moved date, time or address fails the
// build instead of showing the wrong day on a page people share.
export function guard() {
  if (!live) return;
  const low = (s) => s.toLowerCase();
  const time = departTime();
  const street = ev.address.replace(/, Chicago$/, '');
  const problems = [];
  for (const [lang, raw] of [['en', en.lobbyday], ['es', es.lobbyday]]) {
    // Some strings keep "6:00 AM" together with a no-break space.
    const t = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v).replace(/\u00a0/g, ' ')]));
    const long = longDate(ev, lang);
    if (low(t.date_long) !== low(long)) problems.push(`${lang} date_long "${t.date_long}" vs "${long}"`);
    if (low(t.bar_date) !== low(shortDate(ev, lang))) problems.push(`${lang} bar_date "${t.bar_date}" vs "${shortDate(ev, lang)}"`);
    for (const k of ['depart', 'stop1_when', 'final_body', 'ok_body']) {
      if (!t[k].includes(time)) problems.push(`${lang} ${k} lacks ${time}`);
    }
    for (const k of ['venue', 'stop1_body', 'final_body', 'ok_body']) {
      if (!t[k].includes(street)) problems.push(`${lang} ${k} lacks ${street}`);
    }
    // final_body and ok_body carry the date in running text.
    const day = long.replace(/^[^,]+, /, '');
    for (const k of ['final_body', 'ok_body']) {
      if (!low(t[k]).includes(low(day))) problems.push(`${lang} ${k} lacks ${day}`);
    }
  }
  if (problems.length) {
    throw new Error(`lobbyday: the i18n copy no longer matches events.json entry ${EVENT_ID}:\n  ${problems.join('\n  ')}`);
  }
}
