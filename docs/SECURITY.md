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
- A hard in-app **USD spend cap** (`SPEND_LIMIT_USD`, default $10) refuses paid
  generations once reached; per-tenant **monthly credits** add a second gate.
  Both are checked *before* any provider call. `src/lib/billing/spend-guard.ts`,
  `src/lib/generation/pipeline.ts`.
- **Rate limiting** on auth and generate endpoints (`src/lib/security/rate-limit.ts`).

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
- `npm audit` flags **Next.js's internally bundled** postcss/sharp (build tooling
  and the image-optimizer path). User uploads use the patched top-level sharp and
  are not routed through Next's optimizer; fully clearing the advisories requires
  upgrading to Next 16.
- Rate limiting is in-memory (per instance) — move to Redis/Upstash for
  multi-instance production.
- Consider adding an explicit CSRF token to the generate `fetch` (currently
  protected by `sameSite=lax` cookies + same-origin `connect-src 'self'` CSP);
  server actions already carry Next's built-in action protection.
- Add output/content moderation hooks before publishing generated images.

## Reporting a vulnerability
Please open a private report to the repository owner rather than a public issue.
