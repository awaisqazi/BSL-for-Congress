# byronfor25 database (Supabase)

Status (Oct 10, 2026): project `byronfor25` (ref `rsxddnoymkebahumcfnc`,
us-east-2) is live with all three migrations applied (`0003_admin.sql` adds the
staff-only campaign desk at `/admin/`, see "Campaign desk" below). GitHub
repository variables `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set. The site code
(`src/scripts/supa.js`, the two form dual-writes, the "I'm coming" card form)
is written and tested locally; it goes live on the next deploy.

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

SQL: `migrations/0001_init.sql` (tables, rules, security),
`migrations/0002_views.sql` (views) and `migrations/0003_admin.sql` (admin
list, follow-up columns, staff read/update policies). Both were test-run against Postgres with
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
  `Layout.astro` keeps loading nothing beyond fonts. The one exception is the
  staff-only `/admin/` page, which loads supabase-js (pinned, with an SRI
  hash) for sign-in.
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

5. **The campaign desk, `byronfor25.com/admin/`.** A staff-only page with the
   four tables, counts, follow-up status, notes and CSV download. See below.

## Campaign desk (`/admin/`)

A password-protected page on the site for working the lists without the
Supabase dashboard. It is not linked anywhere, is `noindex`, and shows nothing
without a staff login that is also on the admin list.

### How it is locked

- **Logins:** Supabase email + password. "Allow new users to sign up" is off
  (Authentication > Sign In / Providers), so nobody can create their own
  login. Every login is made by hand in the dashboard.
- **Admin list:** `private.campaign_admins` (one row per email). The database
  shows rows only when the signed-in email is on that list
  (`private.is_campaign_admin()`, used by every policy in `0003_admin.sql`).
  A login that is not on the list signs in fine but sees zero rows and gets the
  message "This email is not on the admin list".
- **Public site unchanged:** the public key can still only insert. It cannot
  read anything, including the admin list.

### First time: create your login (Fez)

1. Supabase dashboard > project `byronfor25` > **Authentication > Users** >
   **Add user** > **Create new user**. Type your email and a strong password
   (save it in your password manager), keep **Auto Confirm User** checked,
   press **Create user**.
2. **SQL Editor > New query**, paste this with your email, **Run**:

   ```sql
   insert into private.campaign_admins (email) values ('you@example.com');
   ```

   (Upper or lower case does not matter. Check it with
   `select * from private.campaign_admins;`.)
3. Open `https://byronfor25.com/admin/` and sign in. (The page goes live with
   the next deploy.)

### Adding staff later

Do both steps for each person: **Add user** (their email, a temporary
password you send them privately, Auto Confirm on), then the same `insert`
line with their email. They can change the password with "Forgot password?".

To remove someone: `delete from private.campaign_admins where email = 'them@example.com';`
and, to end their login entirely, Authentication > Users > the user > Delete
user. A removed person's open tab stops getting rows on its next load.

### Resetting a password

- **Self-serve:** on `/admin/`, type the email, press **Forgot password?**.
  Supabase emails a link that opens `/admin/` with a "Set a new password" form.
  (Site URL is `https://byronfor25.com` and `https://byronfor25.com/admin/` is
  on the redirect allow list, Authentication > URL Configuration.)
- **Email limits:** the project uses Supabase's built-in email sender, which
  allows only a few auth emails per hour and on the Free plan may deliver only
  to addresses of members of the Supabase organization. If a reset email does
  not arrive, use the next option, or set up custom SMTP (Authentication >
  Emails) later.
- **By hand:** Authentication > Users > the user > the three-dot menu >
  **Send password recovery**, or delete the user and add them again with a new
  password (the admin-list row can stay).

### What the desk can and cannot do

Can:
- Show today / last 7 days / total per table (Chicago days, bot-flagged rows
  counted separately) from `campaign_daily_summary`.
- List volunteers, RSVPs (grouped by event, with the title from
  `src/data/events.json` and the headcount from `rsvps_by_event`), petition
  requests and actions; search and sort; show bot-flagged rows on request.
- Set a follow-up **status** and a **note** on volunteers, RSVPs and petition
  requests; they save as soon as you change them. Volunteers and petition
  requests use new / contacted / confirmed / no, and the first move off "new"
  stamps `contacted_at`. RSVPs keep their attendance status (going / maybe /
  cancelled / attended / no_show) because the headcount view counts those.
- Download the rows on screen as CSV (honeypot and browser fields left out).

Cannot (by design, enforced in the database):
- Change names, contact details, ZIPs, interests or dates, or delete rows.
  Use the Supabase Table Editor for corrections and removal requests.
- Create logins or add admins. That stays in the Supabase dashboard.
- Set `petition_requests.handled_at` (still a Table Editor field; the desk's
  status and `contacted_at` replace it for day-to-day use).

## Privacy

- **What is personal:** names, email, phone, ZIP, street address (petition
  requests only), and the browser's user-agent string. No passwords, no
  payment data, no IP addresses are stored.
- **Who can see it:** members of the Supabase organization, logins on the
  campaign desk admin list (`private.campaign_admins`), and any trusted script
  holding the service-role key. Never the public.
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
