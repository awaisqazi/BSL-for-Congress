// The whole calendar in one file, per language, written at build time:
// /events/all.ics (English) and /events/all-es.ics. Every dated entry in
// src/data/events.json plus the next 20 weeks of the weekly standing shifts.
// Linked from the "Plan your month" calendar on /volunteer (MiniCalendar).
// Sits beside ./[file].ics.js; no events.json id may be "all".
import { icsFeed } from '../../data/events.js';

export function GET({ site }) {
  const origin = site ? site.origin : 'https://byronfor25.com';
  return new Response(icsFeed('en', origin), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
