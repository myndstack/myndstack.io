# Working in this repo

Next.js 16 (App Router) + React 19 + Tailwind v4, stock — `next@16`, no fork
and no patches. Standard App Router conventions apply.

**Read [README.md](README.md) first.** It is not a courtesy file: it documents the
non-obvious decisions, and most of them exist because the naive version was tried
and broke something. The nav morph's hysteresis, the single rAF scroll loop, the
premultiplied-alpha WebGL output, the reveal watchdog, and the reasons the e2e
suite must run with motion *enabled* are all things you will otherwise undo.

**Work on `dev`, never on `main`.** One long-lived branch, not one per fix. Push
to `dev`, let the Vercel preview build, look at it in a browser, and only then
fast-forward `main` (`git merge --ff-only dev`). The site's one outage returned
200 with a complete body on every route and was invisible to `curl`, to a local
production build and to green CI — a preview someone actually opened is the check
that catches that class of failure. [DEPLOYMENT.md](DEPLOYMENT.md) has the exact
commands.

A few rules that are easy to violate by accident:

- **Scroll work goes through `lib/scroll.ts`.** One listener for the whole site.
  Subscribers mutate styles and classes inside the frame and never call `setState`
  — and they do **no layout reads**. No `getBoundingClientRect`, no `offsetTop`,
  no `scrollHeight` in a scroll frame: cache it and refresh it from a
  `ResizeObserver`, the way `Nav` and `StackStory` do. If you genuinely must
  measure, subscribe with `{ read, write }` so your read runs before anyone's
  write. Prefer transforms over `height`/`top`/`width` for anything written per
  frame — and **write only when the value actually changed**: `setAttribute`
  queues a mutation record even when the value is identical, so an unconditional
  "cheap" write is 60 of them a second.
- **The nav's two states are cross-fading layers, not animated properties.**
  `.nav` keeps constant geometry and transitions only `transform`; `.nav-scrim`
  and `.nav-pill` do the rest. Do not move `width`/`padding` back onto `.nav`,
  and do not upgrade its `contain: layout` to `paint` (or `strict`/`content`) —
  paint containment clips the pill's shadow and the `::after` scrim continuation,
  both of which are drawn outside the box deliberately. The capsule's geometry
  numbers are derived from the pre-layer version, not taste; the README explains
  where each comes from.
- **Content pages are prerendered with ISR** (`revalidate: 60` + cache tags).
  If content looks stale, check the Next version and the `age` header — do **not**
  make the pages dynamic. That was tried, and per-request metadata resolution
  failed on Vercel and took every route down while still serving 200s.
- **Design tokens live in `@theme` in `app/globals.css`.** Reach for an existing
  primitive (`.btn`, `.ms-field`, `.eyebrow`, `.card`) before writing new CSS.
- **Forms validate with the same zod schemas on both sides**, but the client
  dynamic-imports them at submit time to keep zod out of the first load. Anything
  needed before that belongs in `lib/form-shared.ts`, which must stay zod-free.
- **Editable content comes from Sanity via `lib/sanity/queries.ts`**, which
  zod-validates every response and returns the existing `Role` / `CaseStudy` /
  etc. types. Add a field: schema in `sanity/schemas/`, projection + zod in
  `queries.ts`, seed default in `scripts/seed-sanity.ts`. What stays in code is
  *structure*, not copy — `NAV_LINKS`/`SPY_IDS`, `STACK_LAYERS`, the hero
  headline words, `lib/legal.ts`; the README's Content table says why. The Studio
  is standalone (`npm run studio:*`), **not** embedded — don't add an `app/studio`
  route, it won't compile against this Next (README explains).
- **Mail configuration is resolved once in `lib/mail-config.ts`** and is a pure
  function of `env` so it can be unit-tested. If you change how mail is
  configured, change it there — `mail.ts`, `instrumentation.ts` and
  `/api/health` all read that one result.
- **`npm run build` writes to `.next-build`, not `.next`**, so it can run while
  the dev server is up.

Unit tests cover pure logic in `lib/` (`npm test`). Anything needing a real
viewport goes in `e2e/` (`npm run test:e2e`, against a production build).
