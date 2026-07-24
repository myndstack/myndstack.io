# Myndstack

Marketing site for Myndstack — enterprise AI & cognitive infrastructure.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — design tokens live in `@theme` in [globals.css](app/globals.css)
- **next/font/google** — Space Grotesk (display), Hanken Grotesk (body), Space Mono (labels)
- **Resend** + **zod** for the three forms
- **Sanity** for editable content (roles, case studies, homepage copy) — see
  [Content](#content)

```bash
npm install
cp .env.example .env.local   # then fill in RESEND_API_KEY
npm run dev                  # http://localhost:3000
npm run build && npm start

npm test                     # unit tests (pure logic in lib/)
npm run test:e2e             # Playwright smoke, against a production build
```

`npm run build` writes to `.next-build`, not `.next`, so you can build while the
dev server is running. (They shared a directory originally, and building would
corrupt the dev server's chunks until you restarted it.) On Vercel that trick is
unnecessary, so it builds to the standard `.next` — see [DEPLOYMENT.md](DEPLOYMENT.md)
for the full hosting runbook (env matrix, the Preview mail-transport trap, DNS).

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static | The 17-section scrolling page |
| `/work` | Static | Case study index |
| `/work/[slug]` | SSG | One page per case study, with `Article` JSON-LD |
| `/careers` | Static | Role listing |
| `/careers/[slug]` | SSG | One page per role, with an application form and `JobPosting` JSON-LD |
| `/privacy`, `/terms`, `/security` | Static | Long-form legal, with a sticky section index |
| `/api/contact`, `/api/newsletter`, `/api/apply` | Dynamic | Form handlers |
| `/api/revalidate` | Dynamic | Sanity publish webhook — signature-checked, `revalidateTag` |
| `/api/health` | Dynamic | Mail readiness — 200 `{ok,deliverable}`, 503 when misconfigured |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` | Static | Generated |
| `/opengraph-image`, `/work/[slug]/opengraph-image`, `/careers/[slug]/opengraph-image` | Static | Social cards, all from `components/OgCard.tsx` |

Legal pages are three real segments rather than `/[slug]`, which would otherwise
swallow every unknown path and stop `/careers` resolving cleanly.

## Layout

```
app/
  layout.tsx           fonts, metadata, JSON-LD, chrome (loader, spine, nav, spotlight, back-to-top, footer)
  page.tsx             the 17 sections, in scroll order
  globals.css          design tokens (@theme) + component primitives
  api/                 contact · newsletter · apply · revalidate (Sanity webhook)
components/            one file per section, plus shared Reveal / Section / SectionHeader / Field
lib/
  content.ts           homepage copy and data (seeds Sanity; see Content)
  cases.ts roles.ts legal.ts   content for the sub-pages
  sanity/              read client, GROQ queries (zod-validated), cache tags
  hubspot.ts audience.ts       optional integration sinks
  scroll.ts            the single rAF-throttled scroll loop
  scroll-spy.ts        which section is current, as pure arithmetic
  loader-seen.ts       the once-per-session intro contract, shared server/client
  hooks.ts             useReducedMotion, useScrollFrame, useReveal, useInView
  schemas.ts           zod schemas, shared by client and route handlers
  form-shared.ts       the zod-free half of the form contract (see below)
  mail-config.ts       how mail leaves the process, as a pure function of env
  form-route.ts mail.ts rate-limit.ts
sanity/                Studio schemas, desk structure, env (standalone Studio)
sanity.config.ts sanity.cli.ts   Studio + CLI config (run separately, not in Next)
scripts/seed-sanity.ts   one-time import of the lib/ constants into Sanity
```

### Scroll handling

The spine fill, nav morph, scroll-spy, back-to-top ring and the pinned stack story
all subscribe to **one** listener in [lib/scroll.ts](lib/scroll.ts). Subscribers mutate
styles and classes directly inside the frame — they never call `setState`, so scrolling
does not re-render the tree. The stat count-ups follow the same rule.

One listener is not by itself enough — what it *does* per frame matters as much:

- **The frame does no layout reads.** It reads `window.scrollY` and nothing else.
  Document height lives in a cache refreshed by a `ResizeObserver`, the nav's
  section offsets are cached `offsetTop` values, and the stack story caches its
  own `offsetTop`/`offsetHeight`. Measuring in the frame is what made a phone
  stutter: `scrollHeight` once, then a `getBoundingClientRect()` per spied
  section, each of them landing *after* the nav had written a class — about six
  forced synchronous layouts per frame.
- **Reads and writes are separate phases.** A subscriber can register
  `{ read, write }` instead of a bare function; every read runs before any
  write. Nothing needs it today, which is the point — it means a subscriber that
  has to measure can be added without quietly reintroducing the interleaving.
- **Writes stay off layout properties.** The spine drives `scaleY`/`translateY`
  rather than `height`/`top`, so its 120ms transition is a compositor job rather
  than a layout and a paint on every frame.

Cache invalidation is one `ResizeObserver` on `document.body` per consumer, plus
`document.fonts.ready` — a font swap moves every section on the page.

`content-visibility: auto` on the below-fold sections was tried and removed; the
comment above `mask-edges` in [globals.css](app/globals.css) records the
measurements and why it lost.

### Forms

Client and server validate with the same zod schemas, but the client
**dynamic-imports them at submit time** — zod is ~16 kB of first-load JS on a page
where most visitors never touch a form. Anything needed before that (the honeypot
field name, the response type) lives in `form-shared.ts`, which has no zod import.

Each route runs rate limit → parse → validate → honeypot → send. The rate limiter is
an in-process sliding window (5/min per IP): per-instance and reset by cold starts,
which is the right trade here — swap the `Map` in `lib/rate-limit.ts` for Upstash if
you ever need it exact.

### Content

> **Full operator + developer guide: [SANITY.md](SANITY.md)** — access, tokens,
> running/deploying the Studio, editing each content type, data backup/import,
> adding fields, and troubleshooting. The summary below is the architecture.

Editorial content — the careers **roles**, the **case studies**, and most of the
homepage (testimonials, team, FAQ, pricing, capabilities, process, stats,
contrast, manifesto, client lockups, hero eyebrow/subhead/CTA, site settings) —
lives in **Sanity** so it can change without a deploy. Pages fetch it in
`lib/sanity/queries.ts`, which validates every response with zod at the boundary
(server-only, so it costs the first-load bundle nothing) and returns the *same*
`Role` / `CaseStudy` / `PricingTier` shapes the components already used — the
migration is a change of source, not of contract.

**What deliberately stays in code, because it is structure rather than copy:**

| In code | Why |
| --- | --- |
| `NAV_LINKS` / `SPY_IDS` | Their `section` values must equal element ids the components render — a CMS typo would silently kill the scroll-spy. |
| `STACK_LAYERS` | The pinned stack animation's geometry is written against exactly four layers. |
| Hero **headline** words | The word-cycle animation and its hard line break are written against that exact array. Its eyebrow/subhead/CTA copy *did* move. |
| `lib/legal.ts` | Long-form legal that goes through counsel, not a marketing edit. |
| `FOOTER_COLUMNS`, `LEGAL_LINKS` | Route wiring, not copy. |

**How edits reach the live site.** The content pages render **dynamically** —
each request reads Sanity fresh ([lib/sanity/client.ts](lib/sanity/client.ts)
uses `cache: "no-store"`, and `/`, `/careers`, `/work` and the `[slug]` pages are
dynamic). A published edit therefore shows on the **next page load**, always. No
webhook, no revalidate secret, nothing to configure.

This is deliberately *not* ISR (statically prerendered pages that regenerate on a
timer/tag). That was built first — cache tags + a `revalidateTag` webhook + a 60s
floor — and it worked in the build but **not on this Vercel deployment**: the
prerendered pages never regenerated (the `age` header climbed forever; edits
never surfaced via tag or time). Rather than fight the platform, the pages read
uncached. React `cache()` in [queries.ts](lib/sanity/queries.ts) still dedupes
repeated reads within a single render, so a page is a handful of Sanity calls,
not one per component. The traffic here is well within Sanity's limits; if it
ever isn't, reintroduce a short cache.

[`/api/revalidate`](app/api/revalidate/route.ts) and `SANITY_REVALIDATE_SECRET`
remain in the tree (signature-verified, working) but are **inert** with dynamic
rendering — kept only so the caching path can be restored if Vercel ISR is later
confirmed working. You can delete the Sanity webhook and the secret; nothing
depends on them.

**The Studio is standalone**, not embedded at `/studio`. Sanity v5's Studio UI
imports React's `useEffectEvent`, which Next 15.5's compiled-react shim predates,
so an embedded route won't compile — and forcing webpack to the real React breaks
Next's server renderer. Running Studio via the Sanity CLI sidesteps all of it and
keeps the Studio UI out of the marketing bundle. Editors use its
`*.sanity.studio` URL:

```bash
npm run studio:dev           # local Studio at http://localhost:3333
npm run studio:deploy        # publish to <studioHost>.sanity.studio
```

Two Studio notes, both from real breakage:

- **Node.** The repo pins Node `22.x` (`engines`). Sanity's CLI bundles a
  Rolldown-based Vite whose dev HMR crashes on Node ≥26 (`Missing field
  moduleType`). [sanity.cli.ts](sanity.cli.ts) disables HMR so `studio:dev` runs
  anyway — the only cost is that a change to a *schema file* needs a manual
  browser refresh (content edits are live-updated by the Studio itself). The
  production `studio:build`/`deploy` path is unaffected. On Node 22 none of this
  applies.
- **PostCSS.** [sanity.cli.ts](sanity.cli.ts) also hands Vite an empty inline
  PostCSS config, or it would try to load the Next app's root
  `postcss.config.mjs` (Tailwind v4, in a form Vite can't parse) and crash.

**First-time setup / re-seeding.** The initial content is imported from the
`lib/` constants — nothing is retyped, and an identical render afterwards is the
proof the schema is faithful:

```bash
# 1. create a Viewer + an Editor token at sanity.io/manage (project e3tbagdk)
# 2. fill SANITY_API_WRITE_TOKEN in .env.local
npm run seed                 # idempotent — createOrReplace, safe to re-run
```

Revoke the write token afterwards; nothing reads it at runtime.

### Mail configuration

[mail-config.ts](lib/mail-config.ts) resolves one of three states from the environment,
as a pure function so the rules are unit-tested rather than discovered in production:

| State | Forms | Reaches a person | `/api/health` | At boot |
| --- | --- | --- | --- | --- |
| `deliverable` | succeed | yes | 200 `deliverable:true` | silent |
| `logging` | succeed | **no** | 200 `deliverable:false` | warns in production |
| `broken` | 502 | no | **503** | errors, naming every problem |

`logging` is a legitimate configuration — it is what CI, the e2e suite and local
development run against, and `MAIL_TRANSPORT` is explicit rather than inferred from
`NODE_ENV` precisely so a production *build* can be exercised end to end. But
`MAIL_TRANSPORT=console` on a real *deployment* is the worst state this site can be
in: every form returns success, the visitor is told "Message received", and the lead
goes to stdout. That is why it warns at every boot and why `/api/health` separates
"submissions work" from "mail is delivered" instead of collapsing both into `ok`.

The check runs in three places, deliberately: `instrumentation.ts` at server start
(before any visitor), `/api/health` for monitoring, and `sendFormMail` as the last
line of defence. It used to run only in the third — so a deployment with no key
looked healthy everywhere until someone tried to become a customer.

What it cannot check is the Resend side: a verified domain is DNS, not config. A
key plus a sender on your own domain reports `deliverable`, and Resend can still
reject the send if that domain was never verified. Submit the form once after
setting it up.

### Nav morph

The bar → capsule transition is driven by latched state in [Nav.tsx](components/Nav.tsx),
not bare threshold comparisons:

- **Hysteresis** — the capsule engages above 90px and releases below 50px. A single
  boundary meant scrolling around it restarted the whole morph every few pixels.
- **A travel accumulator** decides hiding/showing, not instantaneous scroll direction,
  so trackpad momentum can't flip it back and forth. It takes 90px of sustained
  downward scroll to hide and 40px upward to bring it back.

On the CSS side the two states are **layers that cross-fade**, not properties of the
nav that get animated. `.nav` keeps constant width and padding and transitions only
`transform`; `.nav-scrim` (the gradient) and `.nav-pill` (the capsule) are absolutely
positioned, and only the pill's own width animates. That matters because the earlier
version transitioned `width` and `padding` on the fixed nav — so all 450ms of it
reflowed the wordmark, six links and the CTA, on every frame, while the user was
scrolling. The pill is childless, so its contraction is a self-layout of one empty
box, and `contain: layout` keeps the one remaining reflow (the content column closing
up) off the page behind it.

Three things are easy to undo by accident:

- **`contain: layout` only — never `paint`.** Paint containment clips to the padding
  box, which would cut off the pill's 40px-blur shadow *and* the `.nav::after` scrim
  continuation. Both are drawn outside that box deliberately.
- **The cross-fade is staggered** (`--nav-fade-lag`), applied to whichever layer is
  leaving so it holds in both directions. Run flat against each other, both layers sit
  near 50% in the middle and the page ghosts straight through the nav.
- **The capsule's content box is reproduced by `.nav-inner`**, not by the nav
  shrinking around it. The `max-width`/`padding` pair there is derived from the old
  geometry, and the pill's 7px inset and 15px drop are too — the old capsule's 1px
  border sat *outside* its 10px padding, which is where the odd numbers come from.

The scroll callback is also write-gated: it caches the section links and compares
against what it last applied, because rewriting a class and an `aria-current` on six
links every frame cost 62 mutation records over a single scroll. Both of these are
held in place by tests — see `the nav morph stays cheap` in [e2e/smoke.spec.ts](e2e/smoke.spec.ts).

### Integrations

All optional and env-gated. With nothing configured the site still works — forms
email you and nothing external loads.

| Env var | Effect when set | When unset |
| --- | --- | --- |
| `RESEND_API_KEY` | Forms send real mail | Logged to console (dev), **hard failure in production** |
| `CONTACT_FROM_EMAIL` | Sends from your verified domain | **Hard failure in production** — the fallback is `resend.dev` |
| `CONTACT_TO_EMAIL` | Where submissions land | `hello@myndstack.io`, the address in `SITE` |
| `MAIL_TRANSPORT` | `console` forces logging, `resend` forces sending | Inferred from whether a key exists; an unrecognised value is an error |
| `RESEND_AUDIENCE_ID` | Newsletter signups join a real audience | Email only |
| `HUBSPOT_ACCESS_TOKEN` | Contact submissions upsert a HubSpot contact | No CRM write |
| `NEXT_PUBLIC_CAL_LINK` | Inline Cal.com booking under the contact details | No embed, **no third-party script at all** |

Two things worth knowing:

- **HubSpot writes standard properties only**: `email`, `firstname`, `lastname`,
  `company`, `message` and `hs_lead_status`. HubSpot rejects the whole request with
  a 400 if you write a property the portal doesn't define, and these ship with every
  portal (verified against portal 246832602).
  - `hs_lead_status: NEW` is set **on create only** — someone already marked
    `CONNECTED` or `OPEN_DEAL` who fills the form again must not be reset.
  - **Budget** and **how-did-you-hear** have no standard home. `hs_analytics_source`
    looks close but is a HubSpot-managed traffic-source enumeration, not free text.
    Both stay in the notification email until custom properties exist.
- **Sinks run whatever mail did, and can never fail the request.** Email goes first
  and is the primary path, but the CRM and audience writes are no longer gated on it:
  they used to sit behind the `ok` check, so a Resend outage discarded the submission
  entirely even when HubSpot was healthy — the one path still able to keep the lead
  was the one being skipped. They now run either way, via `Promise.allSettled`.
  A failed send is still reported to the visitor as an error even when a sink caught
  it, because they are owed the truth that no one received their message.
  The corollary is unchanged: a bad HubSpot token degrades quietly — check the logs
  after configuring one.

### Tests

`npm test` runs Vitest over the pure logic in `lib/` — no DOM, no jsdom:

- `nav-state` — the bar/capsule/hidden reducer, including the hysteresis dead band
  and momentum-wobble immunity that regressed twice while this was a component-local ref.
- `scroll-spy` — which section is current, including the document-order rule
  (see *Scroll-spy order* below) and the empty-offsets case every sub-page hits.
- `format` — the metric parser (must round-trip the authored string exactly),
  JSON-LD escaping, and the mail-header sanitiser.
- `rate-limit` — the sliding window and the X-Forwarded-For hop selection.
- `form-shared` — field-error flattening and the contact schema.
- `mail-config` — the three states, and every way a deployment can be misconfigured.
  This is the regression that a green CI could not see: the suite forces
  `MAIL_TRANSPORT=console`, so nothing here ever exercises the real configuration.
  Driving `resolveMailStatus` with an explicit `env` is how that gets tested at all.

Anything needing a real viewport is covered by `npm run test:e2e` instead —
Playwright against a production build, with `MAIL_TRANSPORT=console` so form
submission is exercised end to end without a live provider.

Each browser test maps to a regression that actually shipped and was invisible to
both unit tests and screenshots:

| Test | Regression |
| --- | --- |
| `#site` not inert after load | The whole page left uninteractive |
| No horizontal overflow at 5 widths | Hero H1 clipped at 320px |
| Nav capsule fits across 760–900px | CTA wrapping out of the pill |
| Work/role cards reach detail pages | Cards that went nowhere |
| Back-to-top only on scroll-up | Scroll-intent latch |
| Scroll-spy tracks sections in order | Cached offsets going stale — invisible to the unit tests, which only cover the arithmetic |
| Intro plays once per session | The overlay, and the `inert` it implies, on a repeat visit |
| Marquees pause off screen | An observer that silently stops firing; the only symptom is a warm phone |
| `/api/health` reports `ok` | Mail config resolved at boot, not at first submission |

Two constraints that make them trustworthy: the suite must run with **motion
enabled** (the inert bug only exists on the non-reduced-motion path, so a
reduced-motion run would pass while the page was dead), and scrolling is done in
**steps** because the nav and back-to-top key off a sustained travel accumulator.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build and the
browser suite on every push and PR.

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
and the word-by-word manifesto, and collapses transition durations *and delays* —
zeroing only the duration leaves a staggered transition still waiting before it snaps,
which is exactly what the nav morph's cross-fade lag would do. Reveal animations are
also forced open under `<noscript>`.

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

**Placeholder content — all of this is invented and must be replaced.** Once the
site has been seeded (see [Content](#content)), the first four are a **Studio
task, not a code edit** — replace them at the `*.sanity.studio` URL:

- **Case studies** — clients, metrics and narratives are fabricated. They read as
  real; that is the risk.
- **Testimonials** — quotes are invented. Attributions are anonymised to roles
  rather than names, but the quotes themselves are not real.
- **Team** — names and roles are placeholders.
- **Client lockups** in the logo marquee.
- **Legal copy** (`lib/legal.ts`) — stays in code (it goes through counsel, not a
  marketing edit). A reasonable draft that has **not** been reviewed; do so and
  update `LAST_UPDATED`.

**Configuration:**

- **Social profile URLs** — set them under *Site settings* in Studio (leave one
  blank to hide that icon rather than link nowhere).
- **Verify a sending domain in Resend** and set `CONTACT_FROM_EMAIL` to an address
  on it — the default `onboarding@resend.dev` is for testing only, and a production
  deployment now refuses to start in a state that would use it. Add DKIM, SPF and a
  DMARC record while you are in DNS; DMARC at `p=quarantine` or stricter is also
  what the BIMI asset this repo already serves ([next.config.ts](next.config.ts),
  `public/bimi/`) needs before any provider will show the logo — Gmail additionally
  wants a paid Verified Mark Certificate.
- **Set `CONTACT_FROM_EMAIL` and `NEXT_PUBLIC_SITE_URL` in the host, not just
  `.env.local`** — that file is never deployed. Both have defaults that will hurt
  you in production: a `resend.dev` sender, and canonicals pointing at localhost.
- **After deploying, `curl /api/health`.** `{"ok":true,"deliverable":true}` is the
  only state that actually sends mail to a person.
- **`NEXT_PUBLIC_SITE_URL`** feeds `metadataBase`, canonicals, `robots.txt` and
  `sitemap.xml`. Set it per environment.
- **Launcher icons are generated from the mark.** `app/apple-icon.tsx` (iOS touch
  icon) and `app/icons/[icon]/route.ts` (maskable 192/512 PNGs, padded into
  Android's safe zone) are rendered from `public/myndstack-logo-square.svg` via
  `next/og` — no fabricated art, no new dependency. On-screen content was already
  retina-ready (canvases scale by `devicePixelRatio`; all imagery is SVG).
- **Analytics are off** unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set, so there is
  no consent banner to manage.

**Performance:**

- **The loader costs you LCP, but only once per session.** It covers the viewport
  for ~1.65s by design, so lab tools report LCP after it clears — and lab tools
  always measure a cold session, so that is the number you will see. Real repeat
  visits, and every click through to `/work` or `/careers` and back, skip it:
  a blocking script at the top of `<body>` reads the sessionStorage key in
  [lib/loader-seen.ts](lib/loader-seen.ts) and stamps `data-seen` on `<html>`
  before first paint, so CSS hides the overlay with no flash to hide. Measured
  CLS is ~0.000. To go further, shorten `FADE_AT_MS` in
  [Loader.tsx](components/Loader.tsx) or drop the component from the layout.
