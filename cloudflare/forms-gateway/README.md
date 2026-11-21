# sigchofor25-forms (forms gateway)

A small Cloudflare Worker that sits between the site's forms and the Google
Forms they feed. The page sends the form fields plus a Cloudflare Turnstile
token; the Worker checks the token with Cloudflare (`siteverify`), keeps only
the whitelisted `entry.*` fields, and posts them to the same Google Form the
page used to post to directly. The page shows success only when Google
answered 200.

Why: the site is static. A Turnstile widget on its own protects nothing,
because Google cannot check the token and the `formResponse` URLs used to sit
in the page source. With the bot check on, those URLs live only in this
Worker (`src/index.js`).

## API

`POST /submit`, JSON body:

```json
{ "form": "volunteer", "token": "<turnstile token>", "fields": [["entry.661274230", "Ana"], ["entry.1014527396", "Knock on Doors"], ["entry.1014527396", "Phone/Text Banking"]], "hp": false }
```

- `form`: `volunteer`, `genz` (same Google Form as volunteer), `petition`,
  `lobbyday`, `canvass` (the `/canvass/` team form), or `rsvp` (event-card
  "I'm coming": token check only, the browser then writes its row to
  Supabase).
- `canvass` days use Google's "Other": `entry.N=__other_option__` plus
  `entry.N.other_option_response=<text>`. The Worker keeps the two only
  together and only with text; a lone half is dropped.
- `fields`: `[name, value]` pairs, so repeated checkbox values survive.
  Unknown names are dropped, values are trimmed and capped per field.
- `hp`: the honeypot was filled. Answer `{ ok: true }`, forward nothing.

Answers: `200 { ok: true }`, `403 { ok: false, reason: "captcha" }`,
`502 { ok: false, reason: "upstream" }` (Google did not answer 200),
`500 { ok: false, reason: "config" }` (secret missing, fails closed),
`400` (`bad_request`, `unknown_form`), `413` (`too_large`, body over 16 KB),
`403 origin`, `405 method`, `404 not_found`.

CORS allows only `https://sigchofor25.com`, `https://www.sigchofor25.com`,
`https://byronfor25.com`, `https://www.byronfor25.com`. In production the
token's hostname must also be one of those four.

The Worker never logs field values. It logs only the form name and the
outcome code on failures.

## Configuration

| Name | Kind | Production | Local dev |
|---|---|---|---|
| `TURNSTILE_SECRET` | secret | the widget's secret key | `1x0000000000000000000000000000000AA` (always passes) |
| `ALLOW_DEV` | var | unset | `1`: allow `http://localhost` origins, skip the hostname check |
| `DRY_RUN` | var | unset | `1`: do not post to Google, return the exact body instead (only works with `ALLOW_DEV=1`) |

Never put the secret in `wrangler.jsonc` or anywhere in the repo.

## Local testing (nothing live)

```sh
cd cloudflare/forms-gateway
npm install
cp .dev.vars.example .dev.vars   # dummy secret, ALLOW_DEV=1, DRY_RUN=1
npx wrangler dev --port 8799
```

Then build or run the site with Cloudflare's test site key:

```sh
PUBLIC_TURNSTILE_SITEKEY=1x00000000000000000000AA \
PUBLIC_FORMS_ENDPOINT=http://127.0.0.1:8799 \
npx astro dev --port 4411
```

Test keys (Cloudflare docs, "Testing"): site key `1x00000000000000000000AA`
always passes, `2x00000000000000000000AB` always blocks; secret
`1x0000000000000000000000000000000AA` always passes,
`2x0000000000000000000000000000000AA` always fails. Test secrets accept only
the dummy token `XXXX.DUMMY.TOKEN.XXXX`.

## Turning it on (owner)

Order matters: deploy and set the secret first, then flip the site.

1. Deploy the Worker (needs a Cloudflare login on the account that owns the
   Turnstile widget):
   ```sh
   cd cloudflare/forms-gateway
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
   Note the URL it prints, `https://sigchofor25-forms.<subdomain>.workers.dev`.
2. Set the secret (paste the Turnstile widget's secret key when asked):
   ```sh
   npx wrangler secret put TURNSTILE_SECRET
   ```
3. Check it answers (should be `204` with an `Access-Control-Allow-Origin`):
   ```sh
   curl -i -X OPTIONS https://sigchofor25-forms.<subdomain>.workers.dev/submit \
     -H 'Origin: https://sigchofor25.com' -H 'Access-Control-Request-Method: POST'
   ```
4. In GitHub, repository Settings, Secrets and variables, Actions,
   Variables tab, add:
   - `PUBLIC_TURNSTILE_SITEKEY` = `0x4AAAAAAGL8lyDtDt_nSpU3`
   - `PUBLIC_FORMS_ENDPOINT` = the workers.dev URL from step 1
5. Re-run the "Deploy Astro to GitHub Pages" workflow (or push). Submit each
   form once on the live site and check the Google sheet gets the row.

To turn it off, delete either repository variable and re-run the workflow:
the forms go back to posting to Google directly.
