# Kankotri Studio

**Premium AI photoshoots for Indian wedding cards (kankotri).** Upload a plain
phone photo of a card on a table and get an editorial-quality product shot —
matched to your region and style, with the card itself kept pixel-perfect —
ready for Instagram in seconds.

Built as a secure, multi-tenant SaaS so it can serve one studio or a thousand.

---

## What it does

1. **Upload** a photo of the card on any surface.
2. **Choose** a region/style (Gujarati, Punjabi, South Indian, Marwari, Bengali,
   or a region-neutral "Universal Premium"), a **mood** (Minimal → Elegant →
   Festive → Opulent), and an **Instagram size** (4:5, 1:1, 9:16).
3. **Generate.** An image model repaints a luxurious scene *around* the card —
   matched lighting, palette, florals and textures — while keeping the card's
   printed design and text exactly as-is.
4. **Download** the finished, correctly-sized image and post it.

> The app ships in a **free "mock" mode** that composites a labelled preview at
> the right size, so the whole flow (and the full test suite) runs at zero cost
> with no API key. Add a Gemini key to switch on photoreal output.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS 3 (restrained "premium" design tokens) |
| Data | Prisma ORM · SQLite for dev, portable to Postgres for prod |
| Image AI | Gemini 2.5 Flash Image ("Nano Banana") via REST, or a free mock |
| Image processing | sharp (validation, re-encode, resize to IG sizes) |
| Auth | First-party sessions (scrypt hashing, opaque hashed tokens) |
| Tests | Vitest (100 unit + integration tests) |

The core logic (prompt engine, providers, billing, security) is **dependency-
injected and pure**, so it is unit-tested in isolation and free of any single
vendor.

---

## Quick start (local, free mock mode)

```bash
# 1. Install
npm install            # runs `prisma generate` automatically

# 2. Create the local dev database (SQLite)
DATABASE_URL="file:./dev.db" npx prisma db push

# 3. Run
npm run dev            # http://localhost:3000
```

Open the app, create an account, and start generating in preview mode. No `.env`
and no API key required to try it.

Useful scripts:

```bash
npm run test        # run all tests
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # prisma generate + next build (production)
```

---

## Turning on real (Gemini) generation

### ⚠️ A Gemini "Pro" subscription is NOT an API key

A consumer **Gemini / Google AI Pro** subscription (the chat app) does **not**
grant programmatic API access. This app needs a **Gemini API key** from
**Google AI Studio**, which is billed separately from any Pro plan.

1. Get a key at **https://aistudio.google.com/apikey** (there is a free tier;
   paid image generation is roughly **US$0.039 per generated image**).
2. Copy `.env.example` to `.env` and set:

   ```bash
   IMAGE_PROVIDER=gemini
   GEMINI_API_KEY=your_key_here
   # optional: GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
   ```

3. Restart the app. Generations now produce photoreal scenes.

### Keeping spend capped at $10 (two independent locks)

- **In the app:** `SPEND_LIMIT_USD=10` (default). The app estimates cost per
  image and **refuses any paid generation once the cap is reached** — mock mode
  still works. Per-studio monthly **credits** (`FREE_MONTHLY_CREDITS`, default
  30) add a second quota.
- **On Google's side (recommended belt-and-braces):** in Google Cloud Billing,
  set a **budget with an alert and a cap** on the project holding your key, so
  billing can't exceed your comfort level even if the app is misconfigured.

---

## Environment configuration

All variables are documented in [`.env.example`](./.env.example) and validated
at boot (via zod) with safe dev defaults. Highlights:

| Variable | Default | Purpose |
| --- | --- | --- |
| `IMAGE_PROVIDER` | `mock` | `mock` (free) or `gemini` (real) |
| `GEMINI_API_KEY` | — | Google AI Studio key (required for `gemini`) |
| `SPEND_LIMIT_USD` | `10` | Hard in-app cap on paid generations |
| `FREE_MONTHLY_CREDITS` | `30` | Free generations per studio per month |
| `SESSION_SECRET` | — | **Required in production** (≥32 chars) |
| `DATABASE_URL` | `file:./dev.db` | SQLite in dev; Postgres URL in prod |
| `MAX_UPLOAD_MB` | `12` | Upload size limit |
| `STORAGE_DRIVER` | `local` | `local` disk (dev/single-node) or `s3` (TODO) |

---

## Security posture

Security was a first-class requirement. See [`docs/SECURITY.md`](./docs/SECURITY.md)
for the full write-up. In brief:

- **Passwords:** scrypt (memory-hard) with per-hash salt and timing-safe compare.
- **Sessions:** opaque 256-bit tokens; only their SHA-256 hash is stored, so a
  DB leak yields no usable tokens. Cookies are `httpOnly`, `sameSite=lax`, and
  `secure` in production. Expiry is enforced server-side; logout deletes the row.
- **Multi-tenant isolation:** every read is scoped by `orgId`; private assets are
  served only through an authenticated route that checks org ownership twice.
- **Uploads:** magic-byte sniffing, size/dimension/pixel limits (decompression-
  bomb guard), and re-encoding through the patched sharp (strips EXIF and any
  container exploit).
- **Secrets:** the Gemini key travels in a request header (never the URL) and is
  redacted from all error messages; it never reaches the client bundle.
- **Spend:** a hard in-app USD cap plus per-tenant credits gate every generation.
- **Rate limiting** on auth and generate endpoints.
- **Headers:** a nonce-based Content-Security-Policy plus `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in
  production (all verified on the running server).
- **Prompt-injection:** user "notes" are sanitised (control chars stripped,
  length-capped) and wrapped so they cannot override the preservation rules.

### Known follow-ups
- `npm audit` reports advisories in **Next.js's bundled** postcss/sharp (build-
  tooling / image-optimizer path only); clearing them requires upgrading to
  Next 16. User-uploaded images are processed by the patched top-level sharp and
  are not routed through the Next image optimizer.
- Rate limiting is in-memory (per instance). For multi-instance production, back
  it with Redis/Upstash (same interface).

---

## Deploying to production

> **Fastest path: [Deploy to Railway](./docs/DEPLOY-RAILWAY.md)** — a click-by-click
> guide that works with the app as-is (persistent disk for the database and
> images). The general/portable notes below apply to any host.

1. **Database → Postgres.** In `prisma/schema.prisma`, change the datasource
   `provider` to `"postgresql"`, set `DATABASE_URL` to your Postgres connection
   string, and run `npx prisma migrate deploy`. (The schema avoids DB-specific
   features, so the switch is essentially one line + a migration.)
2. **Secrets.** Set `SESSION_SECRET` (≥32 chars, e.g. `openssl rand -base64 48`),
   `GEMINI_API_KEY`, and `IMAGE_PROVIDER=gemini`.
3. **Storage.** The bundled driver writes to local disk, which suits a single
   VM/container (Railway, Fly.io, Render). For serverless/multi-node (e.g.
   Vercel), implement the S3/R2 driver behind the existing `StorageDriver`
   interface and set `STORAGE_DRIVER=s3` (a clear TODO is in `src/lib/storage`).
4. **Build & run.** `npm run build && npm start`.

---

## Selling it as SaaS

The app is multi-tenant from day one:

- Every user belongs to an **Organization** (tenant); all data and assets are
  org-scoped.
- **Credits** and a **plan** field per org are already modelled — wire Stripe to
  `purchasedCredits` / `plan` to charge for usage or subscriptions.
- The image provider, storage, and billing guards are swappable interfaces, so
  larger customers could bring their own API key / bucket.

---

## Roadmap

- [ ] **Real Gemini output** polish + a couple of curated example galleries.
- [ ] **Batch mode** — upload several cards, generate a themed set.
- [ ] **Video (Phase 2):** turn a still into a short reel via Veo / Seedance-style
      APIs (a `VideoProvider` interface mirroring the image one).
- [ ] **Direct Instagram publishing** (Graph API) with per-region captions.
- [x] **Stripe billing** on the credits/plan model — checkout, customer portal,
      signature-verified webhooks, plans → monthly credits. See
      [`docs/BILLING.md`](./docs/BILLING.md). Plus a gated **super-admin** at `/admin`.
- [ ] **S3/R2 storage driver** for serverless/multi-node deploys.
- [ ] **More regions & scene templates**, plus a "brand kit" per studio.

---

## Project structure

```
src/
  app/                 # routes: landing, login, signup, studio, /api/*
  components/          # UI (brand, header, auth form, studio client)
  lib/
    prompt/            # region/mood/aspect catalogs + prompt builder (the IP)
    providers/         # ImageProvider: mock + Gemini (REST)
    security/          # password, tokens, upload validation, rate limit
    billing/           # spend cap + credits
    generation/        # pipeline + tenant-scoped store & accounting
    storage/           # StorageDriver + local disk
    auth/              # service, sessions, cookies, server actions
    server/            # env-wired singletons
prisma/schema.prisma   # Organization / User / Session / Generation
```

---

Built for Indian wedding-card studios. 💍
