# BSL for Congress — Site Design & Architecture Reference

> **Purpose:** Single source of truth for how this site is wired. Read the relevant section before any change so you don't break i18n, animations, layout, or form submissions. The bilingual JSON, the Google Forms entry IDs, and the YouTube hero video are the three pieces most likely to silently regress.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Bilingual System (i18n) — CRITICAL](#bilingual-system-i18n--critical)
4. [Design Tokens & Color Palette](#design-tokens--color-palette)
5. [Typography](#typography)
6. [Component Architecture](#component-architecture)
7. [Page Structure & Routing](#page-structure--routing)
8. [Hero Video Background — CRITICAL](#hero-video-background--critical)
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
25. [Common Pitfalls Checklist](#common-pitfalls-checklist)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Astro** (static site generator, scoped-CSS by default) |
| Styling | **Vanilla CSS** with CSS custom properties (no Tailwind, no Sass) |
| Fonts | Google Fonts — `Outfit` (display) + `Inter` (body), loaded via `@import` inside [src/styles/global.css](src/styles/global.css) |
| i18n | Custom client-side JS ([src/i18n/i18n.js](src/i18n/i18n.js)) reading `data-i18n` attributes |
| Hosting | GitHub Pages, base path `/BSL-for-Congress/` |
| Donations | ActBlue → `secure.actblue.com/donate/byronfor04web/` |
| Petition / Volunteer forms | **Google Forms** (hidden iframe submission) |
| Newsletter / signup form | **RaiseMore** embedded iframe |
| Hero video | **YouTube** iframe embed, video ID `ouSFDZfJu-E` |

---

## Project Structure

```
BSL-for-Congress/
├── astro.config.mjs            # site + base = /BSL-for-Congress
├── public/
│   ├── BSL_Official.png        # Logo (used in Navbar + Links page)
│   ├── favicon.ico, favicon-*.png, apple-touch-icon.png, android-chrome-*.png
│   ├── site.webmanifest
│   └── images/                 # See "Image Assets Reference" below
├── src/
│   ├── components/
│   │   ├── Navbar.astro        # Fixed top nav + lang toggle + mobile drawer
│   │   ├── Hero.astro          # Homepage hero — YouTube video bg + sound toggle
│   │   ├── MeetOrganizer.astro # Homepage bio block
│   │   ├── PlatformGrid.astro  # Homepage — 4-card summarized platform
│   │   ├── AnointmentBanner.astro
│   │   ├── PetitionModal.astro # Global — injected by Layout.astro
│   │   ├── Footer.astro        # Ticker strip + clipboard signup + sketch
│   │   ├── platform/
│   │   │   ├── PlatformHero.astro
│   │   │   ├── PolicyGrid.astro    # All 7 planks, verbatim, multi-paragraph
│   │   │   └── UnboughtBanner.astro # Stats + CTA block
│   │   ├── meet/
│   │   │   ├── MeetHero.astro
│   │   │   ├── EarlyLife.astro      # Ecuador + Cumberland sections
│   │   │   ├── WardRecord.astro     # Teacher banner + 4 milestone cards
│   │   │   └── SocialistValues.astro # 4 achievement cards + family + CTA
│   │   ├── machine/
│   │   │   ├── MachineHero.astro
│   │   │   ├── MovementSection.astro # Sticky pull-quote on desktop
│   │   │   ├── MachineSection.astro  # Timeline w/ pulsing "NOW" dot
│   │   │   └── BallotFight.astro     # 697 → 10,816 → 50,000 stats + CTA
│   │   └── volunteer/
│   │       ├── VolunteerHero.astro
│   │       ├── PetitionBlitz.astro   # Orange urgent banner
│   │       ├── ActionBlocks.astro    # 6 action cards (3-col → 2 → 1)
│   │       └── SignupForm.astro      # Google Form, sticky text on desktop
│   ├── i18n/
│   │   ├── i18n.js                   # Translation engine (text + INPUT placeholder)
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

### ⚠️ THE #4 GOTCHA: Multi-Paragraph Blocks Need a Numbered Key Per Paragraph

In [src/components/platform/PolicyGrid.astro](src/components/platform/PolicyGrid.astro), the multi-paragraph blocks now use a numbered convention so every paragraph translates:

- **Housing** — `issues.housing_desc`, `issues.housing_desc2`, `issues.housing_desc3`
- **Medicare** — `issues.healthcare_desc`, `issues.healthcare_desc2`
- **Green Jobs** — `issues.economic_desc`, `issues.economic_desc2`
- (Other blocks have a single paragraph: `issues.{plank}_desc` only.)

If you add a new paragraph to one of these blocks, **also add the matching `_descN` key to both `en.json` and `es.json`**. Don't drop the suffix back to bare `_desc` for non-first paragraphs — the parity audit will flag the orphaned text.

### i18n Key Naming Conventions (Top-Level Sections)

```
nav.*                  → Navigation labels (also used in Footer + Mobile drawer)
hero.*                 → Homepage hero (Hero.astro)
bio.*                  → Homepage "Meet the Organizer" (MeetOrganizer.astro)
platform.*             → Homepage platform cards (PlatformGrid.astro) + section header
anointment.*           → Homepage "The Anointment" banner (AnointmentBanner.astro)
footer.*               → Footer ticker, signup headline, paid-for, copyright
issues.*               → /platform page — full plank descriptions, hero, unbought, CTA
meet.*                 → /meet page — origin, education, ward record, achievements, family, CTA
machine.*              → /movement page — hero, movement, machine expose, timeline, ballot fight, CTA
volunteer.*            → /volunteer page — hero, blitz, action cards, signup form labels, CTA
petition_modal.*       → Global petition modal overlay
```

### Dead i18n Keys

**As of the last audit, there are zero dead keys.** Every translation key in `en.json` / `es.json` is referenced by exactly one or more `data-i18n` attributes in the components, and every `data-i18n` resolves on both sides (223 keys / 223 keys / 223 references). If a future audit shows drift, run the script in [Verification](#verifying-i18n-parity) below.

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
| All `links.astro` text | `/links` Linktree page | Mobile bio link — single audience, English by design |

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
| `/` | [src/pages/index.astro](src/pages/index.astro) | Hero → MeetOrganizer → PlatformGrid → AnointmentBanner |
| `/platform` | [src/pages/platform.astro](src/pages/platform.astro) | PlatformHero → PolicyGrid → UnboughtBanner |
| `/meet` | [src/pages/meet.astro](src/pages/meet.astro) | MeetHero → EarlyLife → WardRecord → SocialistValues |
| `/movement` | [src/pages/movement.astro](src/pages/movement.astro) | MachineHero → MovementSection → MachineSection → BallotFight |
| `/volunteer` | [src/pages/volunteer.astro](src/pages/volunteer.astro) | VolunteerHero → PetitionBlitz → ActionBlocks → SignupForm |
| `/links` | [src/pages/links.astro](src/pages/links.astro) | Linktree-style; uses Layout but **omits** Navbar/Footer |

### Per-Page SEO

Every page passes a custom `title` and `description` to `<Layout>`. The OG image is hardcoded in Layout.astro to `/images/hero-rally.jpeg` regardless of page — change Layout.astro if you need per-page OG images.

---

## Hero Video Background — CRITICAL

The homepage hero ([src/components/Hero.astro](src/components/Hero.astro)) uses a **YouTube iframe as a background video**, not a static image.

### Architecture

```
.hero
├── .hero-video-bg         (YouTube iframe with cover-fill trick)
├── .hero-gradient-overlay (dark→blue gradient on top of video)
├── .hero-content-overlay  (badge, headline, sub, CTA, context)
└── .hero-sound-btn        (bottom-right button toggling mute + controls)
```

### The Cover-Fill Trick

YouTube iframes don't natively "object-fit: cover" — the workaround is to oversize the iframe and translate-center it:

```css
.hero-video-container iframe {
  width: 177.78vh;   /* 16:9 ratio relative to viewport height */
  min-width: 100%;
  height: 56.25vw;   /* 16:9 ratio relative to viewport width */
  min-height: 100%;
  transform: translate(-50%, -50%);
  pointer-events: none; /* prevent clicks on bg video */
}
```

The iframe is sized to whichever dimension fills the larger axis, then centered with `translate(-50%, -50%)`. This eliminates black bars at any aspect ratio.

### Sound Toggle Behavior

The `.hero-sound-btn` swaps the iframe `src` to toggle YouTube parameters:
- **Muted (default)**: `?autoplay=1&mute=1&loop=1&playlist=...&controls=0&showinfo=0&modestbranding=1&playsinline=1`
- **Unmuted (on click)**: rewrites `controls=0` → `controls=1` and `mute=1` → `mute=0`

When unmuted:
- `.hero-content-overlay` and `.hero-gradient-overlay` get `.faded-out` (opacity 0, pointer-events none)
- `.hero-video-container` gets `.video-watching` — iframe shrinks to fit the viewport with padding, gains `pointer-events: auto` so the user can interact with the player

Clicking again re-mutes, restores overlays, and removes controls.

### Changing the Video

Search for `ouSFDZfJu-E` (appears twice — once in the iframe `src`, once in the `playlist=` parameter so the loop works). Both must change together. The same video ID is also used by the Links page (with `controls=1` from the start).

### Hero Text Hierarchy

```
.hero-badge           — hero.badge          (i18n)
.hero-headline        — hero.headline       (i18n)
.hero-subheadline     — hero.subheadline    (i18n)
.btn .hero-cta        — hero.cta → opens petition modal via href="#petition"
.hero-context         — hero.context        (i18n, the long paragraph)
```

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

### Two Components, Different Purposes

| Component | File | Page | Style | Planks Shown |
|---|---|---|---|---|
| `PlatformGrid.astro` | [src/components/PlatformGrid.astro](src/components/PlatformGrid.astro) | `/` (homepage) | Summarized 1-paragraph descriptions | 4 of 7 |
| `PolicyGrid.astro` | [src/components/platform/PolicyGrid.astro](src/components/platform/PolicyGrid.astro) | `/platform` | Verbatim multi-paragraph candidate text | All 7 |

### The 7 Platform Planks (exact verbatim titles)

1. **Housing for every veteran and all our neighbors**
2. **Medicare for all**
3. **Green jobs. Local economies. A livable future.**
4. **Abolishing ICE & decriminalization of migration**
5. **No more tax dollars for war in Iran and genocide in Israel**
6. **Democracy for the people, not for billionaires and corporations**
7. **Literacy, Curiosity, Creativity, and Inspiration Now**

### Homepage Cards (PlatformGrid.astro) — only 4 shown

Cards: Housing, Medicare for All, Green Jobs, Democracy. Each card has:
- `data-accent="<plank>"` attribute (housing/healthcare/economic/democracy) — currently unused for styling but present for future per-card theming
- Inline SVG icon
- `<h3 class="card-title" data-i18n="platform.{plank}.title">`
- `<p class="card-desc" data-i18n="platform.{plank}.desc">`
- `.card-accent-line` that fills on hover

i18n keys: `platform.housing.title`, `platform.healthcare.title`, `platform.economic.title`, `platform.democracy.title` (and `.desc` for each).

### Full Platform Page (PolicyGrid.astro) — all 7 in 2-col grid

Each block has `id="<slug>"` for deep-linking (`/platform#housing`, etc.). Slugs: `housing`, `healthcare`, `economic`, `immigration`, `democracy`, `education`, `foreign-policy`.

Grid layout is hand-tuned so visual rows balance:
- **Row 1:** Housing (3 ¶) + Medicare (2 ¶) — both long
- **Row 2:** Green Jobs (2 ¶) + Democracy (1 long ¶)
- **Row 3:** ICE (1 ¶) + Education (1 ¶)
- **Row 4:** Foreign Policy — `.policy-block-wide` with `grid-column: 1 / -1` (full width)

If you add or remove a plank, **rebalance the row pairings** or one column will become much taller than the other.

i18n keys: `issues.{slug}_title`, `issues.{slug}_desc` (note underscore, not nested object — different style from `platform.*`).

### Multi-Paragraph Translation Convention

PolicyGrid blocks with more than one paragraph use numbered keys: `issues.housing_desc`, `issues.housing_desc2`, `issues.housing_desc3` for Housing's three paragraphs; `issues.healthcare_desc` + `_desc2` for Medicare; `issues.economic_desc` + `_desc2` for Green Jobs. Single-paragraph blocks (Immigration, Democracy, Education, Foreign Policy) just use `issues.{plank}_desc`. Add a `_descN` key for every new paragraph you introduce.

### Updating Platform Copy — Triple-Sync Required

If you change any plank title or description:
1. Edit the `.astro` file (PlatformGrid for homepage, PolicyGrid for platform page)
2. Edit the matching key in [src/i18n/en.json](src/i18n/en.json) — **note `platform.*` is nested objects, `issues.*` is flat with underscores**
3. Edit the matching key in [src/i18n/es.json](src/i18n/es.json)
4. **If a title appears in both PlatformGrid and PolicyGrid (e.g. Housing), you have to update both `platform.housing.title` AND `issues.housing_title`.**

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

### Footer Social Icons

Five accounts in this exact order: X, Instagram, Facebook, TikTok, YouTube. Each is an inline SVG with `aria-label`. Hover background goes orange. See **Social Media Accounts** section for URLs.

---

## Links Page (Linktree-Style)

[src/pages/links.astro](src/pages/links.astro) is a self-contained Linktree replacement linked from social bios.

### Important Notes

- **Uses `<Layout>`** — so it inherits Layout's PetitionModal, scroll observer, and i18n init script. (The previous design.md said it bypasses Layout — that's wrong; it just omits Navbar and Footer.)
- **No i18n** — every string is hardcoded English by design.
- **Internal links open in `target="_blank"`** — this is intentional because the page is meant for social-bio link clicks where opening a new tab is the expected behavior.

### Page Structure

```
.links-bg (fixed gradient: dark blue → black)
.links-container (max-width 480px, centered)
├── .links-header     (logo, "Byron Sigcho-Lopez", tagline)
├── .links-video      (YouTube embed — same video ID as hero, ouSFDZfJu-E)
├── .links-list       (5 link cards: home, donate, volunteer, platform, movement)
├── .links-socials    (5 round social buttons)
├── .links-divider    ("Join the Movement" with horizontal rules)
├── .links-form-wrap  (clipboard with RaiseMore iframe)
└── .links-footer     ("Paid for by..." line)
```

The `.link-card-donate` uses an orange-tinted gradient background to stand out from the other cards.

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

The form POSTs to a Google Form endpoint (see "Forms & Embeds" below). On submit the script waits 500 ms, hides the form, shows the success message for 3 seconds, then closes the modal and resets the form.

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

After submit, the form resets and the success message shows for 5 seconds.

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
| `/` | `#hero`, `#meet`, `#platform`, `#anointment` |
| `/platform` | `#platform-hero`, `#issues`, `#housing`, `#healthcare`, `#economic`, `#immigration`, `#foreign-policy`, `#democracy`, `#education`, `#unbought` |
| `/meet` | `#meet-hero`, `#early-life`, `#ward-record`, `#elected-by-the-people`, `#family` |
| `/movement` | `#machine-hero`, `#the-movement`, `#the-machine`, `#ballot-fight` |
| `/volunteer` | `#volunteer-hero`, `#petition-blitz`, `#ways-to-fight`, `#signup` |
| **Global** | `#petition` — **does NOT scroll**; opens Petition Modal |

Treat `#petition` as a reserved sentinel — never use it as an actual anchor target.

---

## Sticky Elements

Two desktop-only sticky behaviors to be aware of:

| Element | File | Sticky offset |
|---|---|---|
| `.movement-image-stack` (image + pull-quote stack) | [src/components/machine/MovementSection.astro](src/components/machine/MovementSection.astro) | `top: calc(var(--nav-height) + var(--space-xl))` |
| `.signup-text` (form headline column) | [src/components/volunteer/SignupForm.astro](src/components/volunteer/SignupForm.astro) | `top: calc(var(--nav-height, 80px) + var(--space-xl))` |

Both fall back to `position: static` at `≤1024px` (when the grid collapses to one column). If you change the grid breakpoint, change the sticky breakpoint too — otherwise sticky elements will overlap stacked content.

---

## Responsive Breakpoints

The codebase uses three breakpoints consistently:

| Breakpoint | Behavior |
|---|---|
| `max-width: 1024px` | `.hide-mobile` hides; multi-col grids collapse to 1- or 2-column; container padding bumps to `--space-xl` |
| `max-width: 768px` | Phone layout; everything stacks to single column; section padding reduces to `--space-3xl`; container padding back to `--space-lg`; sub-page heroes switch parallax → scroll |
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

The site deploys to GitHub Pages at `/BSL-for-Congress/`. **All paths must respect the base URL.**

```js
// In every .astro frontmatter:
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// In templates:
<a href={`${base}/platform`}>
<img src={`${base}/images/sketch.png`}>
```

The `replace(/\/$/, '')` strips a trailing slash so concatenation always produces clean paths. The base is also exposed on `<body data-base={base}>` if a script needs it client-side.

**Never hardcode `/images/...` or `/platform`** — they will 404 on GitHub Pages. Always use `${base}/...`.

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
| `Chuy Garcia.jpeg` | AnointmentBanner | **⚠️ filename has a SPACE** — needs URL encoding if referenced anywhere new; in the existing template it works because Astro normalizes the path |
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
| X (Twitter) | @BSLForCongress | `https://x.com/BSLForCongress` |
| Instagram | bslforcongress | `https://www.instagram.com/bslforcongress/` |
| Facebook | BSLForCongress | `https://www.facebook.com/BSLForCongress/` |
| TikTok | **@sigchofor25** | `https://www.tiktok.com/@sigchofor25` ← different naming convention |
| YouTube | @BSLforCongress | `https://www.youtube.com/@BSLforCongress` |

**Note**: TikTok handle is `sigchofor25`, not `bslforcongress`. If you need to update social links, search for these URLs across `Navbar.astro`, `Footer.astro`, and `links.astro` — there are 3 sets of icons that should stay in sync.

---

## External Services Reference

| Service | URL / ID | Where |
|---|---|---|
| ActBlue donation | `https://secure.actblue.com/donate/byronfor04web/` | Navbar, Footer ticker, all CTA blocks, Links page |
| RaiseMore signup form | `https://www.raisemore.app/forms/signup/org_3CzwGfMfnK1106k0fBTvwYbnDKI?horizontal=false` | Footer + Links clipboards |
| Google Form (Petition) | ID `1FAIpQLSeYiVz1TB2tsAFdh1OakH62dM7XGCNBnaJz57Mn1beP0dqE6A` | PetitionModal |
| Google Form (Volunteer) | ID `1FAIpQLSeUKnQVp4auTqHdFZeDrGlAOYAjmOO0sE19Xm11Pee2ayuuWQ` | volunteer/SignupForm |
| YouTube hero / links video | Video ID `ouSFDZfJu-E` | Hero (autoplay muted bg + sound toggle) + Links page |
| External news link | Chicago Tribune article on IL-04 anointment | AnointmentBanner CTA |

---

## Z-Index Hierarchy

| Element | z-index |
|---|---|
| `.petition-modal-overlay` | 9999 |
| `.mobile-drawer` | 9999 |
| `.navbar` | 9998 |
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
  site: 'https://awaisqazi.github.io',
  base: '/BSL-for-Congress',
});
```

The `base` path drives every `${base}/...` reference. If you ever move to a custom domain at the root, drop or change `base` and audit the codebase for any hardcoded `/BSL-for-Congress/` strings.

---

## Common Pitfalls Checklist

Run through this before you ship a change:

- [ ] **i18n triple-update** — Did you update the `.astro` HTML, [src/i18n/en.json](src/i18n/en.json), AND [src/i18n/es.json](src/i18n/es.json)? Missing es keys silently render `undefined`.
- [ ] **i18n nested vs flat keys** — Homepage `platform.{plank}.title` is nested objects; full-platform `issues.{plank}_title` is flat with underscores. Don't mix them.
- [ ] **Inline HTML inside `data-i18n` element?** Won't survive `textContent` overwrite. Move it to a sibling element.
- [ ] **PolicyGrid multi-paragraph?** Only ¶1 has `data-i18n`; ¶2/¶3 are static English. Add new keys if you need them translated.
- [ ] **Sketch language swap** — Did you update both `data-src-en` and `data-src-es` if you changed the footer image?
- [ ] **Base URL** — All internal links and image `src` values use `${base}/...`?
- [ ] **Petition link reserved** — You did NOT use `href="#petition"` for an actual anchor target?
- [ ] **Anchor-IDs unchanged** — If you renamed a section ID, did you grep for inbound links (especially the `/platform#<plank>` deep links)?
- [ ] **Platform consistency** — If you updated PlatformGrid (homepage), did you also check PolicyGrid (`/platform`) for the same plank? They share the candidate's verbatim text.
- [ ] **Mobile responsive** — Tested at 1024 and 768 breakpoints? Sticky columns disabled?
- [ ] **Scroll-animation** — New blocks have `class="animate-in"`?
- [ ] **Section-bg rhythm** — Alternates cream / cream-light / blue / blue-deeper between adjacent sections?
- [ ] **Build clean** — `npx astro build` succeeds with no errors?
- [ ] **Google Form `entry.NNNN` IDs** — If you added a form field, the ID matches the actual Google Form question ID? (Wrong ID = silent data loss.)
- [ ] **Three sets of social icons** — If you updated a social URL, you updated it in Navbar, Footer, AND Links?
- [ ] **YouTube video** — If you changed the hero video, you updated **both** the iframe `src` AND the `playlist=` query param (so the loop works)?
- [ ] **OG image** — Layout.astro hardcodes `/images/hero-rally.jpeg` for every page; that file still exists if you removed the homepage hero image?
- [ ] **No em-dashes** — Copy should use regular dashes (` - `), not em-dashes (`—`). Check `.astro`, `en.json`, and `es.json`.
