# Site integration plan

Nothing here is built yet. This describes the changes to make once the
project exists and the two public values are in GitHub. Rule zero: the frozen
Google Form posts (action URLs, `entry.*` names, checkbox `value`s) are not
touched. Supabase is an extra copy, written alongside.

## 1. `src/scripts/supa.js` (new, about 40 lines, no dependency)

Plain `fetch` to the Supabase REST endpoint instead of loading supabase-js:
no external script tag, nothing added to `package.json`, nothing in
`Layout.astro` changes. (If a later feature needs auth or realtime, swap in
`@supabase/supabase-js` pinned to an exact version and bundled by Astro, not
a CDN tag.)

```js
// src/scripts/supa.js: fire-and-forget inserts. Never throws, never blocks.
const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
export const enabled = Boolean(URL && KEY);          // the feature flag

const lang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');
const meta = () => ({
  language: lang(),
  source_page: location.pathname.slice(0, 300),
  user_agent: navigator.userAgent.slice(0, 400),
});
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

async function insert(table, row) {
  if (!enabled) return { ok: false, skipped: true };
  try {
    const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`; // legacy anon JWT only
    const res = await fetch(`${URL}/rest/v1/${table}`, {
      method: 'POST', headers, body: JSON.stringify(row), keepalive: true,
    });
    // 409 = already RSVPed / duplicate: treat as success for the visitor.
    return { ok: res.ok || res.status === 409, status: res.status };
  } catch { return { ok: false }; }
}

export function volunteer(f) { /* f: FormData from #volunteer-form */ }
export function petitionRequest(f) { /* f: FormData from #petitionForm */ }
export function rsvp(eventId, f) { /* f: FormData from an event card form */ }
export function action(name, payload = {}) { return insert('actions', { action: name, payload, ...meta() }); }
```

Field mapping inside the three helpers (reads the existing frozen names, so
the markup does not change):

| Helper | Table | Mapping |
|---|---|---|
| `volunteer(f)` | `volunteers` | `entry.661274230` first_name, `entry.449873967` last_name, `entry.378191335` email, `entry.763325091` phone, `entry.113002180` city, `entry.1587719447` zip, `f.getAll('entry.1014527396')` interests |
| `petitionRequest(f)` | `petition_requests` | `entry.1710222697` name, `entry.1317557731` email, `entry.2114998122` phone, `entry.1117716304` city, `entry.1494610555` zip, `getAll('entry.854369982')` intents, `getAll('entry.10606465')` help_with |
| `rsvp(eventId, f)` | `event_rsvps` | `event_id` = card's `data-event-id`, `name`, `email`, `phone`, `zip`, `bringing_count` (0 to 10, integer) |

Every helper adds `meta()` and `honeypot` (read from the hidden input by id,
see below), runs values through `clean()`, and returns the promise from
`insert`. Callers never `await` it before letting the Google post go.

If `PUBLIC_SUPABASE_URL` or `PUBLIC_SUPABASE_ANON_KEY` is missing at build
time, `enabled` is false: helpers return immediately and any Supabase-only UI
(the "I'm coming" form) is not rendered, so the site looks exactly like today.
Astro inlines `import.meta.env.PUBLIC_*` at build, so this is decided per
deploy.

## 2. Volunteer form dual-write (`SignupForm.astro`)

- Keep the `<form action="https://docs.google.com/...formResponse"
  target="hidden_iframe_volunteer">` exactly as is.
- In the existing `submit` listener, as the very first line (before the 500 ms
  timeout that calls `form.reset()`): `volunteer(new FormData(form));`
  No `preventDefault`, no `await`. The browser posts to Google as it does
  today; the fetch runs in parallel with `keepalive: true`.
- Add one honeypot input with **no `name`** (so Google never receives it),
  visually hidden and skipped by keyboard and screen readers:
  `<input id="vol-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">`
  with `.hp { position:absolute; left:-9999px; }`.

## 3. Petition modal dual-write (`PetitionModal.astro`)

Same pattern: in its submit handler, first line
`petitionRequest(new FormData(form));`, plus a nameless honeypot input
`#pet-hp`. Google post untouched. The `address` and `preferred_time` columns
exist for a future "bring the petition to my door" option; the modal does not
collect them today and should not claim to until the campaign confirms that
offer.

## 4. "I'm coming" mini-form on event cards (`EventCard.astro`)

Shown only when `enabled` is true and the event has no external RSVP page
(`rsvp: null` in `events.json`, e.g. the cafe meetup whose action reads "Tell
us you're coming"). Cards with an Action Network `rsvp` link keep the link.

- Collapsed: the card's existing action button ("Tell us you're coming" /
  "Avísanos que vienes"). Tapping it expands a small inline form:
  - Name (required)
  - Email or mobile phone (one field each; at least one required, checked
    in JS and again by the database)
  - ZIP (optional, 5 digits)
  - "Bringing anyone?" stepper, 0 to 10, default 0
  - nameless honeypot input
  - Submit: "I'm coming" / "Voy"
- `<form data-event-id="{event.id}">` so `rsvp(form.dataset.eventId, new FormData(form))`
  knows the event. The id must match `events.json` (the database enforces the
  same slug rule as `events.js`).
- On submit: `preventDefault` (no Google form here), disable the button,
  call `rsvp(...)`, then replace the form with a thank-you line plus the
  existing add-to-calendar link. On a network failure, still thank them but
  show the event's address and time so they can come anyway; never show a
  scary error.
- If a phone is collected, show the same SMS compliance line the volunteer
  form uses, or do not text that number. Bilingual strings go in
  `src/i18n/en.json` and `es.json` with the existing `data-i18n` pattern.
- Copy states only verified facts about the event (time, place, sponsor
  from `events.json`). No invented perks or promises.

## 5. GitHub Pages build (`.github/workflows/deploy.yml`)

Add the two repository variables to the build step's environment:

```yaml
      - name: Build Astro
        run: npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ vars.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ vars.PUBLIC_SUPABASE_ANON_KEY }}
```

`vars.*`, not `secrets.*`: both values end up in the public JS anyway, and
the database rules (insert-only RLS) are what protect the data. Until the
variables are set they resolve to empty strings and the feature stays off.

For local dev: `cp supabase/config.example.env .env` and fill in the values
(`.env` is already git-ignored).

## 6. Test checklist before turning it on

- Submit each form once on the local dev server (port 4399): row appears in
  the Table Editor, Google sheet still gets its row.
- RSVP twice with the same phone: one row, visitor sees thank-you both times.
- Fill the honeypot via devtools: row saved with `flagged = true`, excluded
  from `rsvps_by_event`.
- From devtools, try `fetch(URL + '/rest/v1/volunteers', {headers:{apikey:KEY}})`:
  must return a permission error, never rows.
- Build with the variables unset: no "I'm coming" form, no Supabase requests.
