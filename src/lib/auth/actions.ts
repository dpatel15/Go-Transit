"use server";

import { redirect } from "next/navigation";
import { authService, authRateLimiter } from "@/lib/server/services";
import { getClientIp } from "@/lib/http/ip";
import { AuthError } from "./service";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "./session-cookie";

export interface AuthFormState {
  error?: string;
}

/**
 * Throttle by BOTH client IP and the submitted account, so brute-forcing one
 * account is slowed even if the (spoofable) forwarded IP is rotated.
 */
async function rateLimited(scope: string, identifier: string): Promise<boolean> {
  const ip = await getClientIp();
  const byIp = !authRateLimiter.check(`${scope}:ip:${ip}`).allowed;
  const byId = identifier
    ? !authRateLimiter.check(`${scope}:id:${identifier.toLowerCase()}`).allowed
    : false;
  return byIp || byId;
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("orgName") ?? "").trim();

  if (await rateLimited("signup", email)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  try {
    const res = await authService.signup({ email, password, orgName: orgName || undefined });
    await setSessionCookie(res.token, res.expiresAt);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    console.error("signup failed:", err);
    return { error: "Something went wrong creating your account. Please try again." };
  }
  redirect("/studio");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (await rateLimited("login", email)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  try {
    const res = await authService.login({ email, password });
    await setSessionCookie(res.token, res.expiresAt);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    console.error("login failed:", err);
    return { error: "Something went wrong signing in. Please try again." };
  }
  redirect("/studio");
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  await authService.logout(token);
  await clearSessionCookie();
  redirect("/");
}
