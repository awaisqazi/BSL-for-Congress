# Form confirmation emails

A Google Apps Script project that sends a branded confirmation email, in English and
Spanish, the moment someone submits one of the campaign's five Google Forms. It runs in the
campaign Workspace account (nino@sigchofor25.com), sends with that account's mail, and
keeps a log spreadsheet as its only record.

It ships **switched off**: `ENABLED` is `false`, so every submission is logged and nothing
is sent until someone turns it on.

## The five forms

| Key | Form | Email | Language |
|---|---|---|---|
| `rsvp` | Event Sign-Up / Registro para eventos ("I'm coming" on event cards) | 1A canvass, 1B Ward Night, 1C place to be announced, 1D other meetup, 1E already over or not found, 1F new guest count, plus the "also on the list" block (1G) | both |
| `lobbyday` | Springfield Lobby Day, Dec. 2 | 2A seat on the bus, 2B on my own, 2C can't go, 2D after Dec 2 | both |
| `volunteer` | Sign up to Volunteer (also fed by /genz) | "You're in" with up to three interest blocks | both |
| `petition` | Petition Blitz Form (the "Knock Doors With Us" modal) | K-SHIFT or K-POSTED. **Ships off** (`FORM_PETITION_ENABLED=false`) | both |
| `canvass` | Canvass team (/canvass) | your times, matching canvasses | from the "Spanish / English / Both" answer |

"Both" means English first, then a divider, then Spanish, with one shared footer. Any form
that later gains a question whose title starts with `Language` (answer `en` or `es`) gets a
single-language email with no code change.

The copy comes from the two content specs (event sign-ups and Lobby Day; volunteer, Knock
Doors and canvass team). Event details come from the site's feed,
`https://sigchofor25.com/events/feed.json`, cached about 10 minutes. If the feed cannot be
read, or the event is not in it, the email still goes out without the event card.

## Files

`src/` holds exactly what goes into the Apps Script project, one file each:

| File | What it is |
|---|---|
| `appsscript.json` | The manifest: V8, Chicago time, the six permissions listed below |
| `Config.gs` | Settings, owner switches (`OPTIONS`), question titles for each form |
| `Copy.gs` | Every word of every email, English and Spanish |
| `Render.gs` | All decisions and the email builder (no Google services inside) |
| `Shell.gs` | The email design, generated from `shell/shell.html` and `shell/shell.txt` |
| `Feed.gs` | Reads the event feed and the calendar files |
| `Log.gs` | The log spreadsheet |
| `Mail.gs` | The form-submit handler: read, decide, check switches, send, log |
| `Triggers.gs` | `setup`, `installTriggers`, `removeTriggers`, `turnOff`, `status` |
| `Tests.gs` | `sendSamplesToSelf` |
| `Drafts.gs` | `draftFewSamples`, `draftAllSamples`: test emails as Gmail drafts (see "Testing with drafts") |
| `Fixtures.gs` | Fictional sample submissions, one or more per email |
| `Local.example.gs` | Template for `Local.gs` (form ids and the campaign address) |

`Local.gs` holds the real form ids and stays out of the repo. `shell/` holds the editable
email design; `test/run.mjs` checks everything and writes previews.

## Install (in the campaign account)

1. **Forms access.** The campaign account must have **edit** access to every form it should
   answer. A form trigger cannot be installed on a form the account can only view. Today only
   the canvass team form is editable by nino@sigchofor25.com; share the other four as editor
   first.
2. Go to script.google.com signed in as nino@sigchofor25.com. New project. Name it
   "Form confirmations".
3. Project Settings: tick "Show appsscript.json manifest file in editor". Paste
   `src/appsscript.json` over the manifest.
4. Add a script file for each `.gs` in `src/` (same names without `.gs`) and paste each one.
   For `Local`, paste `Local.gs` (or `Local.example.gs` with the ids filled in). Do not add
   `Local.example` as well.
5. Pick `setup` in the function menu and press Run. Google asks for permission (below).
   `setup` saves the form ids in Script Properties, writes the default switches, creates the
   log spreadsheet "Form auto-responses log" and prints `status`.
6. Run `installTriggers`. Then run `status` and read the execution log: each form should say
   `id set; opens OK; all titles found; trigger ON`.
7. Run `sendSamplesToSelf`. About 20 sample emails (subjects start with `[SAMPLE]`) arrive in
   the campaign inbox. Read them on a phone.
8. Optional dry run with real traffic: in Project Settings, Script Properties, set
   `TEST_RECIPIENT` to a staff address and `ENABLED` to `true`. Every real submission now
   goes to that address with `[TEST]` in the subject.
9. Go live: delete `TEST_RECIPIENT`, keep `ENABLED` = `true`.

### Permissions Google will ask for

| Google's wording (roughly) | Scope | Why |
|---|---|---|
| See, edit, create and delete all your Google Forms forms | `forms` | Read each new response, open the forms for `status`, attach the submit triggers. The script never changes a form. |
| Send email as you | `script.send_mail` | Send the confirmations (MailApp). |
| Connect to an external service | `script.external_request` | Read the event feed and the `.ics` calendar files from sigchofor25.com. |
| Allow this application to run when you are not present | `script.scriptapp` | The form-submit triggers run the script when someone submits a form. |
| See, edit, create and delete all your Google Sheets spreadsheets | `spreadsheets` | Create and write the log spreadsheet. It opens no other sheet. |
| Manage drafts and send emails | `gmail.compose` | Only for the test drafts (`Drafts.gs`, below). Production confirmations still go out through MailApp. |

No other permission is needed: no Drive, no Gmail reading, no contacts.

## Testing with drafts

`Drafts.gs` builds sample emails with the same code path as real confirmations and saves
them as Gmail drafts in the campaign account, addressed to itself, subjects starting
`[SAMPLE]`. Nothing is sent.

- `draftFewSamples()`: three drafts: an event sign-up canvass email (1A, both languages),
  Springfield Lobby Day with a seat on the bus (2A, both), and a volunteer email (doors,
  Spanish and social media, both).
- `draftAllSamples()`: one draft per sample fixture, the same set `sendSamplesToSelf` mails.

Drafts open in Gmail's compose editor, which shows an email somewhat differently from how a
recipient sees it (the editor reflows some styles). To see the real thing, send a draft to
yourself from the editor. Creating drafts needs the `gmail.compose` permission, the narrowest
Gmail permission that can create a draft, plus the Advanced Gmail service in
`appsscript.json`; that is why both are in the manifest.

## Switches (Script Properties, read on every submission)

| Property | Ships as | Meaning |
|---|---|---|
| `ENABLED` | `false` | Anything but `true`: log only, send nothing |
| `TEST_RECIPIENT` | not set | When set, every email goes there instead, subject `[TEST] ...` |
| `FORM_RSVP_ENABLED` and the other four | `true`, petition `false` | Per-form on/off |
| `REPLY_TO`, `OWNER_EMAIL` | from `Local.gs` | Where replies, samples and problem notices go |

Owner decisions are one line each in `OPTIONS` in `Config.gs`: `inviteReplies` (adds
"Plans changed? Reply..." and "Not you? Reply..."; off until someone reads the inbox),
`stateBoardNotice`, `wardEventConfirmations` (Ward Night and CEDA confirmations),
`slateFiller` (at most one labelled Socialist Slate canvass, last in a list),
`donationLine` (off; needs a sigchofor25.com/donate redirect first).

## Turn it off fast

- Script Properties: set `ENABLED` to `false` (or run `turnOff`). Takes effect on the next
  submission. Everything is still logged.
- To stop it running at all: run `removeTriggers`. Run `installTriggers` to bring it back.
- One form only: set its `FORM_<KEY>_ENABLED` to `false`.

## What it will not send

No email address or a malformed one; example.com, example.org and `.test` addresses; a name
starting with `TEST` (the campaign's own test rows); a link or more than 80 characters in a
name; the same answers from the same address on the same form within 10 minutes; Lobby Day
with an unknown seat answer. Each is logged as `skipped` with the reason.

## Daily sending limit

MailApp counts recipients per day: 1,500 on a paid Workspace plan, 100 on a trial (`status`
prints what is left). When fewer than 20 remain, the script stops sending and logs
`quota_low`; the next day it carries on. Skipped people are not re-sent automatically.

## Problems

Each submission is handled on its own. If one fails, the log gets an `error` row, and at most
once an hour the campaign address gets a short notice with counts per form and the log
link. The notice never names anyone.

## Personal data

The log spreadsheet holds, per submission: time, form, which email went out, language,
**email address**, event id, sent/skipped/error, the reason, and a short fingerprint of the
answers (a hash, used to spot repeats). No names, phones, addresses or free text. The
emails themselves stay in the campaign account's Sent folder. The sheet lives in
nino@sigchofor25.com's Drive and is shared with no one; anyone who can edit the Apps Script
project can also read it. Nothing about supporters is written to the execution log, and
error notices carry counts only.

## Change the copy

1. Edit `src/Copy.gs` (`**bold**`, `[text](https://sigchofor25.com/...)`, `{merge fields}`).
2. Run `node ops/form-autoresponder/test/run.mjs` and look at the previews it lists.
3. Paste the new `Copy.gs` into the project. Nothing else changes.

To change the design, edit `shell/shell.html` and `shell/shell.txt`, run the harness (it
regenerates `src/Shell.gs`), then paste `Shell.gs`.

The harness checks: expected email or skip for every sample, no emdash, no unfilled field,
no "undefined" or "null", no third-party web address in the visible text, subjects under 60
characters, both-language emails under 80 KB, every event list in date order (a Socialist
Slate row only last), no web address left as bare text outside a link (mail apps would
auto-link it in their own color), every event row linking its calendar card
(`/volunteer/#cal-YYYY-MM-DD`) or `/lobbyday/`, and the switch logic. Besides `index.html`
it writes `gallery.html`, the same gallery as a publishable page. It needs
`dist/events/feed.json` (`npm run build`).

## Add a form

1. Add a key to `FORM_KEYS`, its question titles to `FORM_TITLES`, its name fields to
   `FORM_PEOPLE`, a label to `FORM_LABELS` and `FORM_<KEY>_ENABLED` to `PROP_DEFAULTS`
   (`Config.gs`).
2. Add its words to `Copy.gs` and a `plan<Name>_` function to `PLANNERS_` in `Render.gs`.
3. Add samples to `Fixtures.gs`, run the harness.
4. Add the form id to `Local.gs`, run `setup`, then `installTriggers`.
