# news.json: how to add a post

`src/data/news.json` feeds the "Latest" section: the list at `/news/`, one page per post at
`/news/<slug>/`, and the three-card strip on the home page. It is a JSON array. Add a post by
appending one object to the array (order in the file does not matter; the site sorts newest first
by `date`). Never edit or delete a published post's `slug`; its URL is already shared.

The build checks every post (`src/data/news.js`). If a post is malformed, `npm run build` fails and
nothing deploys. Always run `npm run build` after editing and fix whatever it reports.

## Fields

| Field | Required | What it is |
|---|---|---|
| `slug` | yes | The URL piece. Lowercase words joined by hyphens, unique, e.g. `ward-night-oct-21`. |
| `date` | yes | The day the news happened or was announced, `YYYY-MM-DD`. Sorting uses this. |
| `kind` | yes | One of `event`, `news`, `press`, `action`. `press` = coverage we show as a receipt; `action` = something we ask neighbors to do. |
| `title` | yes | `{ "en": "...", "es": "..." }`. Short, plain, no clickbait. |
| `summary` | yes | `{ "en": "...", "es": "..." }`. One sentence. Shows on cards and as the page description. |
| `body` | yes | `{ "en": ["paragraph", "paragraph"], "es": ["párrafo", "párrafo"] }`. Plain text paragraphs, no HTML, no Markdown. |
| `source` | yes | The receipt. `{ "label": ..., "href": "https://..." }`: the Instagram post, article or official page the facts come from. `label` can be a plain string (e.g. `"Block Club Chicago, Oct 3, 2026"`) or `{ "en", "es" }`. `href` can also be a site path like `/platform/`. Shown as "The receipt: label" / "El comprobante: label". |
| `event` | no | For anything with a date and place: `{ "start": ..., "end": ..., "location": ..., "rsvp": ... }`. `start` and `end` are either `YYYY-MM-DD` (all day) or a full ISO time with the Chicago offset, e.g. `2026-11-03T18:00:00-06:00` (use `-05:00` before Nov 1, 2026 and from Mar 14, 2027; `-06:00` in between). `end` is optional. `location` is a string or `{ "en", "es" }`. `rsvp` is an optional URL; when present an RSVP button shows. After the last day the post stays up with a "Past" chip. |
| `links` | no | Buttons under the post: `[{ "label": { "en", "es" }, "href": "..." }]`. Site paths start with `/` (e.g. `/volunteer#signup`); outside links use full `https://` URLs and open in a new tab. |
| `image` | no | A path under `public/`, e.g. `/images/news/launch.jpg`. Keep it under 300 KB (JPEG or WebP). Only use photos the campaign owns or has posted itself. |
| `expires` | no | `YYYY-MM-DD`. After this day the post leaves the home strip (it stays on `/news/`). Use it for anything time-bound: events, deadlines, filing windows. |

## Example

```json
{
  "slug": "ward-night-oct-27",
  "date": "2026-10-27",
  "kind": "event",
  "title": { "en": "Ward Night, Tuesday October 27", "es": "Noche del Distrito, martes 27 de octubre" },
  "summary": {
    "en": "Bring your question or your case number and talk to Byron's team directly.",
    "es": "Trae tu pregunta o tu número de caso y habla directamente con el equipo de Byron."
  },
  "body": {
    "en": ["Ward Night is every Tuesday. Come by with a neighbor."],
    "es": ["La Noche del Distrito es cada martes. Ven con un vecino."]
  },
  "event": {
    "start": "2026-10-27T17:00:00-05:00",
    "location": { "en": "25th Ward office", "es": "Oficina del Distrito 25" }
  },
  "links": [
    { "label": { "en": "Knock doors with us", "es": "Toca puertas con nosotros" }, "href": "/volunteer#signup" }
  ],
  "source": { "label": "25th Ward office, Instagram", "href": "https://www.instagram.com/p/EXAMPLE/" },
  "expires": "2026-10-27"
}
```

(The time and place above are placeholders to show the shape. Do not copy them as facts.)

## Rules for every post (a daily sweep must follow all of them)

1. **Verified facts only.** Every name, number, date, time and address must appear in the source you
   link. If a detail is not in a source, leave it out. Never invent a time, a speaker, a giveaway,
   a format or a location.
2. **Every post needs a source.** No source, no post.
3. **No emdashes.** Use commas, colons or a new sentence. The build rejects them.
4. **Never name an opponent** in the ward race. The contrast is machine versus movement, never a
   person.
5. **Goals are floors, never caps.** No "only $X to go," no "just 10 more signatures."
6. **Spanish is real Spanish,** written for neighbors in Pilsen and La Villita, not a machine
   translation. Keep the same facts in both languages. Fixed phrases: "Noche del Distrito" (Ward
   Night), "Toca Puertas con Nosotros" (Knock Doors With Us), "Distrito 25" (25th Ward), "que paguen
   los ricos, que se financien las escuelas, alivio en los impuestos a la propiedad."
7. **The campaign voice** (`voice.md`): speak as the campaign about our own record, "we" first.
   Press is a receipt in `source`, never the subject ("The Tribune reported..." is wrong).
   Plain, concrete, real addresses. No consultant words.
8. **Do not duplicate.** Check the existing slugs and dates before adding; update nothing that is
   already published unless a fact was wrong.
9. Time-bound posts get an `expires` date.
