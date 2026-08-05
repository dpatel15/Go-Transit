import "server-only";
import { redirect } from "next/navigation";
import { authService } from "@/lib/server/services";
import { getSessionToken } from "./session-cookie";
import type { SessionContext } from "./service";

/** Resolve the current session (or null) from the cookie. */
export async function getCurrentSession(): Promise<SessionContext | null> {
  const token = await getSessionToken();
  return authService.getSessionUser(token);
}

/** For protected pages: redirect to /login when there's no valid session. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}
