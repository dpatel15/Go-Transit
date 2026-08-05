import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers for every response, including a nonce-based Content Security
 * Policy. Next.js reads the CSP from the forwarded request headers and stamps
 * the same nonce onto its own scripts, so hydration keeps working under a strict
 * policy (no blanket 'unsafe-inline' for scripts).
 */
export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' is only needed by the dev React refresh runtime.
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    isProd ? `upgrade-insecure-requests` : "",
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("x-dns-prefetch-control", "off");
  if (isProd) {
    response.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export const config = {
  // Run on everything except Next's static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
