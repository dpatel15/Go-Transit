/**
 * Pure super-admin allowlist check (no env/IO), so it's unit-testable. The
 * actual allowlist comes from the SUPER_ADMIN_EMAILS env var — meaning admin
 * access requires server configuration, not just a database flag someone could
 * flip. Case-insensitive, whitespace-tolerant.
 */
export function isAllowedAdminEmail(email: string | null | undefined, allowlist: readonly string[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return allowlist.some((a) => a.trim().toLowerCase() === normalized);
}
