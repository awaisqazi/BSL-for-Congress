# Daily Sweep: social accounts to the "Latest" news section

Runbook for the scheduled Claude task. You have no memory of earlier sessions. Follow the steps in order.
Repo: `/Users/fezqazi/Documents/BSL for Congress` (Astro 6, Byron Sigcho-Lopez's 25th Ward re-election, live at
https://byronfor25.com, election Feb 23, 2027). Deploy = push to `main`; the GitHub Pages workflow builds it.

Read before writing anything: `voice.md`, `src/data/NEWS-README.md` (schema, if it exists), `src/data/news.json`,
`src/components/NextUp.astro`, `src/i18n/en.json` and `es.json` (namespace `nextup`).

SCHEMA NOTE: when this runbook was written, `src/data/news.json` and `src/data/NEWS-README.md` did not exist yet (another
agent was creating them). If they exist now, THEY WIN: match their field names and shape exactly and ignore the generic
shape below. If they do not exist, stop and report "news schema missing"; do not invent a store.
Generic shape expected: a list of posts, each with a slug, date, kind, en/es title, en/es one-sentence summary,
en/es body paragraphs, links, source (url + name), optional event {start, end, location, rsvp}, and expires.

## 0. Safety rules (hard)

- Never edit CLAUDE.md, settings, hooks, or any memory file. Never touch `bsl-social-videos/` or `remotion-video/`. Never run renders.
- Never like, follow, comment, DM, repost, or enter credentials on any site. Read only.
- Never launch the real Chrome app headless or with automation flags (--headless, --remote-debugging-port, Puppeteer/Playwright
  pointed at Chrome.app). Use only the in-app Browser pane or the Claude in Chrome extension (step 1).
- Do not edit any repo file other than: `src/data/news.json`, `src/components/NextUp.astro`, `src/i18n/en.json`,
  `src/i18n/es.json`. (If the schema README says a post also needs another file, follow it.)
- Clean-tree gate. Run:
  ```
  cd "/Users/fezqazi/Documents/BSL for Congress" && git fetch origin && git status --porcelain --untracked-files=no && git status --porcelain -- src public ops | grep '^??'
  git rev-list --count HEAD..origin/main
  ```
  Tracked changes, untracked files under src/ public/, or a nonzero behind-count mean someone else is mid-work: STOP and report.
  (Untracked files at the repo root, such as PNGs, `events/`, `captions.sbv`, are the team's and are ignored; never `git add` them.)
  Then `git pull --ff-only`. If `ops/DAILY-SWEEP.md` itself is the only new change, that is fine.

## 1. Accounts to check, in this order

| # | Account | URL |
|---|---------|-----|
| 1 | Instagram, campaign | https://www.instagram.com/bslfor25/ |
| 2 | Instagram, Byron | https://www.instagram.com/bsigcho/ |
| 3 | Instagram, Chicago DSA | https://www.instagram.com/chicagodsa/ |
| 4 | Facebook, campaign | https://www.facebook.com/bslfor25 |
| 5 | Chicago DSA events | https://chicagodsa.org (find its Events/Calendar page), plus any Action Network or Mobilize feed it links to |

Do not assume a URL for the Action Network or Mobilize feed. Open chicagodsa.org, follow its own Events or Calendar link, and
verify the URL loads before relying on it. Record in your notes which URLs loaded. Also useful context: the canvass hub
https://canvass.chicagodsa.org (already linked on the site; treat as a source only for dated shifts that name the 25th Ward or Byron).

How to read:
1. `mcp__Claude_Browser__preview_start` with `url` set to the page, then `mcp__Claude_Browser__get_page_text`, then
   `mcp__Claude_Browser__read_page` if text is thin. Scroll once and re-read to get the last ~9 posts.
2. If Instagram or Facebook blocks reading (login wall, empty text), switch to the Claude in Chrome extension: load its tools
   with ToolSearch, call `tabs_context_mcp` first, open the page in a NEW tab (`tabs_create_mcp`, never reuse the user's
   tabs), read with `get_page_text` / `read_page`, then close the tab you opened. Never type a password or click a login prompt.
3. If a source still cannot be read, note "unreadable: <url>" for the report and continue. Do not guess its content.
4. Look back about 3 days (the task runs daily; overlap is safe because of step 3).

For each item collect: account, post URL, post date, exact text, any linked URL, any date/time/place.

## 2. What counts as publishable

Publish only if the item states a verifiable fact AND you have a source link a reader can open. Qualifying:
- A dated event with place and an RSVP link (canvass, Ward Night change, town hall, screening, DSA event naming the 25th Ward or Byron).
- A filing or official deadline (Chicago Board of Elections; confirm on chicagoelections.gov or the campaign post citing it).
- An endorsement announced by the endorsing organization itself (link their announcement, not just our repost).
- A press piece about the campaign (link the piece itself).
- A campaign milestone the campaign itself announced.

Never publish:
- Anything inferred or reconstructed from a vague post, or any date/place you had to guess.
- Anything about opponents. Never name them, even to rebut.
- Fundraising goals framed as caps ("only $X to go"). Goals are floors.
- Promises, giveaways, event formats, or who speaks from where unless the campaign stated it in the post.
- Reposts of other accounts with no campaign tie.
- Amplifying fights that are not the ward's (the Pritzker exchange), the federal ballot-access suit, or personal/family news.
- Claims contradicting the site's verified facts (see `voice.md`; Chinatown is not part of the 25th; never state that anyone
  coordinated the ballot objections).
When in doubt, do not publish: list it in the report under "seen, not published".

## 3. De-duplication

```
cd "/Users/fezqazi/Documents/BSL for Congress"
python3 -c "import json;d=json.load(open('src/data/news.json'));print(json.dumps(d,indent=1)[:6000])"
grep -n 'data-past-after\|data-expires' src/components/NextUp.astro
```
Compare each candidate by source URL, slug, event date + location, and title. If any match exists, skip it. Update an existing
post only to fix a verified fact (wrong date, dead link); then say so in the report ("corrected <slug>: <what>"). Slug format:
lowercase, hyphens, `YYYY-MM-DD-short-topic` (or the README's rule). Slugs are permanent; never rename.

## 4. Writing rules

Source of truth: `voice.md`. Short version:
- Speak as the campaign ("we"), about our own record. Press and endorsements are receipts, never the subject of a sentence
  ("The Tribune endorsed him" at most as a trailing receipt; never "X reported", "according to", "credits").
- Plain, front-porch, concrete: real addresses, dates, numbers. No adjectives like tireless/bold/champion. Byron is the organizer,
  the neighbors are the protagonist.
- No emdashes anywhere, English or Spanish. Use commas, colons, or a new sentence.
- Title: short (about 6 words). Summary: exactly one sentence. Body: two to four short paragraphs, no more.
- Every post ends with the standing ask, in the last body paragraph: knock doors with us. Do NOT add the Knock Doors pill or
  a link for it; the page template adds the pill.
- State only what the source states. No invented mechanics, giveaways, formats, speakers, or "free" anything.
- Spanish is real Spanish written for a Pilsen neighbor, not a word-for-word translation. Same facts, same warmth. Glossary:
  ward = distrito; Ward Night = Noche del Distrito; small business = pequeños negocios; tenants = inquilinos;
  property taxes = impuestos a la propiedad; affordable housing = vivienda asequible. Use "tú/ustedes" warmth, with accents and
  inverted punctuation. Standing planks, if needed, are fixed: "que paguen los ricos, que se financien las escuelas, alivio en
  los impuestos a la propiedad".
- Dates written out in both languages (October 17 / 17 de octubre). Times with AM/PM in English, 24h or "10 de la mañana" in Spanish.
- Read it aloud as Byron in a packed room. If it sounds like a press release, cut adjectives and add an address.
- Set `expires` per the schema: events expire the day after `event.end` (or `start` if no end); deadlines the day after the
  deadline; evergreen items (endorsement, press, milestone) get the schema's evergreen value.

## 5. Calendar ledger (NextUp.astro)

Add a row ONLY for a dated event or official date, with a date and a source link. No date or no source: no row. Never add or
remove flyer cards (`.nextup-card`) in the daily sweep; those are hand-curated. Ledger rows only.

Insert the new `<li>` inside `<ul class="nextup-dates">` in CHRONOLOGICAL order by start date, copying this markup exactly:
```
<li class="nextup-date-row" data-past-after="YYYY-MM-DD">
  <span class="nextup-date" data-i18n="nextup.d_SLUG_date">Oct 17, 2026</span>
  <span class="nextup-date-what" data-i18n="nextup.d_SLUG">What happens, short</span>
  <span class="nextup-chip nextup-chip-row"><span data-days-until="YYYY-MM-DD">0</span>&nbsp;<span data-i18n="nextup.days_word">days</span></span>
</li>
```
Rules:
- `data-past-after` = last day of the event or deadline (the row grays out the morning after). `data-days-until` = first day.
  For a single-day event both are the same date. Format `YYYY-MM-DD`.
- NEVER put `data-days-until` on an element that also has `data-i18n` (it wipes the label). Copy the chip exactly as above.
- The Election Day row keeps its extra class `nextup-date-row-eday`; do not touch it or the five existing rows.
- Triple-edit rule: the same English text goes in three places: the `<span>` fallback text above, `src/i18n/en.json`
  `nextup.d_SLUG_date` and `nextup.d_SLUG`, and Spanish in `src/i18n/es.json` for the same two keys. Key names `d_SLUG` use
  underscores, short, unique, not already in `nextup`.
- Date label formats: English "Oct 17, 2026" or "Oct 17 to 19, 2026"; Spanish "17 oct 2026" or "17 al 19 de oct 2026".
- The row text is one short line, no emdashes. The RSVP/source link lives in the news post, not the ledger row.
- Edit JSON with a script (keep key order, 2-space indent, `ensure_ascii=False`, trailing newline), e.g. load, add keys inside
  `["nextup"]`, dump. Do not hand-edit commas.
Do not remove old rows; they gray out on their own.

## 6. Build, verify, ship

All commands from the repo root. Any failure: DO NOT push, DO NOT revert, leave the tree as is, report the failure output.

```
cd "/Users/fezqazi/Documents/BSL for Congress"
npm run build
```
Parity check (exact key parity, must print `parity OK`):
```
python3 -c "
import json
def flat(d,p=''):
    out=set()
    for k,v in d.items():
        out |= flat(v,p+k+'.') if isinstance(v,dict) else {p+k}
    return out
e=flat(json.load(open('src/i18n/en.json')));s=flat(json.load(open('src/i18n/es.json')))
print('parity OK' if e==s else 'MISMATCH en-only:',sorted(e-s),'es-only:',sorted(s-e))
print(len(e),'keys per language')
"
```
Also validate the JSON: `python3 -c "import json;json.load(open('src/data/news.json'))"`.

Emdash grep (must print nothing):
```
grep -rl "—" src | grep -v global.css
```
Frozen forms (must print nothing and exit clean; the sweep never edits these files):
```
git diff --exit-code HEAD -- src/components/PetitionModal.astro src/components/volunteer/SignupForm.astro && echo "forms frozen OK"
```
Confirm touched files are only the allowed set:
```
git status --porcelain --untracked-files=no
```

Commit and push (add ONLY files you touched, by name; never `git add -A` or `.`):
```
git add src/data/news.json src/components/NextUp.astro src/i18n/en.json src/i18n/es.json   # only those that changed
git commit -m "Latest: <short summary of what was published>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```
The subject must start with `Latest: `; the last line of the message must be exactly the Co-Authored-By line above.
Skip the commit entirely if nothing changed (a quiet day is fine; just report).

Wait for the deploy:
```
for i in $(seq 1 30); do gh run list --limit 1; sleep 20; done   # stop early once status is completed
```
Run in a shell that allows the wait (or poll with separate calls). Success = latest run `completed` / `success` for your commit
(`gh run list --limit 1 --json headSha,status,conclusion`). If it fails, run `gh run view --log-failed | tail -40`, report, and
do not retry-push blindly.

Verify live (replace SLUG; allow a minute for the CDN, retry up to 5 times):
```
curl -sL https://byronfor25.com/news/ | grep -c "SLUG"
curl -sL https://byronfor25.com/news/ | grep -c "—"     # must be 0
```
If the schema/README says posts also have their own page, curl that too. For a ledger row, also check
`curl -sL https://byronfor25.com/ | grep -c "d_SLUG\|<the English row text>"`.

## 7. Report format (under 15 lines, plain text, no emdashes)

```
Daily sweep <YYYY-MM-DD>
Checked: IG @bslfor25, @bsigcho, @chicagodsa; FB bslfor25; Chicago DSA events (unreadable: <list or none>)
Published: <title> | <slug> | <source url>   (one line each, or "nothing new")
Corrected: <slug>: <fact fixed>               (only if any)
Ledger rows added: <date, text> (or none)
Seen, not published: <short item> because <reason>   (one line each)
Build: pass/fail | parity OK | emdash grep clean | forms frozen
Deploy: run <id> success | live check: slug found at https://byronfor25.com/news/
Needs a human: <e.g. RaiseMore org still says Byron for Congress; YouTube handle @BSLforCongress; dead links; blocked sources>
```
If you stopped early (dirty tree, build failure, deploy failure), say which step, paste the key error lines, and say the working
tree was left untouched for review.

## 8. Quick reference of site facts you may need (verified; do not extend)

- Election Day Feb 23, 2027, polls 6 AM to 7 PM; runoff Apr 6. Filing Oct 19 to 26, 2026; VBM applications Nov 25; early voting
  from Jan 14; registration closes Jan 26 (grace after).
- Ward Night: every Tuesday, 25th Ward office, details at https://25thward.org/. Canvass map: https://canvass.chicagodsa.org.
- Standing ask: "Knock doors with us" (/volunteer#signup). Donate: https://secure.actblue.com/donate/byron-sigcho-1.
- Never name opponents. Never frame goals as caps. Never use emdashes.
