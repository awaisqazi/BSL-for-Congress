// Spanish twin of ./all.ics.js: /events/all-es.ics.
import { icsFeed } from '../../data/events.js';

export function GET({ site }) {
  const origin = site ? site.origin : 'https://byronfor25.com';
  return new Response(icsFeed('es', origin), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
