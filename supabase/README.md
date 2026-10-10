# byronfor25 database (Supabase)

Status: designed, not live. No project exists yet, nothing on the site calls
it yet. This folder holds the plan and the SQL.

## What it is for

The site already sends sign-ups to Google Forms. That keeps working. The
database adds a second, structured copy that the campaign can sort, count and
act on, plus things Google Forms cannot do well: RSVPs per event with a
headcount, "tell us you're coming" on cards that have no RSVP page, and a log
for future one-tap actions.

## What it stores

| Table | Filled by | Key fields |
|---|---|---|
| `volunteers` | /volunteer sign-up form | first/last name, email, phone, city, zip, language, interests (the same checkbox text the Google Form gets) |
| `event_rsvps` | "I'm coming" on event cards | `event_id` (the `id` in `src/data/events.json`), name, email or phone, zip, `bringing_count`, language, `status` |
| `petition_requests` | the petition modal | name, email, phone, city, zip, optional address and preferred time, the checkboxes ticked, `handled_at` |
| `actions` | future features | `action` name and a small JSON `payload` |

Every row also records `created_at`, the page it came from, the language the
visitor was reading in, and a `flagged` marker for likely bots.

Two dashboard views: `campaign_daily_summary` (submissions per day per table,
Chicago time) and `rsvps_by_event` (RSVPs, plus-ones and expected headcount per
event).

SQL: `migrations/0001_init.sql` (tables, rules, security) and
`migrations/0002_views.sql` (views). Both were test-run against Postgres with
the Supabase roles: the public role can insert valid rows and nothing else;
reads, edits, deletes and bad data are refused.

## How the static site writes safely

- The site is static (GitHub Pages), so the browser talks to Supabase directly
  using the project URL and the **publishable (anon) key**. That key is meant
  to be public. What it can do is decided by the database, not by hiding it.
- **Insert only.** The public role may add rows to the four tables, on a fixed
  list of columns. It cannot read, change or delete anything, not even the row
  it just wrote. The campaign-only columns (`status`, `handled_at`, `flagged`,
  `id`, `created_at`) cannot be set from the site.
- **Validation in the database.** Required names, email or phone present,
  5-digit ZIP, length limits, a sane email shape, bringing 0 to 10 guests,
  language `en` or `es`. Emails are lowercased and phones reduced to digits
  automatically, so duplicates are easy to spot.
- **One RSVP per person per event.** A second tap with the same email or phone
  is refused by the database and the site just shows the thank-you again.
- **Bots.** Each form gets a hidden honeypot field people never see. If it is
  filled, the row is still saved but marked `flagged = true` and left out of
  the RSVP counts. Supabase also applies its own platform-level abuse
  protection. If spam ever gets real, the next step is a per-IP throttle in
  the database or a Cloudflare Turnstile check; neither is needed on day one.
- **No new third-party script on the page.** The site calls the Supabase REST
  endpoint with plain `fetch` (about 40 lines, see `site-integration.md`), so
  `Layout.astro` keeps loading nothing beyond fonts.
- **Never blocks the Google post.** The Supabase write is fire-and-forget,
  sent alongside the existing form submit. If Supabase is down, slow, or not
  configured, the visitor and the Google sheet see no difference.

## What stays exactly as it is

The Google Form action URLs, `entry.*` ids and checkbox values in
`SignupForm.astro` and `PetitionModal.astro` do not change. The Google intake
sheet remains the record of truth during the transition. The database copy is
written in parallel and never replaces those posts. The honeypot input has no
`name` attribute, so Google never receives it.

## How the campaign sees and uses it

1. **Supabase dashboard, Table Editor.** Open the project, pick a table, sort
   and filter. Change an RSVP `status` to `attended` / `no_show` / `cancelled`
   or set a petition request's `handled_at` right in the grid.
2. **Views.** In the SQL editor: `select * from rsvps_by_event;` for headcounts,
   `select * from campaign_daily_summary;` for the daily pulse.
3. **CSV export.** Table Editor has "Export to CSV" on any table or filtered
   result. Good for walk lists and phone banks.
4. **Google Sheets sync (later, optional).** A small scheduled job (Apps Script
   or a Supabase Edge Function with the service-role key kept server side)
   can copy new rows into a sheet. Not built; only worth it if the team lives
   in Sheets.

Only people invited to the Supabase organization can see the data. Invite
staff from Organization settings > Team; give the Read-only role to anyone
who only needs to look.

## Privacy

- **What is personal:** names, email, phone, ZIP, street address (petition
  requests only), and the browser's user-agent string. No passwords, no
  payment data, no IP addresses are stored.
- **Who can see it:** members of the Supabase organization, and any trusted
  script holding the service-role key. Never the public, never the site.
- **The service-role / secret key** never goes in the repo, in GitHub Pages,
  or in any browser code. Only the publishable key does.
- **Same promise as the form:** the sign-up form already says submitting opts
  into campaign texts. Any new form that collects a phone (the RSVP form)
  should show the same compliance line or not use the number for texting.
- **Retention (recommendation, campaign to decide):** keep rows through the
  February 23, 2027 election and any April 2027 runoff, then export what the
  campaign wants to keep and delete the rest. A one-line `delete from ...
  where created_at < ...` in the SQL editor does it.
- **Requests to be removed:** delete the person's rows by email or phone in
  the Table Editor and in the Google sheet.

## Manual steps for Fez

1. **Create the project.** In Supabase, organization "Fez's Org", New project:
   - Name: `byronfor25`
   - Region: East US (Ohio), `us-east-2`, the closest to Chicago
   - Plan: Free (fine for this volume; note Free projects pause after a week
     with no activity, which steady sign-ups prevent; Pro removes that)
   - Database password: click **Generate a password** and save it in your
     password manager. Nobody else, including Claude, needs it.
   - Press **Create new project** and wait about two minutes.
2. **Apply the SQL**, either way:
   - **A. Let Claude do it:** authorize the Supabase MCP connector (run `/mcp`
     in Claude Code and finish the Supabase sign-in in the browser), then ask
     Claude to apply `0001_init.sql` and `0002_views.sql` and run the security
     advisor.
   - **B. Paste it yourself:** project > SQL Editor > New query, paste all of
     `migrations/0001_init.sql`, Run. Then the same with `0002_views.sql`.
     Then Advisors > Security Advisor should show no errors for these tables.
3. **Copy the two public values:** Project Settings > API Keys: the
   publishable key (`sb_publishable_...`, or the legacy `anon` key) and the
   project URL (`https://<ref>.supabase.co`).
4. **Add them to GitHub** as repository *variables* (not secrets):
   repo Settings > Secrets and variables > Actions > Variables >
   `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.
5. Then ask Claude to build `src/scripts/supa.js`, wire the forms and the
   "I'm coming" cards, and add two `env:` lines to `deploy.yml`
   (details in `site-integration.md`).
