# Sanity CMS — Operator & Developer Guide

Editorial content on this site (careers roles, case studies, and most of the
homepage) lives in **Sanity** so it can be changed without editing code or
redeploying. This document is the complete guide: how to get access, edit
content, run and deploy the Studio, manage data, and extend the schema.

- **Project ID:** `e3tbagdk`
- **Dataset:** `production`
- **Editor UI:** a **standalone** Sanity Studio (not embedded in the site — see
  [Why standalone](#why-the-studio-is-standalone))
- **How the site reads it:** server-side, validated, in
  [`lib/sanity/`](lib/sanity/)

> **New here?** Editors want [§3 Running the Studio](#3-running-the-studio) and
> [§4 Editing content](#4-editing-content). Developers want [§8 Developer
> guide](#8-developer-guide).

---

## Table of contents

1. [What lives in Sanity (and what doesn't)](#1-what-lives-in-sanity-and-what-doesnt)
2. [Access & tokens](#2-access--tokens)
3. [Running the Studio](#3-running-the-studio)
4. [Editing content](#4-editing-content)
5. [How edits reach the live site](#5-how-edits-reach-the-live-site)
6. [Commands reference](#6-commands-reference)
7. [Data management (backup, import, GROQ)](#7-data-management)
8. [Developer guide](#8-developer-guide)
9. [Feature use cases (recipes)](#9-feature-use-cases-recipes)
10. [Troubleshooting](#10-troubleshooting)
11. [Environment variables](#11-environment-variables)
12. [Security](#12-security)

---

## 1. What lives in Sanity (and what doesn't)

Not all site content is in the CMS. Editorial copy is; **structure the code is
written against is not** — putting it in a CMS would let an editor silently break
the page.

### In Sanity (edit in the Studio)

| Content type | Studio label | Powers |
| --- | --- | --- |
| `role` | Career role | `/careers`, each `/careers/<slug>`, homepage careers teaser |
| `caseStudy` | Case study | `/work`, each `/work/<slug>`, homepage Selected Work |
| `testimonial` | Testimonial | Homepage testimonials carousel |
| `teamMember` | Team member | Homepage studio/team grid |
| `faq` | FAQ | Homepage FAQ accordion |
| `pricingTier` | Pricing tier | Homepage pricing |
| `homepage` | Homepage *(singleton)* | Hero copy, capabilities, process, stats, contrast lists, manifesto, client lockups |
| `siteSettings` | Site settings *(singleton)* | Company name, contact email/phone, location, footer version tag, social links |

### Stays in code (by design)

| In code | Where | Why |
| --- | --- | --- |
| Nav links / scroll-spy IDs | `lib/content.ts` (`NAV_LINKS`) | Their `section` values must equal element IDs the components render — a CMS typo would silently kill the scroll-spy |
| Stack-story layers | `lib/content.ts` (`STACK_LAYERS`) | The pinned scroll animation's geometry assumes exactly four layers |
| Hero **headline** words | `components/Hero.tsx` | The word-cycle animation and its hard line break are written against that exact array. *(The hero eyebrow, subhead and CTA labels DID move to Sanity.)* |
| Legal pages | `lib/legal.ts` | Long-form legal that goes through counsel, not a marketing edit |
| Footer columns / legal links | `lib/content.ts` | Route wiring, not copy |
| `SITE_URL` | env / `lib/content.ts` | Per-environment config, not content |

> The now-dormant `SITE`, `SOCIALS`, `CAPABILITIES`, etc. constants still exist in
> `lib/content.ts` **only** as the source for the one-time seed script. Editing
> them has **no effect** on the live site — edit that content in the Studio.

---

## 2. Access & tokens

### Getting into the project

Content editors need a seat on the Sanity project. A project admin invites them
at **[sanity.io/manage](https://sanity.io/manage) → project `e3tbagdk` →
Members → Invite**. Roles: **Editor** (create/edit/publish content) or **Viewer**
(read-only). They then log into the Studio with that account.

### The three tokens

Sanity uses different credentials for different jobs. **None is required for the
site to run** — the dataset is public and pages read it anonymously.

| Token | Purpose | Where it goes | Lifetime |
| --- | --- | --- | --- |
| **Write** (`SANITY_API_WRITE_TOKEN`) | ONLY `npm run seed` (initial import). Never read at runtime | `.env.local` only | Create, seed once, **revoke** |
| **Read** (`SANITY_API_READ_TOKEN`) | Optional. Not needed to read the public dataset; set a **Viewer** token only if you later want drafts or higher rate limits | Host env + `.env.local` | Long-lived |
| **Revalidate secret** (`SANITY_REVALIDATE_SECRET`) | The publish webhook, which turns "live within 60s" into "live in seconds" (see §5). Optional — content still updates on the timer without it | Host env + the Sanity webhook | Long-lived |

**Create tokens** at **sanity.io/manage → project `e3tbagdk` → API → Tokens**.
The only one you need is an **Editor** token to run the seed once.

> **Security:** the read/write tokens are secrets — never commit them (`.env*` is
> gitignored). `.env.local` is never deployed. Revoke the write token after
> seeding. See [§12](#12-security).

### CLI login

CLI commands that touch the project (deploy, export, import, user management)
authenticate via a browser login, not a token:

```bash
npx sanity login      # opens a browser; pick the same account
npx sanity whoami     # confirm who you are
```

---

## 3. Running the Studio

The Studio is a **standalone** app run by the Sanity CLI (npm scripts wrap it).

```bash
npm run studio:dev       # local editor at http://localhost:3333
npm run studio:build     # production build of the Studio (to ./dist, gitignored)
npm run studio:deploy    # build + host at https://myndstack.sanity.studio
```

**Editing locally:** `npm run studio:dev`, open `http://localhost:3333`, log in.
Good for trying things; you don't need it deployed to edit.

**Editing from anywhere (recommended for non-developers):** run
`npm run studio:deploy` once. It hosts the editor at
`https://myndstack.sanity.studio` (the subdomain is `studioHost` in
[`sanity.cli.ts`](sanity.cli.ts) — change it if taken). Bookmark it; edit from any
browser, no terminal. Re-run `studio:deploy` only when the **schema** changes, not
for content edits.

### Node version note

The repo pins **Node 22.x** (`engines` in `package.json`, matching CI). On
**Node ≥26**, Sanity's bundled dev toolchain crashes (`Missing field
moduleType`); [`sanity.cli.ts`](sanity.cli.ts) disables HMR to work around it, so
`studio:dev` still runs — the only cost is that editing a **schema file** needs a
manual browser refresh (content edits live-update fine). On Node 22 this is a
non-issue. The production `studio:build`/`deploy` path is unaffected either way.

### Why the Studio is standalone

It is deliberately **not** embedded at `/studio` inside the Next app. Sanity v5's
Studio UI imports React's `useEffectEvent`, which Next 15.5's compiled-React shim
predated, so an embedded route wouldn't compile — and forcing webpack to the real
React broke Next's server renderer.

The app is on **Next 16** now, so that original blocker is probably gone. It has
stayed standalone anyway, on the second reason: it keeps the Studio's weight
entirely out of the marketing bundle, and the Studio is an internal tool that
does not need to ship from the marketing domain. Embedding it is a real option,
not a fix for anything currently broken.

---

## 4. Editing content

### The Studio at a glance

The left panel lists **Homepage** and **Site settings** (the two singletons —
one of each, can't be duplicated), then the collections: **Career role**, **Case
study**, **Testimonial**, **Team member**, **FAQ**, **Pricing tier**.

**Publishing model:** edits are **drafts** until you click the blue **Publish**
button (bottom-right). The live site only ever shows published content. Unpublish
or delete via the **⋮** (three-dot) menu on a document.

**Ordering:** every collection item has an **Order** number — lower shows first.
Set it when creating; change it to reorder.

**Validation:** the Studio validates as you type and blocks publishing invalid
content — e.g. a stat like `12ms` must contain a number so it can count up on the
page. Fix the highlighted field, then publish.

### Per-type guide

**Career role** — Title, Slug (the `/careers/<slug>` URL, auto-generated from the
title), Order, Meta line (e.g. "Remote · Infra"), Team, Location, Type, Package,
Lede (one-line summary), About (paragraphs), What you'll do, What we're looking
for, Nice to have. Adding one makes its listing, detail page, OG image, and
sitemap entry appear automatically, and updates the "N open roles" / "N ways in"
copy.

**Case study** — Client, Slug (`/work/<slug>`), Order, Industry, Tags, Lede,
Summary (card body), Challenge / Approach / Outcome (paragraphs), Stack, Metrics
(each has Value, Label, and an "Accent" toggle for the headline number),
Duration, Footprint, and **Featured** (exactly one — it gets the wide homepage
card; setting a second is flagged).

**Testimonial** — Quote (include the quotation marks), Order, Index label
("01"…), Attribution role, Organisation type.

**Team member** — Name, Order, Initials (avatar monogram), Role.

**FAQ** — Question, Order, Answer.

**Pricing tier** — Name, Order, Blurb, Price (free text: "$0", "$2,400",
"Custom"), optional Annual price / Period / Annual note / Badge, CTA label,
Highlighted toggle, Features.

**Homepage** *(singleton)* — grouped tabs: Hero (eyebrow, subhead, two CTA
labels), Capabilities, Process, Stats, Contrast (the two "without/with" lists),
Manifesto (lead + kept phrase), Clients (marquee heading + lockups).

**Site settings** *(singleton)* — Company name, contact email, phone (display +
`tel:` link), location, footer version tag, and Social profiles (leave a URL
blank to hide that icon rather than link nowhere).

---

## 5. How edits reach the live site

**A published edit is live within about a minute — everywhere, with no setup.**

The content pages are statically prerendered and revalidate on a timer:
[`lib/sanity/client.ts`](lib/sanity/client.ts) reads with
`next: { tags, revalidate: 60 }`. Hit **Publish** in the Studio and the change
surfaces on the next request after the window closes.

**To make it near-instant**, wire the webhook — it takes a minute and is worth it
if editors are publishing interactively:

1. Set `SANITY_REVALIDATE_SECRET` in the host (any long random string).
2. In [sanity.io/manage](https://sanity.io/manage) → **API → Webhooks**, add one
   pointing at `https://myndstack.io/api/revalidate`, method **POST**, with that
   same string as the secret.

[`/api/revalidate`](app/api/revalidate/route.ts) verifies the signature, reads
only the payload's `_type`, and drops that one cache tag — so a publish rebuilds
the pages that use that content type and nothing else. Measured end to end at
**22s** without the webhook; seconds with it.

> **If content ever looks stale, do not make the pages dynamic.** On Next 15.5
> this setup genuinely did not regenerate on Vercel (the `age` header climbed and
> never reset), and the response — rendering everything per request — took the
> entire site down: metadata resolves per request for a dynamic page, it failed
> there, and every route served a full body with no `<title>` and no meta tags.
> The cause was the framework version; Next 16 fixed it. Check the Next version
> and the `age` header first.

---

## 6. Commands reference

### npm scripts

| Command | What it does |
| --- | --- |
| `npm run studio:dev` | Local Studio at `http://localhost:3333` |
| `npm run studio:build` | Production build of the Studio → `./dist` |
| `npm run studio:deploy` | Build + host at `myndstack.sanity.studio` |
| `npm run seed` | One-time import of `lib/` constants into Sanity (needs `SANITY_API_WRITE_TOKEN`) |
| `npm run dev` / `build` / `start` | The Next **site** (separate from the Studio) |

### Common Sanity CLI commands

Run with `npx sanity <command>` (after `npx sanity login`). These read the
project/dataset from [`sanity.cli.ts`](sanity.cli.ts).

| Command | Purpose |
| --- | --- |
| `npx sanity login` / `logout` / `whoami` | Authenticate the CLI |
| `npx sanity schema validate` | Check the schema compiles (0 errors expected) |
| `npx sanity documents query '<GROQ>'` | Run a GROQ query from the terminal |
| `npx sanity dataset list` | List datasets |
| `npx sanity dataset export production backup.tar.gz` | Back up all content + assets |
| `npx sanity dataset import backup.tar.gz production` | Restore / load content |
| `npx sanity users list` | List project members |
| `npx sanity manage` | Open the project dashboard in a browser |

---

## 7. Data management

### Back up the content

A full, portable snapshot (documents + assets) as a single file:

```bash
npx sanity dataset export production backup-$(date +%Y%m%d).tar.gz
```

Keep these somewhere safe before any risky change. Restore with:

```bash
npx sanity dataset import backup-YYYYMMDD.tar.gz production --replace
```

> `--replace` overwrites documents with matching IDs. Omit it to add only.

### Query content directly (GROQ / Vision)

- **In the Studio:** the **Vision** tab (a plugin we enabled) is a live GROQ
  playground against the real dataset — great for checking what a query returns.
- **From the terminal:**
  ```bash
  npx sanity documents query '*[_type == "role"]{title, "slug": slug.current}'
  ```

The queries the site actually uses live in
[`lib/sanity/queries.ts`](lib/sanity/queries.ts) — copy one into Vision to see its
raw shape.

### Datasets (e.g. a staging copy)

`production` is the only dataset. To experiment without touching live content,
create one and point `NEXT_PUBLIC_SANITY_DATASET` at it locally:

```bash
npx sanity dataset create staging
npx sanity dataset export production p.tar.gz && npx sanity dataset import p.tar.gz staging
```

### Re-seed from code

`npm run seed` is **idempotent** (every document has a fixed ID and is written
with `createOrReplace`), so re-running overwrites rather than duplicating. Use it
to reset the dataset back to the checked-in defaults. It needs
`SANITY_API_WRITE_TOKEN` in `.env.local`.

---

## 8. Developer guide

### File map

```
sanity/
  schemas/            one file per content type + shared.ts (validation helpers)
  env.ts              project id / dataset / api version (public config)
  structure.ts        desk layout (singletons pinned, then collections)
sanity.config.ts      Studio config (schemas + plugins)
sanity.cli.ts         CLI config (studioHost, Vite/PostCSS/HMR workarounds)
lib/sanity/
  client.ts           `sanityFetch` — native, uncached reads (dynamic pages)
  queries.ts          GROQ + zod validation; returns the app's existing types
  tags.ts             cache-tag names, shared with the revalidate route
scripts/seed-sanity.ts    one-time import of lib/ constants
app/api/revalidate/route.ts   signed webhook → revalidateTag
```

### The query-layer contract

Every query in [`lib/sanity/queries.ts`](lib/sanity/queries.ts):

- Returns the **same TypeScript type** the components already used (`Role`,
  `CaseStudy`, `PricingTier`, …). Each schema is checked with
  `satisfies z.ZodType<T>` so validation and type can't drift.
- Is **zod-validated at the boundary** — a missing/mistyped CMS field throws a
  loud, located error at build/fetch instead of rendering a blank section.
- Is wrapped in React `cache()` so multiple server components reading the same
  document in one render share a single fetch.
- Is tagged for revalidation.
- Is **server-only** (`import "server-only"`), so zod and the token never reach
  the client bundle.

### Add a new FIELD to an existing type

Four edits, always together:

1. **Schema** — add the field in `sanity/schemas/<type>.ts` (with validation).
2. **Query** — add it to the GROQ projection and the zod schema in
   `lib/sanity/queries.ts`. If it's optional, use `optionalString` / `optionalBool`
   (GROQ returns `null`, not `undefined`, for absent fields — plain `.optional()`
   would reject it).
3. **Seed default** — add it in `scripts/seed-sanity.ts` so a fresh seed is valid.
4. **Component** — read the new field where it's rendered.

Then `npm run studio:deploy` (schema changed) and re-run the site build.

### Add a new CONTENT TYPE

1. New `sanity/schemas/<type>.ts` (mirror an existing one; include an `order`
   field — see `shared.ts`).
2. Register it in `sanity/schemas/index.ts`.
3. Add a tag to `lib/sanity/tags.ts` (its key **must** equal the schema `_type`).
4. Add query function(s) + zod schema in `lib/sanity/queries.ts`.
5. Seed it in `scripts/seed-sanity.ts`.
6. Consume it in a component (server components fetch directly; client components
   receive the data as props from a server parent).

### Validation helpers

`sanity/schemas/shared.ts` holds `orderField` and the `NUMERIC` regex that
metric-string fields validate against (the same regex `parseMetric` in
`lib/format.ts` uses to animate numbers) — so an editor can't type a "stat" that
silently won't count up.

---

## 9. Feature use cases (recipes)

**Post a new job opening** → Studio → **Career role** → **＋** → fill in, set
**Order**, **Publish**. Everything else (listing, detail page, sitemap, OG image,
the "N ways in" heading) updates itself.

**Take a job down** → open the role → **⋮ → Unpublish** (keeps the draft) or
**Delete**. The URL 404s cleanly afterward.

**Publish a real case study** (replacing a placeholder) → **Case study** → edit
or add → set **Featured** on the one you want as the wide homepage card
(exactly one) → **Publish**.

**Change the contact email / phone / socials** → **Site settings** → edit →
**Publish**. Updates the footer, contact section, mobile menu, and JSON-LD.

**Reorder anything** (roles, cases, pricing, FAQ…) → change the **Order** numbers.

**Reword the hero or manifesto** → **Homepage** → *Hero* / *Manifesto* tab.
*(The big animated headline words themselves are in code — see
[§1](#1-what-lives-in-sanity-and-what-doesnt).)*

**Add/adjust a pricing tier** → **Pricing tier** → edit; set **Highlighted** on
the emphasised one; fill **Annual price** to enable the monthly/annual toggle.

**Roll back a bad edit** → open the document and use its **revision history**
(the timestamp/history control at the top of the document pane) to review and
restore a previous version. Sanity keeps document history automatically.

---

## 10. Troubleshooting

**`studio:dev` fails with a PostCSS error** — already handled in
`sanity.cli.ts` (empty inline PostCSS config). If it recurs, confirm that file's
`vite` hook is intact.

**`studio:dev` crashes with `Missing field moduleType`** — you're on Node ≥26.
It's worked around (HMR disabled) in `sanity.cli.ts`; if it still fails, use Node
22 (`nvm use 22`) or just edit via the deployed Studio (`studio:deploy`).

**The site build fails with `Sanity content failed validation for "…"`** — a
required field is missing or malformed in the CMS. The error names the document
and field. Fix it in the Studio and re-publish. This is the validation layer
doing its job — it prevents a blank section from shipping.

**A homepage section is blank** — the corresponding document/singleton is
unpublished or empty. Check it's **Published** in the Studio.

**Edits aren't showing on the live site** — first, give it a minute: pages
revalidate on a 60s timer unless the webhook is wired. Then confirm you clicked
**Publish** in the Studio (drafts are never shown), and hard-reload to bypass the
browser cache. If it is still stale after several minutes, check the `age`
response header — if it climbs past 60 and never resets, revalidation itself is
stuck, which on this site has only ever been a Next-version problem. Do not
reach for `force-dynamic`; see the box in §5.

**Webhook returns 401** — the signature didn't verify: the **Secret** in the
Sanity webhook doesn't match `SANITY_REVALIDATE_SECRET` in the host. **500** —
the secret env var isn't set at all.

**Editing `lib/content.ts` did nothing** — that content is served from Sanity now;
those constants are seed-source only. Edit in the Studio.

---

## 11. Environment variables

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | site (public) | yes | `e3tbagdk` |
| `NEXT_PUBLIC_SANITY_DATASET` | site (public) | yes | `production` |
| `SANITY_API_READ_TOKEN` | site (server) | optional | Only needed for drafts / higher rate limits; the public dataset reads without it |
| `SANITY_REVALIDATE_SECRET` | site (server) | optional | The revalidate webhook — makes a publish near-instant instead of ≤60s. Must match the secret on the Sanity webhook. See §5 |
| `SANITY_API_WRITE_TOKEN` | local only | seed only | For `npm run seed`; revoke after. **Never** set in the host |

Public IDs also have safe hardcoded fallbacks in `sanity/env.ts`, so the Studio
CLI and the app resolve them even if a runtime loads env vars under a different
prefix. Full deployment matrix: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 12. Security

- **Tokens are secrets.** They live only in `.env*` (gitignored) and host env
  vars, never in the repo. `.env.local` is never deployed.
- **Least privilege.** Use a **Viewer** token for runtime reads. The **Editor**
  (write) token is only for seeding — **revoke it** afterward; nothing reads it at
  runtime.
- **The read token is server-only.** `lib/sanity/` imports `server-only`, so the
  token and GROQ never reach the browser bundle.
- **The webhook is signature-verified.** `/api/revalidate` rejects any request
  whose signature doesn't match the shared secret — the payload is treated as
  data (only its `_type` is used), never as instructions.
- **`/studio` is not on this domain** (standalone), and the marketing site's
  `/api` and any editor surfaces are disallowed in `robots.txt`.

---

*Questions this doc doesn't cover? The official docs are excellent:
[sanity.io/docs](https://www.sanity.io/docs). For how mail/deploy fit together,
see [DEPLOYMENT.md](DEPLOYMENT.md); for the site architecture, see
[README.md](README.md).*
