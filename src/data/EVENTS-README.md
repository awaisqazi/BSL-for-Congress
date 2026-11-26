# events.json: how to add a shift or a date

`src/data/events.json` is the single list of places and dates the campaign asks neighbors to show
up to. It feeds:

- the **Show Up** block on the home page (the next three dated shifts, right under the hero),
- the **/events/** page (This Week, Coming Up, Every Week, Dates That Matter),
- the dated cards at the top of the volunteer page's **This Week** strip,
- one calendar file per dated entry and language, built at `/events/<id>.ics` and `/events/<id>-es.ics`,
- the public JSON feed at `/events/feed.json` (see below).

It is a JSON array. Add an entry by appending one object (order in the file does not matter; the
site sorts by `start`). Never change a published `id`; calendar files and links use it.

The build checks every entry (`src/data/events.js`). If an entry is malformed, `npm run build`
fails and nothing deploys. Always run `npm run build` after editing and fix whatever it reports.

## The JSON feed

`/events/feed.json` (built by `src/pages/events/feed.json.js` from `jsonFeed()` in `src/data/events.js`)
lists every dated show-up entry (canvass, Ward Night, meetup), past ones included, sorted by start, plus
the weekly standing shifts. It exists for the form auto-responder: the Google Apps Script that emails
people after they sign up looks the event up by `id`, reads the wording in both languages, and filters
out anything whose `expires` has passed (the site only rebuilds on a push, so old entries linger). Each
event carries ready-made `ics` and Google Calendar (`gcal`) links; `endAssumed: true` means the entry has
no `end` and the calendar link used start plus 2 hours.

Field names are a contract: add fields, never rename or remove them. It holds only what is already
public on the site.

## A direct sign-up link for one shift

`/volunteer/#rsvp-<id>` opens /volunteer on that shift's day with its card in view and its sign-up
form already open (`fromRsvpHash()` in `src/components/MiniCalendar.astro`). Once the shift has
passed, the same link shows the upcoming shifts instead.

## The featured shift: sigchofor25.com/rsvp

`src/data/featured.js` names the one shift on the flyer in circulation ("RSVP: link in bio"). That
shift gets the page `/rsvp/` (`src/pages/rsvp.astro`): its photo, its facts and its sign-up form
already open, with its own link share card. The first orange strip on /links leads there too. When
a new flyer goes out, change `id` (and `share`, the 1200x630 card in `public/images`) in that one
file. The morning after the shift, `/rsvp/` sends people on to the upcoming shifts.

## Dated entries

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Lowercase words joined by hyphens, unique, e.g. `canvass-2026-10-18-cermak`. |
| `kind` | yes | `canvass`, `meetup` or `wardnight` for something you show up to (these become cards); `deadline` or `election` for official dates (these go on the ledger). |
| `title` | yes | `{ "en": "...", "es": "..." }`. Short and plain: "Petition Canvass". |
| `line` | yes | `{ "en": "...", "es": "..." }`. One short sentence: what you do there. |
| `start` | yes | Full ISO time with the Chicago offset, e.g. `2026-10-18T11:00:00-05:00` (use `-05:00` before Nov 1, 2026 and from Mar 14, 2027; `-06:00` in between). Deadlines with no time use `YYYY-MM-DD`. |
| `end` | no | Same format as `start`, or `null`. For a window of days (filing week) use the last day, `YYYY-MM-DD`. |
| `location` | yes | The place name. A plain string for a proper name (`"Cafe Latteaa"`), or `{ "en", "es" }` when it translates (`"25th Ward office"` / `"Oficina del Distrito 25"`). |
| `address` | no | Street address, or `null`. When present, it links to a map. State the address only; never claim a place is or is not in the ward unless a source says so. |
| `rsvp` | yes | The RSVP page URL, or `null` when there is none (`null` means the card takes the sign-up itself). |
| `action` | yes | The one button label. With an RSVP: `{ "en": "RSVP", "es": "Confirmar asistencia" }`. With no RSVP: `{ "en": "Tell us you're coming", "es": "Avísanos que vienes" }`; for our own canvass shifts with no outside RSVP page: `{ "en": "Sign up", "es": "Apúntate" }`. With no RSVP the button opens the card's own sign-up form (name, phone or email, ZIP, how many they bring), which saves to the campaign's event sign-up Google Form (field ids in `src/components/rsvp/form-options.js`) with the event's title, place, id and date; with an RSVP it links out to that page. Deadlines: `{ "en": "Add to calendar", "es": "Agregar al calendario" }`. |
| `sponsor` | yes | Who hosts it, as the source names it (e.g. `"Chicago DSA Southside Branch"`), or `null`. |
| `source` | yes | The receipt: a full `https://` URL where every detail of the entry can be checked (the RSVP page, the organizer's post or map, the Board of Elections calendar). |
| `geo` | no | `{ "lat": 41.85219, "lng": -87.67842 }`, the map pin on /volunteer (#map). Do not type it by hand: after adding entries with an `address`, run `node ops/geocode-events.mjs`, which looks up every address that has no `geo` yet (US Census geocoder, public addresses only). An entry without `geo` still shows everywhere except the map. |
| `image` | no | A photo for the card: `{ "src": "/images/name.jpg", "alt": { "en": "...", "es": "..." } }`. The file lives in `public/images`, about 3:2 and at least 800 px wide (the card crops to 3:2 from the top). Only a photo the campaign may publish, and say plainly in `alt` who is in it. Most shifts have none. |
| `slate` | no | `true` for a canvass for a Socialist Slate partner in another ward (source: canvass.chicagodsa.org). The card gets a "Socialist Slate" tag, and the home page shows at most one slate card among its three so our own shifts keep their place. Name the candidate and their ward in `title` and `line`. |
| `host` | no | Overrides the "Hosted by" group the /volunteer filters put a shift in: `campaign`, `ward`, `dsa` or `partner`. Leave it out almost always: `src/data/events.js` (`hostOf()`) derives it, in this order: Ward Night or a sponsor naming the 25th Ward Office is `ward`; `"slate": true` or a sponsor naming DSA is `dsa`; no sponsor on a canvass or meetup is `campaign` (our own shift); any other named sponsor is `partner`. Set it only when that rule puts a shift in the wrong group, and only on a `canvass`, `meetup` or `wardnight` (the build rejects anything else). Deadlines and the election have no host group. |
| `expires` | yes | `YYYY-MM-DD`, the event day (the last day for a window). The morning after, the card takes itself off the page, even if nobody redeploys; ledger rows gray out instead. |

The /volunteer search box reads each entry's `title`, `line`, `location`, `address` and `sponsor` in both languages, plus its host group, its type and its date words, so plain, specific wording there is what makes a shift easy to find. Nothing extra needs to be filled in for search.

## Weekly entries

Standing shifts carry `"recurring": true` and a `rule` instead of `start`/`end`/`expires`.

| Field | What it is |
|---|---|
| `rule` | `weekly:` plus a two-letter day: `weekly:TU` (Tuesday), `weekly:SU` (Sunday). |
| `when` | `{ "en": "Every Tuesday", "es": "Cada martes" }`, the stamp on the card. Say "Most Sundays" when it is not every week. |
| `link` | Where the card goes: `https://25thward.org/` for Ward Night, `https://canvass.chicagodsa.org` for the Sunday canvass map. |
| `title`, `line`, `location`, `address`, `action`, `sponsor`, `source` | As above. |
| `host` | Optional, as above. Today Ward Night derives to `ward` and the Sunday canvasses (sponsor Chicago DSA) to `dsa`. |

## Example

```json
{
  "id": "canvass-2026-11-01-example",
  "kind": "canvass",
  "title": { "en": "Petition Canvass", "es": "Caminata para la petición" },
  "line": {
    "en": "Knock doors with neighbors and talk to them about the ward.",
    "es": "Toca puertas con tus vecinos y habla con ellos sobre el distrito."
  },
  "start": "2026-11-01T10:00:00-06:00",
  "end": "2026-11-01T13:00:00-06:00",
  "location": "Example Cafe",
  "address": "123 W Example St, Chicago",
  "rsvp": "https://actionnetwork.org/events/EXAMPLE/",
  "action": { "en": "RSVP", "es": "Confirmar asistencia" },
  "sponsor": null,
  "source": "https://actionnetwork.org/events/EXAMPLE/",
  "expires": "2026-11-01"
}
```

(The time and place above are placeholders to show the shape. Do not copy them as facts.)

## Rules for every entry

1. **Verified facts only.** Every date, time, place, address, host and RSVP link must appear in the
   source you link. If a detail is not in a source, leave it out. Never invent a time, a speaker, a
   giveaway, food, a format or who will be there.
2. **Every dated entry has a `source` URL.** No source, no entry.
3. **No emdashes.** Use commas, colons or a new sentence. The build rejects them.
4. **Never name an opponent** in the ward race.
5. **Spanish is real Spanish,** written for neighbors in Pilsen and La Villita. Same facts in both
   languages. Fixed phrases: "Noche del Distrito" (Ward Night), "Toca Puertas con Nosotros",
   "Distrito 25", "Caminata para la petición" (petition canvass), "mapa de caminatas" (canvass map).
6. **One action per card.** The button is the RSVP, or the card's own sign-up form when there is no RSVP.
7. **Do not duplicate.** Check existing ids and dates first. When an event is also news, it can have
   a post in `news.json` too, but the shift itself lives here.
8. Past entries can stay in the file; the site hides them. Clean them out now and then.
