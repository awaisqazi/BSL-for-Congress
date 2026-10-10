# BSL for Congress — Site Design & Architecture Reference

> **Purpose:** Single source of truth for how this site is wired. Read the relevant section before any change so you don't break i18n, animations, layout, or form submissions. The bilingual JSON, the Google Forms entry IDs, and the self-hosted hero video are the three pieces most likely to silently regress.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Bilingual System (i18n) — CRITICAL](#bilingual-system-i18n--critical)
4. [Design Tokens & Color Palette](#design-tokens--color-palette)
5. [Typography](#typography)
6. [Component Architecture](#component-architecture)
7. [Page Structure & Routing](#page-structure--routing)
7a. [Events Surface: Show Up on /volunteer, events.json](#events-surface-show-up-on-volunteer-eventsjson)
7b. [Latest: News Section](#latest-news-section)
7c. [The Petition Ask](#the-petition-ask)
8. [Hero Video Background — CRITICAL](#hero-video-background--critical)
8a. [Summer Band (AnointmentBanner)](#summer-band-anointmentbanner)
9. [Sub-Page Hero Pattern (Parallax + Overlay + Noise)](#sub-page-hero-pattern-parallax--overlay--noise)
10. [Platform / Issues Content — CRITICAL](#platform--issues-content--critical)
11. [Footer Quirks](#footer-quirks)
12. [Links Page (Linktree-Style)](#links-page-linktree-style)
13. [Petition Modal (Global)](#petition-modal-global)
14. [Forms & Embeds](#forms--embeds)
15. [Animations & Scroll Effects](#animations--scroll-effects)
16. [Anchor IDs & Deep Links](#anchor-ids--deep-links)
17. [Sticky Elements](#sticky-elements)
18. [Responsive Breakpoints](#responsive-breakpoints)
19. [Asset Paths & BASE_URL](#asset-paths--base_url)
20. [Image Assets Reference](#image-assets-reference)
21. [Social Media Accounts](#social-media-accounts)
22. [External Services Reference](#external-services-reference)
23. [Z-Index Hierarchy](#z-index-hierarchy)
24. [Deployment](#deployment)
24a. [Backend (planned)](#backend-planned)
24b. [Ops: Daily Sweep](#ops-daily-sweep)
25. [Common Pitfalls Checklist](#common-pitfalls-checklist)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Astro** (static site generator, scoped-CSS by default) |
| Styling | **Vanilla CSS** with CSS custom properties (no Tailwind, no Sass) |
| Fonts | Google Fonts — `Outfit` (display) + `Inter` (body), loaded via `@import` inside [src/styles/global.css](src/styles/global.css) |
| i18n | Custom client-side JS ([src/i18n/i18n.js](src/i18n/i18n.js)) reading `data-i18n` attributes, plus a `data-lang="en"/"es"` toggle for rich content (see [Bilingual System](#bilingual-system-i18n--critical)) |
| Hosting | GitHub Pages on the custom domain `https://byronfor25.com` (base path `/`; `public/CNAME`). The old `awaisqazi.github.io/BSL-for-Congress/` address 301s here. |
| Donations | ActBlue → `https://secure.actblue.com/donate/byron-sigcho-1` |
| Petition / Volunteer forms | **Google Forms** (hidden iframe submission) |
| Newsletter / signup form | **RaiseMore** embedded iframe |
| Hero video | **Self-hosted MP4** in `public/video/`: `hero-loop.mp4` (muted background loop), `hero-sound.mp4` (Watch with Sound copy), `hero-poster.jpg`. The Links page plays `hero-sound.mp4`. No YouTube embed remains. |
| Data files | `src/data/events.json` (shifts and dates), `src/data/news.json` (Latest posts); both validated at build time |
| Backend | None live. Supabase is planned as an insert-only second copy of form data; see [Backend (planned)](#backend-planned) |

---

## Project Structure

```
BSL-for-Congress/
├── astro.config.mjs            # site = https://byronfor25.com, base = /
├── ops/
│   └── DAILY-SWEEP.md          # Runbook for the daily scheduled task (socials to Latest)
├── supabase/                   # Planned backend: README.md, site-integration.md, migrations/ (not live)
├── voice.md                    # Campaign voice rules for all copy
├── public/
│   ├── BSL_Official.png, BSL_Alderman25.png   # Logos (Navbar, Links page header)
│   ├── CNAME                   # byronfor25.com
│   ├── video/                  # hero-loop.mp4, hero-sound.mp4, hero-poster.jpg
│   ├── favicon.ico, favicon-*.png, apple-touch-icon.png, android-chrome-*.png
│   ├── site.webmanifest
│   └── images/                 # See "Image Assets Reference" below
├── src/
│   ├── components/
│   │   ├── Navbar.astro        # Fixed top nav + lang toggle + mobile drawer (Meet Byron, The Record, Machine vs. Movement, Show Up)
│   │   ├── Hero.astro          # Homepage hero: self-hosted <video> bg + sound toggle
│   │   ├── ShowUp.astro        # Home (next three shifts + standing chips) and, with `full`, the /volunteer Show Up block
│   │   ├── MiniCalendar.astro  # "Plan your month" calendar inside the /volunteer Show Up block (#calendar)
│   │   ├── EventCard.astro     # One dated shift as a taped flyer (ShowUp on / and /volunteer)
│   │   ├── MeetOrganizer.astro # Homepage bio block
│   │   ├── PlatformGrid.astro  # Homepage "Byron Gets Results": nine results (platform.r1..r9)
│   │   ├── UpNext.astro        # "Up Next" ledger: eight planks (upnext.p1..p8); home + /platform
│   │   ├── LatestStrip.astro   # Homepage strip: three newest non-expired Latest posts
│   │   ├── AnointmentBanner.astro # The summer band (single column, Block Club receipt stamp)
│   │   ├── NextUp.astro        # Calendar flyers + official-dates ledger
│   │   ├── RoadCTA.astro       # Closing band on every page; carries the petition link
│   │   ├── ThePromise, PromiseCounter, VoicesWall, SignatureWall, SolidarityTicker .astro
│   │   ├── PetitionModal.astro # Global — injected by Layout.astro
│   │   ├── MobileActionBar.astro # Global except /links — mobile bottom bar with the standing volunteer ask
│   │   ├── Footer.astro        # Ticker strip + clipboard signup + sketch
│   │   ├── platform/
│   │   │   ├── PlatformHero.astro
│   │   │   ├── AnotherWorld.astro
│   │   │   ├── PolicyGrid.astro    # All 7 planks, verbatim, multi-paragraph
│   │   │   └── UnboughtBanner.astro # Stats + CTA block
│   │   ├── meet/
│   │   │   ├── MeetHero.astro, Lineage.astro, RoadMarker.astro
│   │   │   ├── EarlyLife.astro      # Ecuador + Cumberland sections
│   │   │   ├── WardRecord.astro     # Teacher banner + 4 milestone cards
│   │   │   └── SocialistValues.astro # 4 achievement cards + family + CTA
│   │   ├── machine/
│   │   │   ├── MachineHero.astro, TheDuel.astro, BattleTimeline.astro
│   │   │   ├── MovementSection.astro # Sticky pull-quote on desktop
│   │   │   ├── MachineSection.astro  # Timeline w/ pulsing "NOW" dot
│   │   │   └── BallotFight.astro     # 697 → 10,816 → 50,000 stats + CTA
│   │   └── volunteer/
│   │       ├── VolunteerHero.astro   # Short hero: badge, headline, one line (no CTA pill; Show Up follows)
│   │       ├── RolePicker.astro      # Situation chips that pre-check the form, then scroll to #signup
│   │       ├── PetitionBlitz.astro   # Ward-campaign banner; its section id is sign-petition (the petition anchor)
│   │       ├── ActionBlocks.astro    # 6 action cards (3-col → 2 → 1), "Count me in" → #signup
│   │       ├── SignupForm.astro      # Google Form, sticky text on desktop, next-steps state after submit
│   │       └── FundCTA.astro         # Donate band, after the form (was inside SignupForm)
│   ├── data/
│   │   ├── events.json               # Single source for shifts and official dates (schema: EVENTS-README.md)
│   │   ├── events.js                 # Build-time checks + date/time/.ics helpers
│   │   ├── NEWS-README.md            # Schema and rules for news.json
│   │   ├── news.json, news.js        # "Latest" posts (validation, sorting, date helpers)
│   ├── scripts/
│   │   ├── events-client.js          # Browser-side expiry, regrouping and Today/Tomorrow chips for event cards
│   │   └── motion.js, signature-wall.js  # Day countdowns, wall behavior
│   ├── i18n/
│   │   ├── i18n.js                   # Translation engine (data-i18n text + INPUT placeholder, data-lang show/hide)
│   │   ├── en.json                   # English — runtime source of truth
│   │   └── es.json                   # Spanish — must mirror en.json keys
│   ├── layouts/
│   │   └── Layout.astro              # HTML shell, SEO, i18n init, scroll observer, injects PetitionModal
│   ├── pages/
│   │   ├── index.astro               # Homepage
│   │   ├── platform.astro
│   │   ├── meet.astro
│   │   ├── movement.astro
│   │   ├── volunteer.astro
│   │   ├── events/[file].ics.js      # Calendar files, one per dated entry per language
│   │   ├── events/all.ics.js         # /events/all.ics: every dated entry + 20 weeks of the weekly shifts (all-es.ics.js: Spanish)
│   │   ├── news/index.astro, [slug].astro  # /news/ list + /news/<slug>/ posts
│   │   └── links.astro               # Linktree-style; uses Layout, no Navbar/Footer
│   └── styles/
│       └── global.css                # All design tokens + reset + utilities + buttons + animations
└── design.md                         # ← you are here
```

---

## Bilingual System (i18n) — CRITICAL

### How It Works

1. **Toggle**: `<button data-lang-toggle="en">` and `<button data-lang-toggle="es">` in the Navbar (and mobile drawer) call `setLang()` which writes `localStorage.setItem('bsl-lang', ...)`.
2. **Engine**: [src/i18n/i18n.js](src/i18n/i18n.js) walks every `[data-i18n]` element and replaces text content (or `placeholder` for `INPUT` elements that aren't `type="submit"`).
3. **Boot**: [src/layouts/Layout.astro](src/layouts/Layout.astro) calls `initI18n()` on `DOMContentLoaded` — applies the saved language and binds toggle button click handlers.
4. **Persistence**: language survives navigation because every page reads `localStorage` on load.

### ⚠️ THE #1 GOTCHA: Always Update Three Places

When changing **any visible text** that has a `data-i18n` attribute, update:

| # | File | Why |
|---|---|---|
| 1 | The `.astro` component | Fallback text for first paint / non-JS users |
| 2 | [src/i18n/en.json](src/i18n/en.json) | What actually renders in English at runtime |
| 3 | [src/i18n/es.json](src/i18n/es.json) | What actually renders in Spanish at runtime |

**The JSON files override the HTML on page load.** If you only edit `.astro`, the change is invisible unless you also update `en.json`. If you only edit `en.json`, the Spanish toggle still shows the old text. **`es.json` must mirror the key structure of `en.json` exactly** — missing keys silently fall back to whatever the HTML says (or the English value if no es key exists, since `getNestedValue` returns `undefined`).

### ⚠️ THE #2 GOTCHA: For INPUT placeholders, use `data-i18n` (not `data-i18n-placeholder`)

`i18n.js` only reads `data-i18n`. For an `INPUT` element with `data-i18n`, the engine writes to `placeholder` instead of `textContent` automatically. So translated placeholders use the same attribute as translated text content — there is no separate `data-i18n-placeholder`. (An older version of PetitionModal used `data-i18n-placeholder` and silently failed; that's been fixed, but watch for the pattern if you copy older snippets.)

### ⚠️ THE #3 GOTCHA: i18n Replaces Entire Text Content

Because `i18n.js` writes to `textContent`, any inline HTML or child elements inside a `[data-i18n]` element will be wiped on language change. **Don't put `<strong>`, `<em>`, `<br>`, etc. inside an i18n-bound element.** If you need rich formatting, split the i18n key into pieces and put each on its own element, or accept the limitation and use plain Unicode (em-dash, ellipsis) instead of markup.

#### The exception: `data-lang` blocks (rich content)

Long, data-driven copy (news posts, event cards) does not go through `en.json`. Instead the build writes both languages into the page as sibling wrappers, `<span data-lang="en">` and `<span data-lang="es" hidden>`. `applyTranslations()` in [src/i18n/i18n.js](src/i18n/i18n.js) shows the one that matches the current language and sets `hidden` on the other, and it runs on every toggle. How it differs from `data-i18n`:

| | `data-i18n="key"` | `data-lang="en"` / `data-lang="es"` |
|---|---|---|
| Text lives in | `en.json` / `es.json` | The component or JSON data file (`news.json`, `events.json`) |
| Mechanism | JS overwrites `textContent` | JS toggles `hidden` on pre-rendered siblings |
| Child markup (links, `<time>`) | Wiped | Safe, because nothing is rewritten |
| Parity audit | Covered by the script below | Not covered; the data file's build check requires both `en` and `es` |
| Use for | Fixed UI labels and page copy | Posts, event details, anything generated from a data file |

Spanish wrappers ship with `hidden` so English paints first without a flash. Never put `data-lang` and `data-i18n` on the same element.

### ⚠️ THE #4 GOTCHA: Multi-Paragraph Blocks Need a Numbered Key Per Paragraph

In [src/components/platform/PolicyGrid.astro](src/components/platform/PolicyGrid.astro), the multi-paragraph blocks now use a numbered convention so every paragraph translates:

- **Housing** — `issues.housing_desc`, `issues.housing_desc2`, `issues.housing_desc3`
- **Medicare** — `issues.healthcare_desc`, `issues.healthcare_desc2`
- **Green Jobs** — `issues.economic_desc`, `issues.economic_desc2`
- (Other blocks have a single paragraph: `issues.{plank}_desc` only.)

If you add a new paragraph to one of these blocks, **also add the matching `_descN` key to both `en.json` and `es.json`**. Don't drop the suffix back to bare `_desc` for non-first paragraphs — the parity audit will flag the orphaned text.

### i18n Key Naming Conventions (Top-Level Sections)

```
nav.*                  → Navigation labels (also used in Footer + Mobile drawer); includes nav.events ("Show Up", main nav, to /volunteer/), nav.volunteer_cta ("Sign Up" / "Inscríbete", orange pill, to /volunteer/#signup) and nav.latest ("Latest", footer only)
hero.*                 → Homepage hero (Hero.astro)
bio.*                  → Homepage "Meet Byron" bio block (MeetOrganizer.astro)
platform.*             → Homepage "Byron Gets Results" (PlatformGrid.astro): label, headline, sub, cta, r1..r9 (each {title, desc})
upnext.*               → "Up Next" ledger (UpNext.astro): label, headline, intro, p1..p8, pull, cta
anointment.*           → Homepage "The Anointment" banner (AnointmentBanner.astro)
footer.*               → Footer ticker, signup headline, paid-for, copyright
issues.*               → /platform page — full plank descriptions, hero, unbought, CTA
meet.*                 → /meet page — origin, education, ward record, achievements, family, CTA
machine.*              → /movement page — hero, movement, machine expose, timeline, ballot fight, CTA
volunteer.*            → /volunteer page — hero, blitz, action cards, signup form labels, CTA
petition_modal.*       → Global petition modal overlay
bar.*                  → Mobile action bar (MobileActionBar.astro): ask, signup, canvass, showup, dismiss
linkspage.*            → The only i18n keys on /links: canvass_team, petition_rsvp
latest.*               → Latest strip (home) + /news pages: UI labels only (label, headline, sub, cta, read, receipt, past, rsvp, ...). Post copy is NOT here; see 7b
events.*               → Show Up block (home and /volunteer), MiniCalendar (`events.cal_*`), /news pointer
```

### Dead i18n Keys

**Aim for zero dead keys.** Every translation key in `en.json` / `es.json` should be referenced by one or more `data-i18n` attributes in the components, and every `data-i18n` should resolve on both sides. The exact count drifts as copy evolves — if a future audit shows drift, run the script in [Verification](#verifying-i18n-parity) below.

### Verifying i18n Parity

Run this Node script from the repo root any time you suspect drift:

```bash
node --input-type=module -e "
import fs from 'fs';
import { execSync } from 'child_process';
const en = JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
const es = JSON.parse(fs.readFileSync('src/i18n/es.json','utf8'));
const flat = (o,p='')=>Object.keys(o).reduce((a,k)=>{const v=o[k],K=p?p+'.'+k:k;return v&&typeof v==='object'?Object.assign(a,flat(v,K)):(a[K]=v,a)},{});
const enK=new Set(Object.keys(flat(en))), esK=new Set(Object.keys(flat(es)));
const used=new Set(execSync(\"grep -roh 'data-i18n=\\\"[^\\\"]*\\\"' src/components src/pages src/layouts | sort -u\",{encoding:'utf8'}).split('\n').filter(Boolean).map(s=>s.replace(/^data-i18n=\"|\"$/g,'')));
console.log('en',enK.size,'es',esK.size,'used',used.size);
console.log('missing in es:',[...enK].filter(k=>!esK.has(k)));
console.log('missing in en:',[...esK].filter(k=>!enK.has(k)));
console.log('used not in en:',[...used].filter(k=>!enK.has(k)));
console.log('used not in es:',[...used].filter(k=>!esK.has(k)));
console.log('dead in en:',[...enK].filter(k=>!used.has(k)));"
```

Healthy state: all five "missing/used not in/dead" arrays empty, and the three counts equal.

### Hardcoded English Strings (Intentional, Not Bugs)

| String | Where | Why hardcoded |
|---|---|---|
| Photo credit `Eileen T. Meslar / Chicago Tribune` | AnointmentBanner | Proper photographer attribution stays in source language |
| Most `links.astro` text | `/links` Linktree page | Mobile bio link, English by design. Only two strips (`linkspage.canvass_team`, `linkspage.petition_rsvp`) use i18n keys |

---

## Design Tokens & Color Palette

All tokens live in [src/styles/global.css](src/styles/global.css) under `:root`.

### Brand Colors
| Variable | Hex | Usage |
|---|---|---|
| `--cream` | `#fbe2ba` | Body background, navbar bg, hero text on dark |
| `--cream-dark` | `#f0d49a` | Hover on cream surfaces |
| `--cream-light` | `#fef5e6` | Lighter section backgrounds (PlatformGrid, form inputs) |
| `--blue` | `#05aded` | Primary brand blue, headings, link accents |
| `--blue-dark` | `#0490c8` | Hover state |
| `--blue-deeper` | `#036d99` | Footer bg, modal bg, nav link text |
| `--orange` | `#e6881c` | CTAs, ticker strip, accent labels |
| `--orange-dark` | `#c97416` | Button hover |
| `--orange-light` | `#f0a040` | Lighter accent (icons on dark) |
| `--gold-soft` | `#f5d08a` | Labels and stats on blue backgrounds |

### Neutrals
| Variable | Hex |
|---|---|
| `--black` | `#1a1a1a` |
| `--white` | `#ffffff` |
| `--gray-700` | `#374151` (body text on cream) |
| `--gray-500` | `#6b7280` |
| `--gray-300` | `#d1d5db` |
| `--gray-100` | `#f3f4f6` |

### Spacing Scale
`--space-xs` (0.25rem) → `--space-5xl` (8rem). Section padding uses `--space-4xl` desktop / `--space-3xl` mobile.

### Borders, Shadows, Transitions
| Variable | Value |
|---|---|
| `--radius-sm/md/lg/xl` | 4 / 8 / 12 / 16 px |
| `--shadow-sm/md/lg/xl` | `0 1px 3px` … `0 16px 50px` rgba(0,0,0,0.12–0.25) |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--duration-fast/normal/slow` | 150 / 300 / 500 ms |
| `--nav-height` | `72px` |
| `--container-max` / `--container-wide` | 1200 / 1400 px |

### Section Background Rhythm

The site alternates between four background tones to create visual rhythm:
- `--cream` (default body)
- `--cream-light` (PlatformGrid, form inputs)
- `--blue` (AnointmentBanner, UnboughtBanner, WardRecord top, MachineSection, SocialistValues)
- `--blue-deeper` / blue→blue-deeper gradient (Footer, modal, machine-cta, volunteer-cta)

When adding a new section, pick the tone that contrasts with the section above and below.

---

## Typography

| Role | Font | Weights | CSS Variable |
|---|---|---|---|
| Display (headings, buttons, labels) | `Outfit` | 400, 600, 700, 800, 900 | `--font-display` |
| Body (paragraphs, descriptions) | `Inter` | 400, 500, 600, 700 | `--font-body` |

### Fluid Type Scale
Every text size uses `clamp()` for fluid responsiveness:
`--text-xs` (0.75–0.875 rem) … `--text-5xl` (2.75–5 rem). Example: `--text-3xl: clamp(1.875rem, 1.4rem + 2.4vw, 2.75rem)`.

### Heading Conventions
- **`.section-label`** — uppercase, orange, small, letterspaced 0.15em (`--font-display`, 700)
- **`.section-title`** — blue, 900 weight, `--text-3xl`, line-height 1.1
- **Headlines on dark sections** — cream color, uppercase, 900 weight (e.g. `.anointment-headline`, `.elected-headline`)

### Copy Conventions
- **No em-dashes (—).** Use a regular hyphen-dash (`-`) surrounded by spaces instead. This keeps copy visually consistent and avoids encoding issues across the i18n JSON files. If you encounter em-dashes in existing copy, replace them with ` - `.

---

## Component Architecture

### Scoped Styles
Every `.astro` component uses Astro's default scoped CSS via `<style>`. **Global utilities live in [src/styles/global.css](src/styles/global.css).** Don't add component-scoped duplicates of utilities like `.btn` — use the global class.

### Common Utility Classes (from `global.css`)
| Class | Purpose |
|---|---|
| `.container` | Centered max-width 1200 px with `--space-lg` padding |
| `.container-wide` | Centered max-width 1400 px (used in Navbar) |
| `.section-label` | Orange uppercase label above section titles |
| `.section-title` | Blue 900-weight heading |
| `.section-padding` | `--space-4xl` vertical (desktop), `--space-3xl` (mobile ≤768px) |
| `.btn` | Base button — uppercase, `--font-display` 700, `letter-spacing: 0.05em` |
| `.btn-orange` | Primary CTA — orange bg, white text, glow shadow |
| `.btn-outline` | Blue 2px border, transparent — hovers to blue fill |
| `.btn-cream` | Cream bg + blue text — used on dark backgrounds |
| `.btn-massive` | Larger size + `pulse-glow` 2s breathing animation |
| `.animate-in` | Starts at `opacity: 0`, scroll-observer adds `.visible` for `fadeInUp` |
| `.hide-mobile` | `display: none` at ≤1024px |
| `.hide-desktop` | `display: none` at ≥1025px |

### Button Hover Pattern
All buttons lift by `translateY(-2px)` and increase shadow on hover. Active state returns `translateY(0)`.

---

## Page Structure & Routing

Each page (except `links.astro`) imports `Layout`, `Navbar`, page-specific components, and `Footer`. Layout always injects the `PetitionModal` and the scroll-observer script.

| Route | File | Composition |
|---|---|---|
| `/` | [src/pages/index.astro](src/pages/index.astro) | Hero > ShowUp > ThePromise > MeetOrganizer > PlatformGrid (results) > UpNext > LatestStrip > AnointmentBanner > NextUp > RoadCTA > SolidarityTicker |
| `/platform` | [src/pages/platform.astro](src/pages/platform.astro) | PlatformHero → PolicyGrid → UpNext (`tone="light" pull={false}`) → UnboughtBanner |
| `/meet` | [src/pages/meet.astro](src/pages/meet.astro) | MeetHero → EarlyLife → WardRecord → SocialistValues |
| `/movement` | [src/pages/movement.astro](src/pages/movement.astro) | MachineHero → MovementSection → MachineSection → BallotFight |
| `/events/` | `redirects` in [astro.config.mjs](astro.config.mjs) | Static redirect page (meta refresh) to `/volunteer/#show-up`. Show Up was merged into /volunteer in Oct 2026 |
| `/news/` | [src/pages/news/index.astro](src/pages/news/index.astro) | One-line pointer to /volunteer/#show-up > every post in news.json, newest first |
| `/news/<slug>/` | [src/pages/news/[slug].astro](src/pages/news/[slug].astro) | One page per post: stamp, kind, title, summary, event flyer, paragraphs, link strips, the receipt, the Knock Doors pill. Details in 7b |
| `/events/<id>.ics`, `/events/<id>-es.ics` | [src/pages/events/[file].ics.js](src/pages/events/[file].ics.js) | Calendar files built per dated entry and language; see 7a |
| `/events/all.ics`, `/events/all-es.ics` | [src/pages/events/all.ics.js](src/pages/events/all.ics.js), [all-es.ics.js](src/pages/events/all-es.ics.js) | One feed per language: every dated entry plus the next 20 weeks of the weekly shifts (subscribe link in MiniCalendar) |
| `/volunteer` | [src/pages/volunteer.astro](src/pages/volunteer.astro) | The one action page: VolunteerHero (short) → ShowUp `full` (`#show-up`: This Week / Coming Up `#this-week`, MiniCalendar `#calendar`, Every Week `#every-week`, Dates That Matter `#dates`, canvass team `#canvass-team`) → RolePicker + ActionBlocks (one "Ways to Help" unit) → PetitionBlitz (`#sign-petition`) → SignupForm (`#signup`) → FundCTA → SolidarityTicker |
| `/links` | [src/pages/links.astro](src/pages/links.astro) | Linktree-style; uses Layout but **omits** Navbar/Footer |

### Per-Page SEO

Every page passes a custom `title` and `description` to `<Layout>`. The OG image is hardcoded in Layout.astro to `/images/hero-rally.jpeg` regardless of page — change Layout.astro if you need per-page OG images.

---

## Events Surface: Show Up on /volunteer, events.json

The site's job is to turn a reader into a body on a shift, so the next place to show up is never more than one scroll away. Every shift and official date lives in one file, and every surface reads from it.

### The single source: `src/data/events.json`

- [src/data/events.json](src/data/events.json) holds every dated shift (`canvass`, `meetup`, `wardnight`), every official date (`deadline`, `election`) and the two weekly standing shifts (`recurring: true` with a `rule` like `weekly:TU`). Schema and rules: [src/data/EVENTS-README.md](src/data/EVENTS-README.md).
- [src/data/events.js](src/data/events.js) validates the file at build time (bad entry = failed build, emdashes rejected, every entry needs a `source` URL) and exports the helpers: `upcoming()`, `stamp()`, `timeRange()`, `ledgerDate()`, `ics()`, `icsFeed()`. The ids `all` and `all-es` are reserved for the feed.
- Verified facts only. Every date, time, address, host and RSVP link must be in the linked source. Do not add an event because it sounds likely.
- Calendar files are built by [src/pages/events/[file].ics.js](src/pages/events/[file].ics.js): `/events/<id>.ics` (English) and `/events/<id>-es.ics` (Spanish) for every dated entry, plus one feed per language at `/events/all.ics` and `/events/all-es.ics` ([all.ics.js](src/pages/events/all.ics.js)): every dated entry and each weekly shift as an all-day event repeating for 20 weeks from the build date. Calendar descriptions link to `/volunteer/#show-up`. Nothing is hand-written into `public/`.

### The card: `EventCard.astro`

One dated shift as a taped paper flyer: a dashed date stamp (weekday over month and day), a Today / Tomorrow / In N days chip (filled in the browser, only within 14 days), the time, a blue placard title (orange for meetups), the place with the address linked to a map, the one-line from the data, the host, then **one** orange pill button: "RSVP" / "Confirmar asistencia" to the Action Network page, or "Tell us you're coming" / "Avísanos que vienes" to the sign-up form when there is no RSVP page. Never a second competing button; the optional "Add to calendar" is a quiet text link under it (on /volunteer only, via the `calendar` prop). The button is full width, at least 48 px tall (52 px min-height), and the first card's button carries the `pulse-glow` breathing. Event copy ships in both languages with `data-lang` wrappers; short labels go through `events.*` keys.

### Expiry between deploys

The site only rebuilds on deploy, so dates are re-checked in the browser by [src/scripts/events-client.js](src/scripts/events-client.js):

- Build time: only entries whose `expires` is today or later (Chicago) are rendered; up to six candidates ship.
- Browser: each card carries `data-expires`; after 23:59:59 that day it is removed, then the first three that remain are shown (`pruneList(list, 3)`). If none remain, the block shows the `events.empty` line (home) or regroups and hides empty groups (/volunteer).
- NextUp's script (home) also removes any `[data-expires]` element on the page. That is harmless: the events script re-counts after. /volunteer has no NextUp, so PetitionBlitz carries its own copy of the `data-expires` removal for the petition card.
- Ledger rows use `data-past-after`: they gray out with a strikethrough and lose their calendar link.

### Home: the Show Up block (`ShowUp.astro`)

Placed directly after the Hero, before ThePromise. Label "Show Up" / "Preséntate", headline "The Next Doors We Knock" / "Las Próximas Puertas que Tocamos", a "See every date" link to `/volunteer/#calendar`. Then the **three-card rule**: exactly the next three upcoming dated shifts, never more (desktop 3 columns; stacked single column from 1024 px down). Under the cards, two compact standing-shift chips ("Ward Night, every Tuesday" to 25thward.org, "Sunday canvasses: find your shift" to the canvass map) and a text link "Can't make these? Join the canvass team" to the canvass team Google Form. Official deadlines never take a home card; they live on the /volunteer ledger and calendar and in NextUp.

### Show Up on /volunteer (`ShowUp.astro` with `full`)

/events and /volunteer were merged in Oct 2026 (they repeated each other). `/events/` is now a static redirect to `/volunteer/#show-up` (Astro `redirects` in astro.config.mjs; the built `dist/events/index.html` is a meta refresh). The `.ics` routes under `/events/` are unchanged. /volunteer, in order:

1. **VolunteerHero**: badge, headline, one line (`volunteer.hero_sub`). No CTA pill and a short height, so the first card shows sooner.
2. **Show Up** (`<ShowUp full />`, `#show-up`): label "Show Up" / "Preséntate", headline `events.page_headline`, then:
   - **This Week** and **Coming Up** (`#this-week`): every upcoming dated shift, grouped at build time (next seven days vs later) and regrouped in the browser by today's date; an empty group hides. Cards carry "Add to calendar" and their no-RSVP button goes to `#signup` on the same page.
   - **Plan your month** (`#calendar`, `MiniCalendar.astro`), see below.
   - **Every Week** (`#every-week`): the two recurring entries as white taped cards.
   - **Dates That Matter** (`#dates`): the deadlines as a ruled ledger with "Add to calendar" per row and the Board of Elections receipt. This replaces the NextUp ledger on /volunteer (NextUp stays on the home page).
   - **Canvass team card** (`#canvass-team`, blue-deeper) with the Google Form button.
3. **Ways to Help**: RolePicker (`#find-your-post`, label "Ways to Help" / "Formas de Ayudar") directly followed by ActionBlocks (`#ways-to-fight`, heading screen-reader only). The chips and "Count me in" links still pre-check the form boxes and scroll to `#signup`.
4. **PetitionBlitz** (`#sign-petition`, petition card `data-expires="2026-10-26"`).
5. **SignupForm** (`#signup`). Frozen form values untouched.
6. **FundCTA**, then SolidarityTicker.

### The month calendar (`MiniCalendar.astro`)

A taped, ruled card with the placard "Plan Your Month" / "Planea Tu Mes" between the Show Up cards and Every Week. Data is events.json inlined as JSON at build time; no libraries.

- Month grid, Sunday first, prev/next arrows (from the current month to April 2027), today with a dashed orange outline, days outside the month dimmed.
- Each day shows up to three dots: orange for canvasses and meetups (including the Sunday canvasses), blue for Ward Night, cream with an orange ring for Board deadlines and the election. Multi-day windows (petition filing, objections) mark every day. The weekly shifts are expanded in the browser from today through Election Day; April 6, 2027 carries a runoff marker only ("Runoff, if needed", `events.cal_runoff_*`).
- Days are buttons with aria-labels like "October 18, 2 events"; arrow keys move a day or a week, Home/End jump to the week's ends.
- Selecting a day opens a panel under the grid (not a modal) with each item's time, place and the same single action as EventCard: RSVP link, the sign-up form (`#signup`) when there is no RSVP, the recurring entry's link, or "Add to calendar" (the existing .ics) for deadlines. Default selection: today, or the next day with something on it. Selecting a day writes `#cal-YYYY-MM-DD` into the URL (replaceState), and opening such a link selects that day and scrolls to the calendar.
- Under it: "Subscribe to all dates" (`webcal://` to the feed), a one-line hint, a Google Calendar subscribe link, and "Add all upcoming" (download of the same `/events/all.ics`; Spanish uses `all-es.ics`).
- Labels, month and weekday names come from `events.cal_*` keys (comma-separated lists for months and weekdays; Spanish weekdays Dom Lun Mar Mié Jue Vie Sáb). Seven columns fit 390 px with tap targets at least 44 px wide and 48 px tall.

### The other readers

- **MobileActionBar.astro** has three buttons: "Show up" / "Preséntate" (orange pulse, to /volunteer/#show-up) first, then "Sign up" (blue-deeper fill, to /volunteer/#signup) and "Find a canvass" (outline, canvass map). Same behavior as before: hides over the form and the paid-for banner, dismissible.
- **/news** opens with a one-line pointer: "Looking for where to show up?" / "¿Buscas dónde presentarte?" to /volunteer/#show-up.

### Navigation

Main nav (desktop and mobile drawer): Meet Byron, The Record, Machine vs. Movement, **Show Up** (`nav.events`, to /volunteer/), then the EN/ES toggle, Sign Up (`nav.volunteer_cta`, orange pill, to /volunteer/#signup), Donate. "Latest" left the main nav; it lives in the footer links (`nav.latest`, after Show Up) and in the Latest strip's "All the latest" link.

Footer links, in order (`Footer.astro`): Meet Byron, The Record, Machine vs. Movement, Show Up (to /volunteer/), Latest. The separate Volunteer link was dropped as a duplicate of Show Up. The drawer and footer social icons are covered in [Social Media Accounts](#social-media-accounts).

### Adding or retiring an event

Edit `events.json` only, following EVENTS-README.md, then `npm run build`. Do not hand-edit cards in components. Past entries can stay in the file; the pages hide them.

---

## Latest: News Section

"Latest" is the campaign's dated news wall: events, press receipts, actions and milestones, each with its source. Every post lives in one file and every surface reads from it. (It was removed from the main nav; Show Up took the slot. See [Events Surface](#events-surface-show-up-on-volunteer-eventsjson) for the shifts side.)

### The single source: `src/data/news.json`

- [src/data/news.json](src/data/news.json) is a JSON array of posts. Schema, field table, a worked example and the rules a sweep must follow: [src/data/NEWS-README.md](src/data/NEWS-README.md). Do not restate the schema elsewhere.
- Fields in one line: `slug`, `date`, `kind` (`event`, `news`, `press`, `action`), bilingual `title` / `summary` / `body` (`{en, es}`; body is a list of plain paragraphs), required `source {label, href}`, and optional `event`, `links`, `image`, `expires`.
- [src/data/news.js](src/data/news.js) validates the file at build time (a bad post fails the build, so nothing deploys; emdashes are rejected, both languages are required, every post needs a `source`) and exports `posts`, `getPost()`, `stampDate()`, `longDate()`, `eventWhen()`, `eventLastDay()`, `pick()`, `linkAttrs()`, `todayChicago()` and `KIND_LABELS`.
- **Sorting:** `date` descending (newest first). Posts with the same date keep their order in the file. Order in the file is otherwise irrelevant.
- Never edit or rename a published `slug`; its URL is already shared.

### Where it shows

| Surface | File | Behavior |
|---|---|---|
| Home strip | [src/components/LatestStrip.astro](src/components/LatestStrip.astro), placed after UpNext and before the summer band | The three newest non-expired posts as taped cards, cream-light background. Build time ships up to six candidates (those with no `expires` or `expires` today or later, Chicago); a client script removes any card whose `data-latest-expires` day has passed since the last deploy, then shows the first three. If none remain the whole section removes itself. |
| List | [src/pages/news/index.astro](src/pages/news/index.astro) | Every post, newest first, expired ones included. Opens with the one-line pointer to /volunteer/#show-up. Event posts get a "Past" chip after their last day (`data-past-after`). |
| Post | [src/pages/news/[slug].astro](src/pages/news/[slug].astro) | Date stamp, kind chip, title, summary, event flyer (when `event` exists, with RSVP button when `event.rsvp` exists), body paragraphs, link strips, **the receipt line**, and a closing "Knock Doors With Us" pill to `/volunteer#signup`. |
| Footer | `Footer.astro` | The only nav entry: "Latest" (`nav.latest`), after Show Up. |

The strip uses `data-latest-expires`, not `data-expires`, on purpose: other components' scripts (NextUp) delete every `[data-expires]` element outright, which would skip the strip's re-count.

### Two kinds of copy on these pages

- **Post content** (title, summary, body, event place, link labels, kind chips) ships in both languages inside `data-lang="en"` / `data-lang="es"` wrappers. i18n.js toggles them; nothing is in `en.json`. See the data-lang table in the i18n section.
- **Page chrome** (section label, headline, "Read more", "Past", "RSVP", "The receipt:", the join pill, and the strip labels) goes through the `latest.*` keys in `en.json` / `es.json` as usual.

### The receipt line

Every post ends its body with a dashed-stamp link, "The receipt: <label>" / "El comprobante: <label>", built from `source` (`latest.receipt` plus the label). It is the same dashed-stamp look as the summer band's press tag. Press is shown only as this receipt; the post text speaks as the campaign ("we") about our own record, never "X reported that" (see `voice.md`). `source.href` can be an outside URL (opens in a new tab) or a site path such as `/platform/`.

### Rules for every post

1. **Verified facts only.** Every name, number, date, time and address must appear in the linked source. If it is not in a source, leave it out. Never invent a time, speaker, giveaway, format or location.
2. **Every post needs a source.** No source, no post. The build enforces the field; a human or the sweep enforces that the source says what the post says.
3. No emdashes, never name an opponent, goals are floors not caps, real Spanish for Pilsen and La Villita. The full list is in NEWS-README.md.
4. Time-bound posts get an `expires` date so they leave the home strip.
5. After editing, run `npm run build`; fix whatever it reports before pushing.

---

## The Petition Ask

During petition season (filing window October 19 to 26, 2026) the home page and closing band carry a quiet "Sign the petition" link.

- **Target:** `/volunteer#sign-petition`, the id on the `<section>` in [PetitionBlitz.astro](src/components/volunteer/PetitionBlitz.astro). It scrolls to the petition card, whose button ("Bring the Petition to Me") continues to `#signup`.
- **Why not `#petition`:** [PetitionModal.astro](src/components/PetitionModal.astro) intercepts every link whose `href` contains `#petition` (`a[href*="#petition"]`) and opens the modal instead of navigating. A real anchor named `petition` would never scroll. Hence `sign-petition`. `news.json` links to petition use the same anchor.
- **Where it appears:** the hero ([Hero.astro](src/components/Hero.astro), `.hero-petition-link`, directly under the Knock Doors button, copy `hero.petition_link`), the closing band ([RoadCTA.astro](src/components/RoadCTA.astro), `.road-petition-link`, copy `road.petition_link`, shown on every page that ends with RoadCTA), and the petition card on /volunteer.
- **Expiry convention:** each of these carries `data-expires="2026-10-26"`. NextUp's script removes any `[data-expires]` element once that day has passed (after 23:59:59 local), so the link vanishes on October 27 without a deploy. When you add another petition link, copy the attribute exactly (RoadCTA is the model) and use `/volunteer#sign-petition`. After filing closes, the CTA elements can be deleted outright in a later cleanup.

---

## Hero Video Background — CRITICAL

The homepage hero ([src/components/Hero.astro](src/components/Hero.astro)) uses a **self-hosted `<video>`** as a background. There is no YouTube iframe anywhere on the site any more.

### Files

| File | Role |
|---|---|
| `public/video/hero-loop.mp4` | The muted background loop (`autoplay muted loop playsinline preload="metadata"`) |
| `public/video/hero-sound.mp4` | The "Watch with Sound" copy; also the only video on the Links page (with native `controls`) |
| `public/video/hero-poster.jpg` | `poster` for both; stays up when autoplay is blocked or the visitor prefers reduced motion |

Always reference them as `${base}/video/...`. The `<video>` carries `data-src-loop` and `data-src-sound`; the script swaps between them. Replacing a video means replacing the file (same name) and keeping the poster in sync.

### Architecture

```
.hero
├── .hero-video-bg
│   ├── .hero-video-container  (#heroVideoContainer)
│   │   └── <video class="hero-video" id="heroVideo">
│   └── .hero-gradient-overlay (scrim on top of the video)
├── .hero-content-overlay      (badge, headline, secondary line, CTA, petition link, urgency)
├── .hero-scroll-cue
└── .hero-sound-btn            (bottom-right: Watch with Sound / return)
```

### Cover fill and `object-position` per viewport

The video is `position: absolute; inset: 0; object-fit: cover`. A 16:9 frame in a different box crops, so `object-position` aims the crop at the part of the frame that matters (Byron's paper card is on the left; placards, receipts and the end panel are on the right two thirds):

| Viewport | Rule | Why |
|---|---|---|
| Default | `50% 50%` | Centered |
| Phones (`max-width: 767px`) and portrait up to 1366px | `9% 50%` | A tall box shows a narrow slice; aim it at the paper card on the left |
| Landscape, `min-width: 768px` | `30% 30%`, and `.hero-video-bg` starts at `top: var(--nav-height)` | The strip behind the translucent nav is `--cream`, so the top placard line is not hidden by the fixed nav; wider-than-16:9 boxes trim the top a little and the bottom more, keeping the caption band in view |

On landscape the gradient scrim is weighted to the left (navy, about 0.86 opacity at the left edge fading to 0 by 55%), because the text column sits over the paper card. Content must end before about 37% of the frame, where the story starts.

### The thinned column

The hero text column was cut so the video carries the story:

- `.hero-summary` (the long "Over 800 units..." paragraph) and `.hero-receipts` (the four number chips) are `display: none` on every viewport. Their copy (`hero.summary`, `hero.chip_*`) stays in the markup and JSON; both facts are shown lower on the page.
- `.hero-narrative-secondary` (the "running for a third term" paragraph) shows only on roomy desktop; it is hidden at `max-width: 1023px`, in portrait, and at `max-height: 820px`.
- Landscape: the Knock Doors button and the urgency stamp are held to one line in both languages (`white-space: nowrap`, fluid font size).

### Autoplay retry

Some browsers reject the first muted `play()` before the file is ready or before any interaction, so the script retries, in loop mode only (not while the sound copy is playing, and never with reduced motion): on the video's `canplay`, on the first `pointerdown`, `touchstart`, `scroll` or `keydown` (each registered once), and on `visibilitychange` back to visible. If play is still blocked the poster simply stays up. With `prefers-reduced-motion: reduce` the video is paused and `autoplay` removed.

### Sound toggle

`.hero-sound-btn` calls `enterSound()` / `exitSound()`:

- **Enter:** `loop = false`, `muted = false`, `controls = true`, `aria-hidden` removed, source swapped to `hero-sound.mp4`, `currentTime = 0`, play. The content overlay and gradient get `.faded-out` (opacity 0, no pointer events) and the container gets `.video-watching`: the video switches to `object-fit: contain` on navy with padding and live controls.
- **Exit** (second click, or the sound copy's `ended` event): the reverse, back to `hero-loop.mp4`, muted, looping.
- The button label and `aria-label` are re-synced from `hero.sound_watch` / `hero.sound_return` on every language toggle (i18n.js rewrites the span, so `syncLabel()` runs after `bsl:langchange`).

### The Links page video

[links.astro](src/pages/links.astro) shows a plain `<video controls playsinline preload="metadata" poster=hero-poster.jpg>` whose only source is `hero-sound.mp4`: the sound copy, with sound and controls from the start, not the muted loop.

### Hero Text Hierarchy

```
.hero-badge                — hero.badge           (i18n)
.hero-narrative            — wraps two i18n spans:
  ├── <span data-i18n="hero.narrative_lead">  (intro sentences ending "A third term for")
  └── <strong .hero-tagline-highlight data-i18n="hero.tagline">  (orange uppercase callout, "the 25th Ward.")
.hero-narrative-secondary  : hero.narrative_run   (desktop only, see above)
.btn .hero-cta             : hero.cta → /volunteer#signup ("Knock Doors With Us")
.hero-petition-link        : hero.petition_link → /volunteer#sign-petition (data-expires="2026-10-26"; see The Petition Ask)
.hero-summary, .hero-receipts : hidden everywhere (see thinned column)
.hero-urgency              : hero.urgency_label / data-days-until="2027-02-23" / hero.urgency_label2
```

**Why the headline is split into two i18n spans:** the tagline needs different typography (display font, uppercase, orange) inside the same paragraph as the lead. Because `i18n.js` overwrites `textContent` (Gotcha #3), the lead and the highlight live on two sibling elements that each carry their own `data-i18n` key. Keep this split if you edit the copy.

The urgency stamp's day count is filled by `motion.js`; on the eve of the election `hero.urgency_label2_one` ("day to go.") is swapped in and re-applied after language toggles.

---

## Summer Band (AnointmentBanner)

[src/components/AnointmentBanner.astro](src/components/AnointmentBanner.astro), `id="anointment"`, on the home page after the Latest strip. Label "This Summer", headline "The Ward Is a Different Story", one paragraph (`anointment.b1`), a gold kicker line, then the actions row.

- **Single column, no photo.** The old two-column layout with the Chuy Garcia photo and its credit is gone; `.anointment-content` is capped at 780px and `.anointment-inner` is a flex column. (Two leftover `grid-template-columns: 1fr` rules remain in the media queries and do nothing.) The `Chuy Garcia.jpeg` entry in the image table is no longer used by it.
- **Actions row:** the orange "Read the Full Story" button (`anointment.cta`, to /movement) and the **Block Club receipt link** (`.anointment-press`, `anointment.press`: "The receipt: Block Club Chicago, July 21, 2026"), styled as the dashed stamp: 2px dashed cream border at 60% opacity, 3px radius, small uppercase display type, `rotate: -1deg`, hover turns gold. It opens in a new tab with `rel="noopener noreferrer"`. This dashed-stamp receipt look is the site-wide convention (also the post receipt in /news).
- Blue background with a slanted top edge (`::before`, `skewY(-1.5deg)`) that blends into the cream-light Latest strip above it, which is why the strip adds extra bottom padding.
- Copy rule: the band speaks as the campaign; the press link is only a trailing receipt. Do not name anyone behind the ballot objections.

---

## Sub-Page Hero Pattern (Parallax + Overlay + Noise)

PlatformHero, MeetHero, MachineHero, and VolunteerHero all share an identical structural pattern:

```
.{name}-hero (background-image inline, background-attachment: fixed)
├── .{name}-hero-overlay (linear-gradient: blue → blue-deeper → black, 160deg)
├── .{name}-hero-noise   (SVG fractal-noise data URI, opacity 0.04)
└── .{name}-hero-content
    ├── .{name}-hero-badge       (uppercase, orange-tinted pill)
    ├── .{name}-hero-headline    (cream, 900, uppercase, --text-5xl)
    └── .{name}-hero-sub         (white body text)
```

### Quirks to Remember

- **Background image set inline via `style={`background-image: url('${base}/images/...')`}`** — must use `${base}` or it breaks on GitHub Pages.
- **`background-attachment: fixed`** creates a parallax effect on desktop; switched to `scroll` at `max-width: 768px` for mobile performance.
- **`min-height: 70vh` desktop, `60vh` mobile.** All four heroes have `padding-top: var(--nav-height)` so content clears the fixed navbar.
- **All hero badges are now translated** via i18n keys: `hero.badge`, `issues.hero_badge`, `meet.hero_badge`, `machine.hero_badge`, `volunteer.hero_badge`. If you add a new hero, follow the same pattern.
- **Noise SVG IDs differ**: MeetHero uses `id="noiseFilter"`, the others use `id="n"`. Keep them unique per hero or you'll get filter collisions.

---

## Platform / Issues Content — CRITICAL

### The walk card is the source of truth

The campaign's printed walk card is the source of truth for the **nine results** and the **eight planks**. The numbers on it ($6.4M, $7M+, 800+ units, 50 percent) are **campaign-official**: do not round, "improve", recompute or soften them, and do not add a number the card does not carry. If the card and a component disagree, the card wins. Both lists are in the card's order. The commit "Align the site to the campaign's walk card" is where the site was brought into line.

### Components, different purposes

| Component | File | Page | Content |
|---|---|---|---|
| `PlatformGrid.astro` | [src/components/PlatformGrid.astro](src/components/PlatformGrid.astro) | `/` | "Byron Gets Results": the nine results |
| `UpNext.astro` | [src/components/UpNext.astro](src/components/UpNext.astro) | `/` and `/platform` | "Up Next": the eight planks for the next term |
| `PolicyGrid.astro` | [src/components/platform/PolicyGrid.astro](src/components/platform/PolicyGrid.astro) | `/platform` | Eight full-bleed photo bands with the platform's long-form text |

### "Byron Gets Results" (`PlatformGrid.astro`, namespace `platform`)

- Section `id="platform"`. Header keys: `platform.label`, `platform.headline`, `platform.sub`, closing button `platform.cta` (to /platform).
- Nine taped result cards in an ordered list, keys **`platform.r1` to `platform.r9`**, each an object with `title` and `desc` (`platform.r3.title`, `platform.r3.desc`). The component holds the English fallback in a `results` array and renders `data-i18n={`platform.${key}.title`}`.
- **Stamps** (the dashed number at the top right of a card) appear only where the card carries a number: r1 `800+`, r3 `50%`, r7 `$7M+`, r8 `$6.4M`. Stamps are hardcoded in the array, not translated. Cards without a number get no stamp.
- Card order, each also a nested object in both JSON files: r1 affordable homes (800+), r2 tenant protections, r3 crime down by half (50%), r4 Danny Solis to the Illinois Supreme Court, r5 clinics, r6 air quality network, r7 money for local businesses ($7M+), r8 participatory budgeting streets ($6.4M), r9 sanctuary policies.
- The old four-card `platform.{housing,healthcare,economic,democracy}` structure is gone.

### "Up Next" (`UpNext.astro`, namespace `upnext`)

- Section `id="up-next"`. Keys `upnext.label`, `.headline`, `.intro`, **`.p1` to `.p8`** (the eight planks as a numbered ledger on ruled paper), `.pull` (the coalition line, "Byron builds coalition with community, not billionaires."), `.cta` ("Knock Doors With Us", to `/volunteer#signup`).
- **Props:** `tone` (`'cream'` default for the home page, `'light'` for pages whose section above is already cream) and **`pull`** (default `true`).
- **`pull={false}` on /platform:** [platform.astro](src/pages/platform.astro) renders `<UpNext tone="light" pull={false} />` because the Unbought banner directly below carries the same line as its kicker (`issues.unbought_kicker`). Showing both would repeat it back to back. On the home page `pull` stays on.
- The planks are in the card's order and wording; edit all three places (see triple-sync below).

### /platform page order

`PlatformHero` > `AnotherWorld` (thin bridge band, `issues.another_world`) > `PolicyGrid` > `UpNext` (light, no pull) > `UnboughtBanner`.

### PolicyGrid (`/platform`)

Eight bands, each `id` a deep-link target, mirrored left/right with a photo from `public/images/issues/`: `public-safety`, `housing`, `schools`, `environment`, `gender-equity`, `constituent-services`, `economic`, `transparency`. Keys are flat with underscores: `issues.{slug}_title`, `issues.{slug}_desc`, plus `_desc2`, `_desc3` for further paragraphs (slug with underscores, e.g. `issues.public_safety_title`, `issues.gender_equity_desc2`). Campaign-authored copy here is frozen; only presentation changes. If you add a paragraph, add the matching `_descN` key to both JSON files.

### Updating Platform Copy: Triple-Sync Required

For any result, plank or band text:
1. Edit the `.astro` fallback (PlatformGrid `results`, UpNext `planks`, or PolicyGrid markup).
2. Edit the key in [src/i18n/en.json](src/i18n/en.json). Note `platform.*` and `upnext.*` differ in shape: `platform.rN` is a nested `{title, desc}` object, `upnext.pN` is a flat string, `issues.*` is flat with underscores.
3. Edit the same key in [src/i18n/es.json](src/i18n/es.json).
4. If a number changes, check it against the walk card first, then grep for it (hero summary, `bio.*`, news posts, `issues.*`) so the sacred numbers stay consistent everywhere.

---

## Footer Quirks

[src/components/Footer.astro](src/components/Footer.astro) has more state than any other component. Read this section before touching it.

### Layout: 3-Column Grid With Overlapping Sketch

Desktop:
```
| Clipboard Signup (col 1, row 1-2) | Links (col 2, row 1) | Social (col 3, row 1) |
|                                    |        Sketch — spans col 2-3, row 2          |
```

The sketch wrap is `grid-column: 2 / 4` so it visually overlaps the area below Links + Social. The signup uses `grid-row: 1 / 3` so it's tall on the left.

Mobile (≤768px): `grid-template-columns: 1fr` — everything stacks; sketch becomes `grid-column: 1` with `width: 100%`.

### Three Footer Subsections (top to bottom)

1. **`.ticker-strip`** — orange band with spinning star icon (8s linear infinite), "Powered by the People" / "Average donation: $27..." copy, white→orange Donate button. The icon spin is `@keyframes spin-slow`.
2. **`.footer-main`** — blue-deeper bg; the 3-column grid above.
3. **`.footer-legal`** — bordered "PAID FOR BY..." pill + copyright line.

### Sketch Illustration — Language-Aware

The decorative sketch swaps between English and Spanish versions when the language toggle is clicked:

```html
<img id="footer-sketch-img"
     src={`${base}/images/sketch.png`}
     data-src-en={`${base}/images/sketch.png`}
     data-src-es={`${base}/images/sketch_es.png`}
     ... />
```

A small `<script>` block in [src/components/Footer.astro](src/components/Footer.astro) listens for `[data-lang-toggle]` clicks and swaps `src` based on `localStorage.getItem('bsl-lang')`. **A 50ms `setTimeout` is used to let `i18n.js` write to localStorage first.** If you change the toggle handler order, this race could regress.

### Color-Cycling Sketch Animation

The sketch uses a CSS filter chain that produces vivid, full-spectrum color cycling:

```css
.footer-sketch {
  filter: invert(1) sepia(1) saturate(10) hue-rotate(0deg) brightness(0.85);
  animation: sketch-color-cycle 10s linear infinite;
  opacity: 0.6;
}
@keyframes sketch-color-cycle {
  0%   { filter: invert(1) sepia(1) saturate(10) hue-rotate(0deg)   brightness(0.85); }
  100% { filter: invert(1) sepia(1) saturate(10) hue-rotate(360deg) brightness(0.85); }
}
```

**The full filter chain matters:**
- `invert(1)` flips the sketch so light strokes become dark and the colors register
- `sepia(1) saturate(10)` produces a saturated base for hue-rotate to act on
- `hue-rotate(0–360deg)` cycles colors
- `brightness(0.85)` prevents white-out

Don't simplify this filter chain — every step is load-bearing.

### Clipboard Signup Component

The clipboard look (used in Footer **and** Links page) is pure CSS — multi-directional wood-grain gradient, metal clip with ring + body + rivets (which physically overlaps the paper), a yellow pencil tucked underneath, and paper with faint blue ruled lines, red margin line, and 3D stack shadow. The form itself is a **RaiseMore iframe** at `https://www.raisemore.app/forms/signup/org_3CzwGfMfnK1106k0fBTvwYbnDKI?horizontal=false`. To swap the form, change the `src` only — clipboard styling is decorative wrapper.

The clipboard tilts and deepens its shadow on hover (`rotate(-1deg) translateY(-4px)`), while the paper independently rotates (`rotate(0.5deg)`). Disabled on mobile (no hover state).

**Note on z-index**: The `.clipboard-paper` (and `.links-clipboard-paper`) explicitly requires `z-index: 1` to establish a local stacking context. Without this, its child `.paper-header` (`z-index: 2`) would bleed into the parent's stacking context and incorrectly render on top of the `.clipboard-clip` (`z-index: 2`) in the non-hover state.

### Footer Social Icons

Five accounts in this exact order: Instagram, Facebook, TikTok, YouTube, X (Facebook returned in September 2026 because the walk card lists BSLFOR25 on Facebook and Instagram). Each is an inline SVG with `aria-label`. Hover background goes orange. See **Social Media Accounts** section for URLs.

---

## Links Page (Linktree-Style)

[src/pages/links.astro](src/pages/links.astro) is a self-contained Linktree replacement linked from social bios.

### Important Notes

- **Uses `<Layout>`** — so it inherits Layout's PetitionModal, scroll observer, and i18n init script. (The previous design.md said it bypasses Layout — that's wrong; it just omits Navbar and Footer.)
- **Almost no i18n.** Strings are hardcoded English by design; the two exceptions are `linkspage.canvass_team` and `linkspage.petition_rsvp` (the canvass-team and petition-canvass RSVP strips).
- **Internal links open in `target="_blank"`** — this is intentional because the page is meant for social-bio link clicks where opening a new tab is the expected behavior.

### Page Structure

```
.links-bg (fixed gradient: dark blue → black)
.links-container (max-width 480px, centered)
├── .links-header     (logo, "Byron Sigcho-Lopez", tagline)
├── .links-video      (self-hosted <video controls>, hero-sound.mp4 with hero-poster.jpg; the sound copy, not the muted loop)
├── .links-list       (taped strips: home, volunteer (#signup, orange .link-strip-primary), canvass team form, petition canvasses RSVP, canvass map, Ward Night, donate, platform, movement; read the file for the current order)
├── .links-socials    (5 round social buttons: Instagram, Facebook, TikTok, YouTube, X)
├── .links-divider    ("Join the Movement" with horizontal rules)
├── .links-form-wrap  (clipboard with RaiseMore iframe)
└── .links-footer     ("Paid for by..." line)
```

The Volunteer strip carries `.link-strip-primary` (orange) so the body ask outranks Donate. The page passes `actionBar={false}` to Layout so the mobile action bar stays off the linktree.

Mobile breakpoint here is `520px` (not the usual 768) because the page is mobile-first by intent.

---

## Petition Modal (Global)

[src/components/PetitionModal.astro](src/components/PetitionModal.astro) is injected by `Layout.astro`, so it appears on every page that uses Layout (i.e. all pages, including `/links`).

### Trigger

Any link with `href="#petition"` (or containing `#petition`) opens the modal. The script delegates clicks via `document.querySelectorAll('a[href="#petition"], a[href*="#petition"]')`. **Don't ever use `#petition` as a real anchor target on the page** — it's reserved for modal triggers.

### Close Behaviors
- Click `.petition-modal-close` (the X button)
- Click outside the modal (the dark backdrop)
- Press `Escape`

When open, `document.body.style.overflow = 'hidden'` locks page scroll; closing restores it.

### Submission Flow

The form POSTs to a Google Form endpoint (see "Forms & Embeds" below). On submit the script waits 500 ms, hides the form and shows the next-steps block (`#petitionSuccess`: Ward Night every Tuesday, Sunday canvasses via the map, "the campaign will follow up"). It stays up until the neighbor closes the modal; closing resets and restores the form. The links in that block sit outside the `data-i18n` spans so a language swap keeps them.

---

## Forms & Embeds

The site uses **two different form backends** depending on context.

### 1. Google Forms (Hidden Backend) — Petition Modal & Volunteer Signup

The technique:

```html
<form action="https://docs.google.com/forms/d/e/<FORM_ID>/formResponse"
      method="POST" target="hidden_iframe_name">
  <!-- Each input name="entry.<NUMERIC_ID>" matches a Google Form field -->
  <input name="entry.1710222697" ... />
</form>
<iframe name="hidden_iframe_name" style="display:none;"></iframe>
```

The hidden iframe catches Google's redirect so the page doesn't navigate away. The form response lands in a Google Sheet linked to that form.

If you add/remove/reorder a field, **the `entry.NNNN` name must match the Google Form's internal field ID**. You can find these by:
1. Open the Google Form editor → click "..." on a question → "Get pre-filled link" → fill something in → copy link → the URL has `entry.XXXXXXX=value`. Or
2. Use the prefilled-link feature once and inspect the resulting URL.

#### Petition Modal — `PetitionModal.astro`

| Property | Value |
|---|---|
| **Form ID** | `1FAIpQLSeYiVz1TB2tsAFdh1OakH62dM7XGCNBnaJz57Mn1beP0dqE6A` |
| **Hidden iframe** | `petition_iframe` |
| **i18n keys** | `petition_modal.*` |
| **Trigger** | Any `href="#petition"` link |
| **Pages** | All pages (modal injected globally by Layout) |

| Field | `name` | Notes |
|---|---|---|
| Name | `entry.1710222697` | required |
| Email | `entry.1317557731` | required, type=email |
| Phone | `entry.2114998122` | required, type=tel |
| City | `entry.1117716304` | required |
| Zip | `entry.1494610555` | required, `pattern="[0-9]{5}"`, maxlength 5 |
| Interest checkboxes | `entry.854369982` | values: "Sign Byron's petition" / "Volunteer to help collect signatures" |
| Activity checkboxes | `entry.10606465` | values: "Knocking on doors" / "Getting signatures at community events" / "Phone banking" / "Posting on social media" |

#### Volunteer Signup — `volunteer/SignupForm.astro`

| Property | Value |
|---|---|
| **Form ID** | `1FAIpQLSeUKnQVp4auTqHdFZeDrGlAOYAjmOO0sE19Xm11Pee2ayuuWQ` |
| **Hidden iframe** | `hidden_iframe_volunteer` |
| **i18n keys** | `volunteer.*` |
| **Pages** | `/volunteer` only |

| Field | `name` | Notes |
|---|---|---|
| First Name | `entry.661274230` | required |
| Last Name | `entry.449873967` | required |
| Email | `entry.378191335` | required |
| Phone | `entry.763325091` | required |
| City | `entry.113002180` | required |
| Zip | `entry.1587719447` | required, `pattern="[0-9]{5}"` |
| How to help (checkboxes, all share `entry.1014527396`) | 11 values | "Collect Petition Signatures", "Knock on Doors", "Phone/Text Banking", "Host a Meet & Greet", "Bilingual Outreach (I speak Spanish / Yo hablo español)", "Post on Social Media", "Precinct Captain / Volunteer", "High School Ambassador", "College Campus Captain / Volunteer", "Help Create Marketing Collateral (Graphic Design)", "Help Create Campaign Videos (Videography / Video Editing)" |

After submit, the form resets, gets `.is-submitted` (fields hidden), and the next-steps block (Ward Night, canvass map, follow-up, share link) stays up with no timer. The `<form>` carries `data-action-bar-hide` so the mobile action bar steps aside while it is on screen. `.signup-section` has `scroll-margin-top: var(--nav-height)` because `#signup` is the sitewide deep-link target for the volunteer ask (navbar pill, hero, RoadCTA, links page, mobile bar).

### 2. RaiseMore Iframe — Footer & Links Page

A pre-built signup form from RaiseMore, embedded as an `<iframe>` inside the clipboard component. **Not a Google Form.**

```
URL: https://www.raisemore.app/forms/signup/org_3CzwGfMfnK1106k0fBTvwYbnDKI?horizontal=false
Org ID: org_3CzwGfMfnK1106k0fBTvwYbnDKI
Used in: Footer.astro (every page), links.astro
```

To swap, change the `src` attribute on both iframes (Footer + Links). The clipboard styling is purely CSS decoration around the iframe.

### Form Summary Table

| Form | Backend | Component | Where it shows |
|---|---|---|---|
| Petition Blitz Modal | Google Form | `PetitionModal.astro` | All pages (global, modal) |
| Volunteer Signup | Google Form | `volunteer/SignupForm.astro` | `/volunteer` only |
| Newsletter / Volunteer Sign-Up | RaiseMore iframe | `Footer.astro` + `links.astro` | Every page footer + `/links` |

---

## Animations & Scroll Effects

### Scroll-Triggered Entrance (`.animate-in`)

Elements with `class="animate-in"` start at `opacity: 0` and fade-in-up when they enter the viewport. Powered by an `IntersectionObserver` in [src/layouts/Layout.astro](src/layouts/Layout.astro):

```js
new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);  // one-shot animation
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
```

Stagger comes from `nth-child` rules: the 2nd element animates at 0.1s, 3rd at 0.2s, 4th at 0.3s. Add `animate-in` to any new content block to participate.

### Other Animations

| Animation | Where | Detail |
|---|---|---|
| `pulse-glow` | `.btn-massive` | 2s breathing orange shadow |
| `spin-slow` | Footer ticker icon | 8s linear infinite rotation |
| `pulse-dot` | MachineSection `.timeline-item-now::before` | 2s pulsing orange ring on the "NOW" timeline node |
| `sketch-color-cycle` | Footer sketch | 10s linear infinite hue-rotate |
| Navbar `.scrolled` | Navbar | At `window.scrollY > 50`, navbar bg goes from `rgba(251,226,186,0.85)` to `0.97` + adds drop shadow |
| Underline grow | Nav links + Footer links | `::after` width: 0 → 100% on hover |
| Card lift | All `*-card` and `*-block` | `translateY(-3 to -5px)` + larger shadow on hover |
| Diagonal section edges | `.anointment::before/::after` | `skewY(-1.5deg)` clips create slanted top/bottom edges |
| Hero gradient fade | Hero sound toggle | `.faded-out` class transitions opacity 0.5s |
| Modal scale-in | PetitionModal | `transform: translateY(20px) scale(0.97)` → identity, 0.3s ease |

### Smooth Scroll

`html { scroll-behavior: smooth }` is set in `global.css`. All anchor-link navigation glides instead of jumping. The fixed navbar (`--nav-height: 72px`) means anchor targets visually butt against the navbar — sub-page heroes account for this with `padding-top: var(--nav-height)`. If you anchor-link mid-page, consider `scroll-margin-top: var(--nav-height)` on the target.

---

## Anchor IDs & Deep Links

Many sections have stable IDs that act as deep-link targets. **Don't rename these without grepping for inbound links.**

| Page | Anchor IDs |
|---|---|
| `/` | `#hero`, `#show-up`, `#the-promise`, `#meet`, `#platform` (results), `#up-next`, `#latest`, `#anointment`, `#next-up` |
| `/platform` | `#issues`, `#public-safety`, `#housing`, `#schools`, `#environment`, `#gender-equity`, `#constituent-services`, `#economic`, `#transparency`, `#up-next`, `#unbought` |
| `/meet` | `#meet-hero`, `#early-life`, `#ward-record`, `#elected-by-the-people`, `#family` |
| `/movement` | `#machine-hero`, `#the-movement`, `#the-machine`, `#ballot-fight` |
| `/volunteer` | `#volunteer-hero`, `#show-up`, `#this-week`, `#calendar` (and `#cal-YYYY-MM-DD` deep links), `#every-week`, `#dates`, `#canvass-team`, `#find-your-post`, `#ways-to-fight`, `#sign-petition` (the petition card), `#signup` |
| `/events` | Redirects to `/volunteer/#show-up` |
| **Global** | `#petition`: **does NOT scroll**; opens Petition Modal. Use `#sign-petition` for the real anchor |

Treat `#petition` as a reserved sentinel — never use it as an actual anchor target.

---

## Sticky Elements

Two desktop-only sticky behaviors to be aware of:

| Element | File | Sticky offset |
|---|---|---|
| `.movement-image-stack` (image + pull-quote stack) | [src/components/machine/MovementSection.astro](src/components/machine/MovementSection.astro) | `top: calc(var(--nav-height) + var(--space-xl))` |
| `.signup-text` (form headline column) | [src/components/volunteer/SignupForm.astro](src/components/volunteer/SignupForm.astro) | `top: calc(var(--nav-height, 80px) + var(--space-xl))` |

Both fall back to `position: static` at `≤1024px` (when the grid collapses to one column). If you change the grid breakpoint, change the sticky breakpoint too — otherwise sticky elements will overlap stacked content.

Plus one mobile-only fixed element:

| Element | File | Behavior |
|---|---|---|
| `.action-bar` (mobile action bar) | [src/components/MobileActionBar.astro](src/components/MobileActionBar.astro) | `position: fixed; bottom: 0`, `≤768px` only, `z-index: 9000`. Slides in once `scrollY > 240` (the hero CTA does the work above the fold), hides while any `[data-action-bar-hide]` element intersects (the volunteer `<form>`, the footer `.footer-legal` with the paid-for banner), and the X stores `localStorage['bsl-bar-dismissed'] = '1'` inside try/catch. While visible, `body.has-action-bar` lifts the hero sound button clear of it. Layout injects it everywhere except `/links` (`actionBar={false}`). |

---

## Responsive Breakpoints

The codebase uses three breakpoints consistently:

| Breakpoint | Behavior |
|---|---|
| `max-width: 1024px` | `.hide-mobile` hides; multi-col grids collapse to 1- or 2-column; container padding bumps to `--space-xl` |
| `max-width: 768px` | Phone layout; everything stacks to single column; section padding reduces to `--space-3xl`; container padding back to `--space-lg`; sub-page heroes switch parallax → scroll; the navbar's Volunteer/Donate pills hide (both live in the mobile drawer, Volunteer first and orange) and the mobile action bar takes over the standing ask |
| `min-width: 1025px` | `.hide-desktop` hides; sticky elements activate |

Plus one local breakpoint:

| Breakpoint | Where |
|---|---|
| `max-width: 520px` | `links.astro` (its own mobile-first cutoff) |

### Key Grid Collapses

- **Footer 3-col** → 1-col at 768
- **PlatformGrid 2-col** → 1-col at 768
- **PolicyGrid 2-col** → 1-col at 768 (full-width block becomes auto)
- **Achievements 2-col** (SocialistValues) → 1-col at 768
- **ActionBlocks 3-col** → 2-col at 1024 → 1-col at 768
- **Petition modal fields** (6-col CSS grid) → 1-col at 768
- **Bio grid 2-col** → 1-col at 1024

---

## Asset Paths & BASE_URL

### GitHub Pages Base Path

The site deploys to GitHub Pages on `https://byronfor25.com` with `base: '/'`. **All paths must still go through the base helper.**

```js
// In every .astro frontmatter:
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// In templates:
<a href={`${base}/platform`}>
<img src={`${base}/images/sketch.png`}>
```

The `replace(/\/$/, '')` strips a trailing slash so concatenation always produces clean paths. The base is also exposed on `<body data-base={base}>` if a script needs it client-side.

**Never hardcode `/images/...` or `/platform`.** Always use `${base}/...`.

This rule includes:
- All `<a href>` to internal pages
- All `<img src>`
- Inline `style={`background-image: url('${base}/...')`}` on hero sections
- Favicon and OG image references in Layout.astro `<head>`

---

## Image Assets Reference

All static images live in [public/images/](public/images/):

| File | Used By | Notes |
|---|---|---|
| `sketch.png` | Footer | English sketch illustration |
| `sketch_es.png` | Footer | Spanish version, swapped on `bsl-lang` change |
| `bslfamily.jpg` | MeetOrganizer (homepage) | Bio photo, `object-position: 35% center` |
| `byron-childhood-ecuador.jpg` | EarlyLife | Ecuador caption |
| `byron-cumberland-graduation.jpg` | EarlyLife | President's Award |
| `byron-school-rally.jpg` | WardRecord blue banner | School rally |
| `byron-family-triplets.jpg` | SocialistValues family closing | Family with triplets |
| `hero-rally.jpeg` | Layout.astro `<head>` | OG/Twitter card image (every page) |
| `machine-hero-split.png` | MachineHero | /movement parallax bg |
| `movement-frontlines.png` | MovementSection | Image stack |
| `meet-hero-placeholder.png` | MeetHero | /meet parallax bg |
| `platform-hero-placeholder.png` | PlatformHero | /platform parallax bg |
| `volunteer-hero-placeholder.png` | VolunteerHero | /volunteer parallax bg |
| `early-life-placeholder.png` | (unused) | In dir but not referenced anywhere |
| `ward-record-placeholder.png` | (unused) | In dir but not referenced anywhere |

Logo `BSL_Official.png` lives at `public/` root (not in `images/`).

---

## Social Media Accounts

Used in Footer (5 icons) and Links page (5 buttons), and Navbar mobile drawer (5 icons).

| Platform | Handle | URL |
|---|---|---|
| Instagram | @bslfor25 | `https://www.instagram.com/bslfor25/` |
| Facebook | BSLFOR25 | `https://www.facebook.com/bslfor25/` (page title "Byron Sigcho Lopez for 25th Ward Alderman", verified September 29, 2026) |
| TikTok | @sigchofor25 | `https://www.tiktok.com/@sigchofor25` |
| YouTube | @BSLforCongress | `https://www.youtube.com/@BSLforCongress` (the channel still carries the Congress-era name; swap the URL in all three places once it is renamed) |
| X (Twitter) | @ByronSigcho | `https://x.com/ByronSigcho` |

Five icons, in the order of this table (Instagram, Facebook, TikTok, YouTube, X), in `Navbar.astro` (mobile drawer), `Footer.astro`, and `links.astro`; if you update a social URL, update all three sets.

---

## External Services Reference

| Service | URL / ID | Where |
|---|---|---|
| ActBlue donation | `https://secure.actblue.com/donate/byron-sigcho-1` | Navbar, Footer ticker, all CTA blocks, Links page |
| RaiseMore signup form | `https://www.raisemore.app/forms/signup/org_3CzwGfMfnK1106k0fBTvwYbnDKI?horizontal=false` | Footer + Links clipboards |
| Google Form (Petition) | ID `1FAIpQLSeYiVz1TB2tsAFdh1OakH62dM7XGCNBnaJz57Mn1beP0dqE6A` | PetitionModal |
| Google Form (Volunteer) | ID `1FAIpQLSeUKnQVp4auTqHdFZeDrGlAOYAjmOO0sE19Xm11Pee2ayuuWQ` | volunteer/SignupForm |
| Hero / links video | Self-hosted `public/video/hero-loop.mp4`, `hero-sound.mp4`, `hero-poster.jpg` | Hero (muted loop + sound toggle) + Links page (sound copy) |
| Supabase (planned) | Project `byronfor25`, region `us-east-2` | Not live; see Backend (planned) |
| Press receipt | Block Club Chicago, July 21, 2026 | AnointmentBanner dashed stamp |

---

## Z-Index Hierarchy

| Element | z-index |
|---|---|
| `.petition-modal-overlay` | 9999 |
| `.mobile-drawer` | 9999 |
| `.navbar` | 9998 |
| `.action-bar` (mobile action bar) | 9000 |
| `.hero-sound-btn` | 20 |
| `.hero-content-overlay` | 10 |
| `.hero-gradient-overlay` | 1 |
| Sub-hero content (`.platform-hero-content`, etc.) | 3 |
| Sub-hero noise overlay | 2 |
| Sub-hero gradient overlay | 1 |
| All other section content | default 0–1 |

The modal and the drawer share `9999` because they're never simultaneously open. If you ever need them to coexist, bump one.

---

## Deployment

```bash
npm install                # install deps
npm run dev                # local dev server
npx astro build            # static build → ./dist
npm run preview            # preview built site locally
```

### Config — [astro.config.mjs](astro.config.mjs)

```js
export default defineConfig({
  site: 'https://byronfor25.com',
  base: '/',
});
```

The site is served from the custom domain root (`public/CNAME`), so `base` is `/`. Deploy is a push to `main`; the GitHub Pages workflow (`.github/workflows/deploy.yml`) builds and publishes. The `${base}/...` convention is kept everywhere so a base path could return without a rewrite, but nothing hardcodes one. The old `awaisqazi.github.io/BSL-for-Congress/` address redirects to the domain.

---

## Backend (planned)

Nothing here is live. The full plan is in [supabase/README.md](supabase/README.md) (what is stored, the safety model, setup steps) and [supabase/site-integration.md](supabase/site-integration.md) (the code changes to make once the project exists). The SQL is in `supabase/migrations/`.

| Item | Plan |
|---|---|
| Project | Supabase `byronfor25`, region East US (Ohio) `us-east-2` |
| Tables | `volunteers`, `event_rsvps`, `petition_requests`, `actions`; views `campaign_daily_summary` and `rsvps_by_event` |
| Access | **Insert-only** for the public role on a fixed column list: no reads, edits or deletes from the browser. Validation (ZIP, email shape, guest count, language) lives in the database. Honeypot field marks bots `flagged`. |
| Keys | The project URL and publishable (anon) key are public by design. They go in as GitHub **repository variables** (not secrets), passed to the build as `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Unset variables leave the feature off. |
| Client | About 40 lines of plain `fetch` in a new `src/scripts/supa.js`; no new script tag, nothing added to `Layout.astro` |
| Dual-write | The Supabase insert is fire-and-forget, sent alongside the existing Google Form post. **It never blocks or replaces the Google post**: if Supabase is down, slow or unconfigured, visitors and the Google sheet see no difference. |
| Frozen values | The Google Form action URLs, `entry.*` names and checkbox `value`s stay exactly as documented in [Forms & Embeds](#forms--embeds). The integration reads those existing names; it does not change the markup. |

Until the project exists, do not add code that calls Supabase.

---

## Ops: Daily Sweep

[ops/DAILY-SWEEP.md](ops/DAILY-SWEEP.md) is the runbook for the daily scheduled task that turns the campaign's public social posts and Chicago DSA events into "Latest" posts. The task has no memory of earlier sessions; the runbook is its whole brief. When news.json's schema or the sweep's allowed files change, update the runbook in the same change.

**What it reads:** Instagram (@bslfor25, Byron's account, Chicago DSA), the Facebook page `bslfor25`, and Chicago DSA's events pages. Read only: it never likes, follows, comments, DMs or enters credentials, and it uses the in-app Browser pane or the Claude in Chrome extension, never the real Chrome app in headless or automation mode.

**What it may change** (and nothing else): `src/data/news.json`, ledger rows in `src/components/NextUp.astro` (inside `.nextup-dates` only, in date order), and the matching `nextup.d_*` keys in `src/i18n/en.json` and `es.json`. It commits with a subject starting `Latest: `, adds files by name, and pushes to `main`.

**What it may not change:** any other file; `bsl-social-videos/` or `remotion-video/`; settings, hooks, memory or CLAUDE.md; the frozen forms (`PetitionModal.astro`, `volunteer/SignupForm.astro`); the hand-curated `.nextup-card` flyers; existing published slugs (it corrects a verified fact only, and says so in its report).

**Gates before it writes:** a clean working tree and not behind origin, then after editing a passing `npm run build`, en/es key parity, no emdash in `src`, forms unchanged, and a watched deploy. Any failure means it stops, leaves the tree as is and reports. Publishing rules are the same as for any post: verified facts only, a source on every post, no opponents, no cap-style goals. It reports in under 15 lines, including what it saw and did not publish.

---

## Common Pitfalls Checklist

Run through this before you ship a change:

- [ ] **i18n triple-update** — Did you update the `.astro` HTML, [src/i18n/en.json](src/i18n/en.json), AND [src/i18n/es.json](src/i18n/es.json)? Missing es keys silently render `undefined`.
- [ ] **i18n nested vs flat keys** — Homepage `platform.{plank}.title` is nested objects; full-platform `issues.{plank}_title` is flat with underscores. Don't mix them.
- [ ] **Inline HTML inside `data-i18n` element?** Won't survive `textContent` overwrite. Move it to a sibling element.
- [ ] **PolicyGrid multi-paragraph?** Only ¶1 has `data-i18n`; ¶2/¶3 are static English. Add new keys if you need them translated.
- [ ] **Sketch language swap** — Did you update both `data-src-en` and `data-src-es` if you changed the footer image?
- [ ] **Base URL** — All internal links and image `src` values use `${base}/...`?
- [ ] **Petition link reserved**: You did NOT use `href="#petition"` for an actual anchor target? Links that should scroll to the petition card use `/volunteer#sign-petition`, with `data-expires="2026-10-26"` if season-bound.
- [ ] **Anchor-IDs unchanged** — If you renamed a section ID, did you grep for inbound links (especially the `/platform#<plank>` deep links)?
- [ ] **Platform consistency** — If you updated PlatformGrid (homepage), did you also check PolicyGrid (`/platform`) for the same plank? They share the candidate's verbatim text.
- [ ] **Mobile responsive** — Tested at 1024 and 768 breakpoints? Sticky columns disabled?
- [ ] **Scroll-animation** — New blocks have `class="animate-in"`?
- [ ] **Section-bg rhythm** — Alternates cream / cream-light / blue / blue-deeper between adjacent sections?
- [ ] **Build clean** — `npx astro build` succeeds with no errors?
- [ ] **Google Form `entry.NNNN` IDs** — If you added a form field, the ID matches the actual Google Form question ID? (Wrong ID = silent data loss.)
- [ ] **Three sets of social icons** — If you updated a social URL, you updated it in Navbar, Footer, AND Links?
- [ ] **Hero video**: If you changed a video, did you replace the file in `public/video/` (loop, sound copy and poster stay in sync) and check the phone and landscape `object-position` crops?
- [ ] **Walk card numbers**: Do the nine results and eight planks still match the printed walk card, and the stamps (800+, 50%, $7M+, $6.4M) agree everywhere they appear?
- [ ] **Latest posts**: Does every post have a source, both languages, no emdash, and an `expires` if time-bound? Does `npm run build` pass?
- [ ] **OG image** — Layout.astro hardcodes `/images/hero-rally.jpeg` for every page; that file still exists if you removed the homepage hero image?
- [ ] **No em-dashes** — Copy should use regular dashes (` - `), not em-dashes (`—`). Check `.astro`, `en.json`, and `es.json`.
