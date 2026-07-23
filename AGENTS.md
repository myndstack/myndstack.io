# Working in this repo

Next.js 15 (App Router) + React 19 + Tailwind v4, stock — `next@15.5.21`, no fork
and no patches. Standard App Router conventions apply.

**Read [README.md](README.md) first.** It is not a courtesy file: it documents the
non-obvious decisions, and most of them exist because the naive version was tried
and broke something. The nav morph's hysteresis, the single rAF scroll loop, the
premultiplied-alpha WebGL output, the reveal watchdog, and the reasons the e2e
suite must run with motion *enabled* are all things you will otherwise undo.

A few rules that are easy to violate by accident:

- **Scroll work goes through `lib/scroll.ts`.** One listener for the whole site.
  Subscribers mutate styles and classes inside the frame and never call `setState`.
- **Design tokens live in `@theme` in `app/globals.css`.** Reach for an existing
  primitive (`.btn`, `.ms-field`, `.eyebrow`, `.card`) before writing new CSS.
- **Forms validate with the same zod schemas on both sides**, but the client
  dynamic-imports them at submit time to keep zod out of the first load. Anything
  needed before that belongs in `lib/form-shared.ts`, which must stay zod-free.
- **Mail configuration is resolved once in `lib/mail-config.ts`** and is a pure
  function of `env` so it can be unit-tested. If you change how mail is
  configured, change it there — `mail.ts`, `instrumentation.ts` and
  `/api/health` all read that one result.
- **`npm run build` writes to `.next-build`, not `.next`**, so it can run while
  the dev server is up.

Unit tests cover pure logic in `lib/` (`npm test`). Anything needing a real
viewport goes in `e2e/` (`npm run test:e2e`, against a production build).
