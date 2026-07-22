# Myndstack

Marketing site for Myndstack — enterprise AI & cognitive infrastructure.
Ported from the `Myndstack.dc.html` design reference into Next.js.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — design tokens live in `@theme` in [globals.css](app/globals.css)
- **next/font/google** — Space Grotesk (display), Hanken Grotesk (body), Space Mono (labels)
- **Resend** + **zod** for the three forms

```bash
npm install
cp .env.example .env.local   # then fill in RESEND_API_KEY
npm run dev                  # http://localhost:3000
npm run build && npm start
```

`npm run build` writes to `.next-build`, not `.next`, so you can build while the
dev server is running. (They shared a directory originally, and building would
corrupt the dev server's chunks until you restarted it.)

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static | The 17-section scrolling page |
| `/careers` | Static | Role listing |
| `/careers/[slug]` | SSG | One page per role, with an application form and `JobPosting` JSON-LD |
| `/privacy`, `/terms`, `/security` | Static | Long-form legal, with a sticky section index |
| `/api/contact`, `/api/newsletter`, `/api/apply` | Dynamic | Form handlers |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image` | Static | Generated |

Legal pages are three real segments rather than `/[slug]`, which would otherwise
swallow every unknown path and stop `/careers` resolving cleanly.

## Layout

```
app/
  layout.tsx           fonts, metadata, JSON-LD, chrome (loader, spine, nav, spotlight, back-to-top, footer)
  page.tsx             the 17 sections, in scroll order
  globals.css          design tokens (@theme) + component primitives
  api/                 contact · newsletter · apply
components/            one file per section, plus shared Reveal / Section / SectionHeader / Field
lib/
  content.ts           homepage copy and data
  roles.ts legal.ts    content for the sub-pages
  scroll.ts            the single rAF-throttled scroll loop
  hooks.ts             useReducedMotion, useScrollFrame, useReveal, useInView
  schemas.ts           zod schemas, shared by client and route handlers
  form-shared.ts       the zod-free half of the form contract (see below)
  form-route.ts mail.ts rate-limit.ts
```

### Scroll handling

The spine fill, nav morph, scroll-spy, back-to-top ring and the pinned stack story
all subscribe to **one** listener in [lib/scroll.ts](lib/scroll.ts). Subscribers mutate
styles and classes directly inside the frame — they never call `setState`, so scrolling
does not re-render the tree. The stat count-ups follow the same rule.

### Forms

Client and server validate with the same zod schemas, but the client
**dynamic-imports them at submit time** — zod is ~16 kB of first-load JS on a page
where most visitors never touch a form. Anything needed before that (the honeypot
field name, the response type) lives in `form-shared.ts`, which has no zod import.

Each route runs rate limit → parse → validate → honeypot → send. The rate limiter is
an in-process sliding window (5/min per IP): per-instance and reset by cold starts,
which is the right trade here — swap the `Map` in `lib/rate-limit.ts` for Upstash if
you ever need it exact.

Without `RESEND_API_KEY` submissions are logged to the server console in development
and **rejected in production**, so a missing key surfaces immediately instead of
silently dropping leads.

### Nav morph

The bar → capsule transition is driven by latched state in [Nav.tsx](components/Nav.tsx),
not bare threshold comparisons:

- **Hysteresis** — the capsule engages above 90px and releases below 50px. A single
  boundary meant scrolling around it restarted the whole morph every few pixels.
- **A travel accumulator** decides hiding/showing, not instantaneous scroll direction,
  so trackpad momentum can't flip it back and forth. It takes 90px of sustained
  downward scroll to hide and 40px upward to bring it back.

On the CSS side the vertical offset rides on `transform` rather than `top`, `width` is
explicit in both states (`auto → <length>` is not animatable, so it used to snap), and
both backgrounds are gradients with matching stop structure so the colour interpolates
instead of cutting.

### Tests

`npm test` runs Vitest over the pure logic in `lib/` — no DOM, no jsdom:

- `nav-state` — the bar/capsule/hidden reducer, including the hysteresis dead band
  and momentum-wobble immunity that regressed twice while this was a component-local ref.
- `format` — the metric parser (must round-trip the authored string exactly),
  JSON-LD escaping, and the mail-header sanitiser.
- `rate-limit` — the sliding window and the X-Forwarded-For hop selection.
- `form-shared` — field-error flattening and the contact schema.

Anything that needs a real viewport (scroll choreography, WebGL, the reveal
observers) is deliberately not covered here.

### Breakpoints

The default Tailwind scale is replaced with the design's own stops:
`xs` 560px · `sm` 760px · `md` 1000px · `lg` 1100px · `xl` 1280px.

### Hero network (WebGL)

[HeroNetwork.tsx](components/HeroNetwork.tsx) renders the constellation on the GPU
in raw WebGL — no three.js, about 4 kB of the bundle. Nodes drift and link exactly
as the 2D original did, plus what canvas couldn't afford: several times the node
count, per-node depth parallax, and lime signals that route themselves hop by hop
along real links. Hovering a hero CTA fires a burst through the network.

Links are found with a per-frame counting-sort spatial hash rather than an all-pairs
scan, so cost is roughly linear in node count. One interleaved vertex buffer is
allocated once and refilled with `bufferSubData`. Output is **premultiplied alpha** —
the canvas is transparent over the page, and unpremultiplied output makes the
compositor wash the whole link mesh out.

It falls back to the 2D [ParticleField](components/ParticleField.tsx) where WebGL is
unavailable, and renders nothing below 760px or under reduced motion.

### Reveal watchdog

Reveals are what make most of the page visible, so if `IntersectionObserver` never
delivers a callback the site renders blank. [hooks.ts](lib/hooks.ts) probes it once;
if nothing arrives within 1.5s it abandons scroll reveals and shows everything.

### Reduced motion

`prefers-reduced-motion: reduce` drops the loader, particle field, cursor spotlight,
headline cycle, magnetic CTAs, stat count-ups, testimonial autoplay, view transitions
and the word-by-word manifesto, and collapses transition durations. Reveal animations
are also forced open under `<noscript>`.

## Changes made on top of the reference

Three of these are bug fixes; the fourth is a visible design change.

- **Scroll-spy order.** The reference picked the active section by iterating its
  nav-order id list and keeping the last match — but the nav lists *Work* before
  *Services* while the page renders *Services* first, so scrolling into Selected Work
  highlighted "Services". [Nav.tsx](components/Nav.tsx) compares element positions instead.
- **Wordmark viewBox.** `myndstack-wordmark-*.svg` shipped with a 1000×1000 viewBox
  while the mark only occupied `100,240 → 902,762`, so the reference's `height: 22px`
  drew an ~18×11px logo lost in padding. Tightened to the ink bounds; it now renders
  34×22px. The untouched originals are in the design handoff zip, not this repo.
- **Nav links are root-relative** (`/#work-cases`), so the nav still works from
  `/careers` and the legal pages.
- **The nav overlays the page instead of sitting in flow.** As `position: sticky`
  it occupied layout, which pushed the hero canvas down and left an isolated black
  bar across the top of the network. It is now `fixed`, with a vertical scrim
  (continued past its own box by `.nav::after`) instead of a flat fill and a hairline
  border, so the particle field runs unbroken behind it. Everything that is not the
  hero pads past it with `--nav-height`.
- **Two lime border weights.** Solid `--color-lime` means *this is deliberate* —
  a selected state (stack layers, the With-Myndstack panel, the Scale tier) or an
  action you can take (secondary buttons, icon buttons). `--color-lime-edge`
  (lime at 45%) is the transient hover affordance on cards and rows. The rule is
  weight, not presence: permanent gets solid, momentary gets 45%.
- **Grey ramp lifted for contrast.** `t5` was `#6B6B73` — 3.75:1 on the ink
  background, below the 4.5:1 AA floor, and used for form labels, metric captions and
  footer headings. `t5` is now `#83838C` (5.3:1) and the old value moved down to `t6`,
  which is decorative only. `t7`/`t8` stay below AA deliberately: they only carry
  ornament ("SCROLL ↓", "FOLLOW") and the manifesto's pre-brighten state.
  **This is a visible change from the reference** — small grey text is lighter.

## Before going live

- **Legal copy is a starting draft.** `lib/legal.ts` is written for a services company
  but has not been through counsel. Review it and update `LAST_UPDATED`.
- **Verify a sending domain in Resend** and set `CONTACT_FROM_EMAIL` to an address on
  it — the default `onboarding@resend.dev` is for testing only.
- **Social profile URLs** in the progress spine still point at `#contact`.
- **Placeholder content:** client names, case-study metrics, team members and
  testimonials are from the design reference.
- **Analytics are off unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.** Nothing is loaded
  otherwise, so there is no consent banner to manage.
- **The loader costs you LCP.** It covers the viewport for ~1.65s by design, so
  lab tools will report LCP after it clears. Measured CLS is ~0.000. If Core Web
  Vitals matter more than the entrance, shorten `FADE_AT_MS` in
  [Loader.tsx](components/Loader.tsx) or drop the component from the layout.
