// One calendar file per dated entry in src/data/events.json, per language,
// written at build time: /events/<id>.ics (English) and /events/<id>-es.ics.
import { dated, ics } from '../../data/events.js';

export function getStaticPaths() {
  return dated.flatMap((e) => [
    { params: { file: e.id }, props: { event: e, lang: 'en' } },
    { params: { file: `${e.id}-es` }, props: { event: e, lang: 'es' } },
  ]);
}

export function GET({ props, site }) {
  const origin = (site ? site.origin : 'https://byronfor25.com');
  return new Response(ics(props.event, props.lang, origin), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
