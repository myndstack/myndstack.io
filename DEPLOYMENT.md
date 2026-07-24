# Deploying to Vercel

This app is a standard Next.js 15 App Router project. The only non-obvious pieces
are the custom build directory, the per-environment mail transport, and the DNS
that mail deliverability depends on. All three are handled below.

## 1. Import the repo

Vercel → **Add New → Project** → import `myndstack/myndstack.io`. Framework is
detected as **Next.js**. Do not change the build/output settings — [vercel.json](vercel.json)
already pins them:

- **Build command:** `next build`. This is deliberate. Locally, `npm run build`
  sets `NEXT_DIST_DIR=.next-build` so a build can run without corrupting a live
  dev server. Vercel has no dev server to protect, so it builds to the default
  `.next`, which is the layout Vercel's Next.js builder expects. Overriding the
  command is what forces that — do not switch it back to `npm run build`.
- **Node version:** pinned to `22.x` via `engines` in [package.json](package.json),
  matching CI.
- **Do not set `NEXT_DIST_DIR` in Vercel's env.** It would redirect the build away
  from `.next`, which is the only place Vercel's Next.js builder looks — the deploy
  would fail with "no output found". It belongs only in the local `npm run build`.

`instrumentation.ts` runs at each function cold start and logs mail readiness to
the Vercel **runtime logs** — a misconfigured deployment announces itself there.

## 2. Environment variables

Set these under **Settings → Environment Variables**. `.env.local` is never
deployed, so anything not set here falls back to a code default — and two of those
defaults are wrong for production (see [lib/mail-config.ts](lib/mail-config.ts)).

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | **required** | — (see below) | Without it, production forms 502 and `/api/health` returns 503. |
| `CONTACT_FROM_EMAIL` | **required** | — | Must be on the verified domain. The code fallback is `resend.dev`, which production **rejects** — forms 502 and `/api/health` is 503 rather than sending undeliverable mail (the app still boots and renders). Use `Myndstack <hello@myndstack.io>`. |
| `NEXT_PUBLIC_SITE_URL` | **required** | optional | `https://myndstack.io`. Feeds canonicals, `robots.txt`, `sitemap.xml`, OG URLs. The default is `localhost` — set it or those all point at localhost. |
| `CONTACT_TO_EMAIL` | optional | optional | Where leads land. Defaults to `hello@myndstack.io`. |
| `HUBSPOT_ACCESS_TOKEN` | optional | — | Upserts a CRM contact per submission. Needs `crm.objects.contacts.write`. |
| `RESEND_AUDIENCE_ID` | optional | — | Adds newsletter signups to a Resend audience. |
| `NEXT_PUBLIC_CAL_LINK` | optional | optional | Renders the Cal.com booking embed. Unset = no third-party script at all. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional | optional | Enables analytics. Unset = no analytics script. |
| `MAIL_TRANSPORT` | **do not set** | `console` | See below. |
| `TRUSTED_PROXY_HOPS` | optional | optional | Defaults to `1`, which is correct for Vercel's single edge hop. Leave unset. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | **required** | **required** | `e3tbagdk`. Public. The site fetches content from it; without it the content queries throw at build. |
| `NEXT_PUBLIC_SANITY_DATASET` | **required** | **required** | `production`. Public. |
| `SANITY_API_READ_TOKEN` | optional | optional | The public dataset reads without a token. Set a Viewer token only if you later need drafts or higher rate limits. |
| `SANITY_API_WRITE_TOKEN` | **do not set** | — | Local-only, for `npm run seed`. Never set in the host — nothing reads it at runtime. |

### Content (Sanity)

Content lives in Sanity, edited in a **standalone** Studio (not on this domain —
see the README on why it isn't embedded). Two one-time steps, then it runs itself:

1. **Seed** the dataset once from the repo's `lib/` constants — locally, with an
   Editor token in `.env.local`: `npm run seed`. Revoke the token after.
2. **Deploy the Studio** with `npm run studio:deploy` so editors have a hosted
   URL. No webhook is needed — the content pages render dynamically, so a publish
   shows on the next page load automatically.

The content routes read Sanity fresh per request (`cache: "no-store"`), so edits
are always live with nothing to configure. (An ISR + webhook path was built first
but Vercel wasn't regenerating the prerendered pages on this deployment; see the
README. The `/api/revalidate` route and its secret were removed.)

### The Preview-environment trap

Preview deployments run with `NODE_ENV=production`. So a preview with no
`RESEND_API_KEY` resolves to the **broken** state: every form 502s and
`/api/health` is 503. That makes every PR preview look broken.

Fix it by setting **`MAIL_TRANSPORT=console` for the Preview environment only**.
Previews then log submissions instead of sending them — no real mail from a
throwaway URL, no 502s. `/api/health` returns `200 {"deliverable":false}` and the
boot log carries the "reaches nobody" warning, which is exactly right for a preview.

Do **not** set `MAIL_TRANSPORT` on Production. Leave it unset so a present key
selects the real transport. Setting it to `console` in Production is the one
misconfiguration that silently drops leads while every form reports success — the
server warns about it at boot, but it will not stop you.

## 3. Custom domain + mail DNS

1. **Settings → Domains** → add `myndstack.io`. Use the **DNS Records (A record)**
   method, *not* "Vercel DNS": add `A @ → 216.198.79.1` at your registrar and leave
   DNS hosted where it is. Do **not** switch nameservers to Vercel — this zone also
   holds your mail records (below), and moving it would orphan them. Set
   `myndstack.io` as the primary domain and `www` as a `308` redirect to it, so the
   canonical host matches `NEXT_PUBLIC_SITE_URL`.
2. Leave the mail records in this zone untouched — **MX**, **SPF**, Resend **DKIM**
   (`resend._domainkey`), **DMARC** (`_dmarc`), and **BIMI**. They are already live,
   and `myndstack.io` is verified in Resend (region `eu-west-1`). DMARC is already at
   `p=reject`, the strictest setting — nothing needs raising.
3. That `p=reject` also satisfies the BIMI logo this app serves from `public/bimi/`
   (BIMI requires DMARC at `p=quarantine` or stricter) — see [next.config.ts](next.config.ts).
   Gmail additionally wants a paid VMC before it will render the mark.

## 4. Region (optional)

Functions default to Washington, D.C. (`iad1`). The audience is India-based; if
form latency matters, set **Settings → Functions → Region** to Mumbai (`bom1`).
Left out of `vercel.json` on purpose — a single region is a project setting and
avoids plan-specific deploy errors. The forms are light either way.

## 5. Verify after deploying

```bash
curl -s https://myndstack.io/api/health
# {"ok":true,"deliverable":true}    → mail reaches a person
# {"ok":true,"deliverable":false}   → something set MAIL_TRANSPORT=console
# {"ok":false,...}  (HTTP 503)      → misconfigured; the runtime log names the cause
```

Then confirm the security headers landed:

```bash
curl -sI https://myndstack.io | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions-policy'
```

Finally, submit the contact form once and confirm it arrives at `CONTACT_TO_EMAIL`
— a verified domain still can't be proven from config alone.

## 6. Rollback

Vercel keeps every deployment. **Deployments → ⋯ → Promote to Production** on the
last good one is an instant rollback; no rebuild.
