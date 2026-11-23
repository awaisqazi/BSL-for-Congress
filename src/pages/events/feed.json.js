// Public JSON feed of the dated show-up events (canvass, Ward Night, meetup),
// written at build time: /events/feed.json. Read by the Google Apps Script that
// sends sign-up confirmation emails. Past events stay in; the reader filters
// by "expires". Field names are a contract (src/data/EVENTS-README.md).
import { jsonFeed } from '../../data/events.js';

export function GET({ site }) {
  const origin = site ? site.origin : 'https://sigchofor25.com';
  return new Response(JSON.stringify(jsonFeed(origin), null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
