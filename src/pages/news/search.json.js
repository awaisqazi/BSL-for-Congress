// The search index for /news/: one small JSON file built from
// src/data/news.json at build time (served at /news/search.json). The search
// box on /news/ fetches it the first time someone uses it and filters the
// cards already on the page. Both languages ride in every entry so the
// search follows the EN / ES toggle. No post copy is written here by hand.
import { posts, stampDate, longDate, eventWhen, pick, KIND_LABELS } from '../../data/news.js';

const both = (fn) => ({ en: fn('en'), es: fn('es') });

export function GET() {
  const index = posts.map((p) => ({
    slug: p.slug,
    date: p.date,
    kind: p.kind,
    kindLabel: KIND_LABELS[p.kind],
    title: p.title,
    summary: p.summary,
    body: both((l) => p.body[l].join(' ')),
    // Dates as the cards print them, so "October" or "19 de oct" finds a post.
    when: both((l) => [
      stampDate(p.date, l),
      longDate(p.date, l),
      p.event ? eventWhen(p.event, l) : '',
      p.event ? pick(p.event.location, l) : '',
    ].filter(Boolean).join(' ')),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
