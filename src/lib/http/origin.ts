/** True when the request is same-origin (or has no Origin header, e.g. a
 * server-to-server call). Used as defense-in-depth CSRF on state-changing routes. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
