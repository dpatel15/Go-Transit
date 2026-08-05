# Security posture

Kankotri Studio handles user accounts, uploaded images, and a paid AI API key,
so security was designed in from the start. This document describes the controls
in place and the known follow-ups.

## Threat model (who we defend against)

- **Anonymous internet users** hitting the API directly.
- **A logged-in tenant** trying to read another tenant's cards/generations.
- **A malicious upload** (crafted image) aimed at the server.
- **A leaked database** — what an attacker gains from a dump.
- **Runaway cost** — accidental or malicious over-use of the paid API.

## Controls

### Authentication & sessions
- Passwords hashed with **scrypt** (memory-hard KDF, per-hash random salt),
  compared with `timingSafeEqual`. `src/lib/security/password.ts`.
- Login runs the same hashing work whether or not the account exists (a fixed
  dummy hash), so response timing does not reveal which emails are registered.
  Login/signup errors are generic. `src/lib/auth/service.ts`.
- Session tokens are **256-bit opaque random** values. Only the **SHA-256 hash**
  is stored; the raw token lives solely in the cookie. A DB leak yields no usable
  sessions. `src/lib/security/tokens.ts`.
- Cookies: `httpOnly`, `sameSite=lax`, `path=/`, and `secure` in production.
  Expiry is checked server-side on every request; logout deletes the session row.
  `src/lib/auth/session-cookie.ts`, `src/lib/auth/session.ts`.

### Multi-tenant isolation
- Every generation read is filtered by `orgId` (`createGenerationStore`).
- Private assets are served only via `GET /api/assets/[...key]`, which requires a
  session **and** checks (a) the key is prefixed with the caller's `orgId` and
  (b) a generation with that id belongs to the org, before streaming bytes.
  There is no public bucket. `src/app/api/assets/[...key]/route.ts`.

### Upload safety
- **Magic-byte sniffing** confirms the bytes really are JPEG/PNG/WebP (not a
  trusted extension/mime).
- **Limits:** max bytes, min/max dimensions, and a total-pixel cap to block
  decompression bombs (also passed to sharp as `limitInputPixels`).
- **Re-encoding** through the patched top-level `sharp` strips EXIF/metadata and
  neutralises any exploit hidden in the original container. `src/lib/security/upload.ts`.

### Secret handling
- The Gemini API key is sent in the `x-goog-api-key` **header**, never in the URL
  (so it can't leak through request logs/referrers).
- Error bodies from the provider are **redacted** of the key before surfacing.
- The key is only ever read server-side; it is never bundled to the client.
  `src/lib/providers/gemini-provider.ts`.

### Spend & abuse limits
- A hard in-app **USD spend cap** (`SPEND_LIMIT_USD`, default $10) plus per-tenant
  **monthly credits** gate every generation. The flow is hardened against the
  check-then-act race: a credit is **reserved atomically** (guarded conditional
  update) before any work, the pending row carries the estimated cost so
  concurrent requests see each other's in-flight spend, and an authoritative
  re-check runs against the committed total. Any failure or over-cap **releases**
  both the credit and the spend estimate — a failed paid call never leaves
  phantom spend or burns a credit. Because credits bound each tenant's spend,
  they also serve as a per-tenant sub-cap under the shared global ceiling.
  `src/lib/generation/pipeline.ts`, `src/lib/generation/store.ts`.
- **Rate limiting** on auth and generate endpoints, keyed on **both client IP and
  the submitted account** so brute-forcing one account is throttled even if the
  (spoofable) forwarded IP is rotated. `src/lib/security/rate-limit.ts`.
- **CSRF:** state-changing routes are same-origin only — `/api/generate` checks
  the `Origin` header and the session cookie is `SameSite=Lax`; server actions
  carry Next's built-in action protection.
- **Error hygiene:** provider/internal errors are logged server-side and never
  returned verbatim; `/api/health` leaks no configuration.

### Transport & headers
Set by `src/middleware.ts` on every response and verified on the running server:
- **Content-Security-Policy** with a per-request **nonce** for scripts (no blanket
  `unsafe-inline` for scripts), `frame-ancestors 'none'`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  disabling camera/mic/geo, and **HSTS** in production.

### Prompt-injection
User "notes" are sanitised (control characters stripped, length-capped) and
embedded as a clearly-labelled optional hint that must not override the
product-preservation rules. `src/lib/prompt/build.ts`.

## Known follow-ups / hardening backlog
- **Rate-limit store & trusted IP:** the limiter is in-memory (per instance) —
  move to Redis/Upstash for multi-instance production. `getClientIp` should be
  configured to read only your platform's trusted proxy hop so `X-Forwarded-For`
  can't be spoofed; IP + account keying already limits the blast radius.
- **Next-bundled advisories:** `npm audit` flags Next.js's internally bundled
  postcss/sharp (build tooling / image-optimizer path). User uploads use the
  patched top-level sharp and are not routed through Next's optimizer; fully
  clearing the advisories requires upgrading to Next 16.
- **Signup enumeration:** signup still reveals whether an email is registered
  (helpful UX without an email-verification flow). It is rate-limited per IP and
  per account; add email verification / a neutral response to fully close it.
- **Per-tenant spend alerting:** credits bound per-tenant spend; add alerting on
  rapid global spend for early warning.
- **Content moderation:** add moderation hooks before publishing generated images.
- **Strict style CSP:** `style-src` still allows `unsafe-inline` (common with
  Tailwind/React inline styles); scripts are already nonce-gated.

## Reporting a vulnerability
Please open a private report to the repository owner rather than a public issue.
