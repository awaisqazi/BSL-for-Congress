// The compact calendar payload, built once at build time from events.json and
// inlined once per page by Navbar.astro (<script id="bsl-cal-data">). Three
// readers share it through src/scripts/calendar-core.js: the nav popover, the
// mobile drawer, and the /volunteer calendar (MiniCalendar.astro). It carries
// only what a month grid, a one-line "next up" row and the tap-a-day mini
// details need; the full shift details stay in the EventCards on /volunteer.
import { dated, recurring, SHOWUP_KINDS, pick, timeRange, actionHref, startDate } from './events.js';

export const ELECTION_DAY = '2027-02-23';
export const RUNOFF_DAY = '2027-04-06';
const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const both = (fn) => ({ en: fn('en'), es: fn('es') });

export function calendarPayload(base) {
  const signup = `${base}/volunteer/#signup`;
  return {
    until: ELECTION_DAY,
    last: RUNOFF_DAY,
    dated: dated.map((e) => {
      const shift = SHOWUP_KINDS.includes(e.kind);
      const href = shift ? actionHref(e, signup) : null;
      return {
        d: startDate(e),
        to: e.end ? startDate({ start: e.end }) : startDate(e),
        k: e.kind,
        x: e.expires,
        t: e.title,
        ...(shift
          ? {
              time: both((lang) => timeRange(e, lang)),
              act: e.action,
              href,
              ext: /^https?:\/\//.test(href),
              p: both((lang) => [pick(e.location, lang), e.address].filter(Boolean).join(', ')),
            }
          : {}),
      };
    }),
    weekly: recurring.map((e) => ({
      dow: DOW[e.rule.split(':')[1]],
      k: e.kind,
      t: e.title,
      w: e.when,
      act: e.action,
      href: e.link,
      ext: true,
      p: both((lang) => pick(e.location, lang)),
    })),
  };
}

// Safe to drop into a <script type="application/json"> body.
export const payloadJson = (base) => JSON.stringify(calendarPayload(base)).replace(/</g, '\\u003c');
