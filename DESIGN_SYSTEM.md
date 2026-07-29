# Myndstack — Design System

The canonical reference for the site's look and feel. **Source of truth for
values is `@theme` in [app/globals.css](app/globals.css); this doc is the map.**
It was reconciled against the original Claude Design handoff ("Myndstack
marketing site" design brief) — every token below matches that brief, plus the
type-scale / primitive refinements the codebase has since added.

> Before writing new CSS, reach for an existing token or primitive here. New
> arbitrary values (`text-[13.5px]`, one-off hex, ad-hoc section padding) are
> the drift this system exists to prevent.

---

## Brand in one line

Dark, monochrome **ink** with a single **electric-lime** accent. Engineered and
crisp: **sharp corners everywhere** (radius 0), 1px hairline separation over
soft shadow, one 45° angular-clip motif, and calm, short motion on one easing
curve. Typographic — no photography.

---

## Colors

All are `@theme` tokens → Tailwind utilities (`bg-ink`, `text-t4`, `border-line`,
`text-lime`, …). Never inline a raw hex that a token already covers.

**Ink / surfaces** — `--color-ink #0A0A0B` (page) · `--color-true-black #000` ·
`--color-surface #101012` · `--color-surface-2 #111113` · `--color-surface-3 #151517` (raised cards).

**Hairlines** — `--color-line #1F1F23` (default) · `--color-line-2 #26262B` · `--color-line-3 #2E2E34` (stronger).

**Text ramp** (bright → dim) — `--color-t1 #F4F4F6` · `t2 #E2E2E6` · `t3 #C7C7CE` ·
`t4 #9A9AA2` · `t5 #83838C` · `t6 #6B6B73` · `t7 #45454D` · `t8 #3A3A40`.
**Rule:** real body copy never goes below `t4` for contrast; `t5` is the floor
for secondary/meta; `t6–t8` are decorative/hairline only (aria-hidden markers,
large marquee lockups).

**Accent lime** — `--color-lime #C9F24D` (primary) · `-hover #B4E22F` ·
`-ink #18230A` (ink ON lime) · `-ink-2 #3D5010` / `-ink-3 #2E3D08` (muted/body on lime) ·
`-aa #6E8E12` (AA-safe lime for text on light) · `-edge rgba(201,242,77,.45)` (hover borders).
`--color-danger #FF7A6B` is the only error tone.

**No gradients as a brand device** — only subtle transparent lime sweeps/scrims
(the aurora, field glows, scanline).

---

## Typography

Fonts (via `next/font`): **Space Grotesk** = display/headings (`--font-display`),
**Hanken Grotesk** = body/UI (`--font-body`), **Space Mono** = eyebrows/labels/code (`--font-mono`).

**Type scale** — named `@theme` steps; stop hand-rolling `text-[NNpx]`:

| Utility / class | Size | Use |
| --- | --- | --- |
| `text-caption` | 13px | mono labels, meta, notes (never prose) |
| `text-body-sm` | 15px | dense body, card copy — **the floor for real content** |
| `text-body` | 16px | default body |
| `text-lead` | 17→21px clamp | section ledes, band subheads |
| `.eyebrow` | 12px mono, 0.14em, lime, uppercase | the section kicker — used everywhere, no overrides |
| `.label-mono` | 10.5px mono, 0.12em, t5, uppercase | micro labels |
| `.h3-card` | 19px display 600 | card / tier / member titles |
| `.h2-section` | clamp(29px,5vw,44px) display 700 | **every section heading** |
| `.h1-statement` | clamp(30px,4.6vw,50px) display 500 | the one sanctioned oversized statement (Manifesto) |

Two deliberate display exceptions above `.h2-section`: the **Hero H1**
(`clamp(42px,7.2vw,92px)`, line-height 1.0) and the **StackStory** signature
(`clamp(42px→76px)`). Everything else is `.h2-section`.

Tracking: display `-0.02` to `-0.03em`, `text-wrap: balance`. Body 1.6
line-height, `text-wrap: pretty`. Mono uppercase 0.12–0.22em.

---

## Spacing & layout

- Max content width **1200px** (`max-w-[1200px]`); narrow measure 900px (Faq).
- Horizontal gutter **56px** desktop → **20px** mobile (`px-5 sm:px-14`).
- **Section vertical rhythm: 88px top / 48px bottom** — `--spacing-section: 5.5rem`
  → use `pt-section pb-12`. Every body section goes through
  [components/Section.tsx](components/Section.tsx); hand-rolled bands match the
  same rhythm. (Gutters reduce on mobile; section rhythm does not.)
- 8px-based spacing throughout.

---

## Shape & elevation

- **Sharp corners, radius 0, everywhere.** The only exceptions are documented:
  `BackToTop` (circle) and `SocialIcon` (Instagram's faithful logo). Do not add
  `rounded-*`.
- **45° angular clip** — the signature motif, `@utility clip-angular-*`
  (`clip-angular-26` cards, up to `-40` bands). Reveal-driven: the corner slices
  open as the element enters. Two documented sizes — card vs band.
- **Separation is a 1px hairline** (`border-line`), not a soft shadow.
- **Elevation scale** (`@theme`, applied via `.card-lift`): `--shadow-card` ·
  `--shadow-card-hover` · `--shadow-float`. Sharp corners + real elevation is the
  premium tell — don't reach for radius to get depth.
- **Focus ring:** `2px solid var(--color-lime)`, offset 2px (`:focus-visible`).

---

## Motion

- One easing: `--ease-brand cubic-bezier(0.2, 0, 0, 1)`. No bounce.
- Durations 120–320ms; translate ≤4px or scale .955→1.
- Reveal-on-scroll via [components/Reveal.tsx](components/Reveal.tsx) +
  `useInView` — opacity 0→1, `translateY(24px)`→0, 0.7s. Stagger children in a
  grid; single reveal for a block.
- **All scroll work goes through [lib/scroll.ts](lib/scroll.ts)** — one rAF
  listener, no `setState` and no layout reads in a scroll frame.
- **`prefers-reduced-motion`** kills particles, spotlight, headline cycle,
  marquee, testimonial autoplay, and near-zeroes durations (`useReducedMotion`).

---

## Primitives (reach for these first)

**CSS component classes** (in `@layer components`, [app/globals.css](app/globals.css)):
`.eyebrow` · `.label-mono` · `.h2-section` · `.h3-card` · `.h1-statement` ·
`.card` + `.card-lift` (hover) · `.chip` · `.btn` + `.btn-lime` / `.btn-outline` /
`.btn-icon` · `.ms-field` (inputs + `select.ms-field`) · `.legal-prose` ·
`.bill-btn` · `.clip-angular-*` · `.tile-field*`.

**CTA convention:** one primary (`.btn btn-lime`) and one secondary
(`.btn btn-outline`). The lime CTA band inverts (`bg-lime-ink` on lime) — a
contextual variant, not a new button.

**React primitives** (`components/`): `Section` (rhythm + width + scanline) ·
`SectionHeader` (eyebrow + `.h2-section` + optional aside/lede) · `Reveal`
(scroll reveal) · `Check` (feature-list checkmark — **use this, never a `▸`
glyph**) · `Magnetic` · `CountUp`.

**Directional arrows** are `→` (e.g. "Start a project →"); list bullets are the
`Check` SVG; "missing / con" markers are a muted `—`.

---

## Abstract visual grammar

The engineered texture, all lime-over-ink, all reduced-motion-aware:

- **Aurora** (`Aurora`, `.aurora`) — one soft continuous gradient behind the
  StackStory→Team run. No grid, no dots.
- **Section field** (`SectionField`, `.field*`) — blueprint grid (46px, white
  0.045) + drifting lime glows + travelling "signals" canvas. StackStory only.
- **Tile field** (`TileField`, `.tile-field*`) — a *static* echo of the field
  (grid + glow + sparse signal net) for bento tiles whose copy doesn't fill the
  space. Cheap, no per-tile canvas.
- **Scanline** (`Scanline`, `.scanline`) — a lime hairline sweeps a section's top
  edge on first entry.
- **Blueprint grid** — the masked grid panel behind Careers.
- **Cursor spotlight** (`CursorSpotlight`) — desktop-only low-alpha lime glow.

---

## Page structure (scroll order)

Hero → LogoMarquee (single trust band) → [aurora: StackStory · Capabilities
(bento) · Integrations · SelectedWork · Process · StatsStrip · Contrast ·
Manifesto · Testimonials · Pricing · Team] → Careers → Faq → CtaBand →
ContactForm → Footer. Fixed chrome: `Nav` (morphing capsule — **do not touch its
geometry / `contain: layout`**), `ProgressSpine`, `Loader`, `BackToTop`,
`MobileDrawer`.

---

## Where truth lives

- **Tokens + primitives:** `@theme` and `@layer components` in [app/globals.css](app/globals.css).
- **Structure/routing kept in code** (not CMS): `NAV_LINKS`, `STACK_LAYERS`,
  `INTEGRATIONS`, `LEGAL_LINKS`, `FOOTER_COLUMNS` in [lib/content.ts](lib/content.ts).
- **Editable copy:** Sanity via [lib/sanity/queries.ts](lib/sanity/queries.ts).
- **Working rules:** [AGENTS.md](AGENTS.md) / [README.md](README.md).
