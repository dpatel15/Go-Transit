import "server-only";
import { redirect } from "next/navigation";
import { superAdminEmails } from "@/lib/env";
import { getCurrentSession } from "./session";
import { isAllowedAdminEmail } from "./admin-allowlist";
import type { SessionContext } from "./service";

export function isSuperAdmin(email: string | null | undefined): boolean {
  return isAllowedAdminEmail(email, superAdminEmails());
}

export async function getSuperAdminSession(): Promise<SessionContext | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  return isSuperAdmin(session.user.email) ? session : null;
}

/** For /admin pages & actions. Redirects home (doesn't reveal the area exists). */
export async function requireSuperAdmin(): Promise<SessionContext> {
  const session = await getSuperAdminSession();
  if (!session) redirect("/");
  return session;
}
