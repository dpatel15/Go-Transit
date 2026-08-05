"use server";

import { redirect } from "next/navigation";
import { authService, authRateLimiter } from "@/lib/server/services";
import { getClientIp } from "@/lib/http/ip";
import { AuthError } from "./service";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "./session-cookie";

export interface AuthFormState {
  error?: string;
}

async function rateLimited(scope: string): Promise<boolean> {
  const ip = await getClientIp();
  return !authRateLimiter.check(`${scope}:${ip}`).allowed;
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (await rateLimited("signup")) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("orgName") ?? "").trim();

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
  if (await rateLimited("login")) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

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
