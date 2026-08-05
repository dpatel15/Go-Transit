"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthFormState } from "@/lib/auth/actions";

type Action = (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export function AuthForm({ mode, action }: { mode: "login" | "signup"; action: Action }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {isSignup && (
        <div>
          <label className="label" htmlFor="orgName">
            Studio / shop name (optional)
          </label>
          <input
            id="orgName"
            name="orgName"
            className="field mt-1.5"
            placeholder="e.g. Rangoli Wedding Cards"
            autoComplete="organization"
            maxLength={80}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className="field mt-1.5" autoComplete="email" />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isSignup ? 10 : undefined}
          className="field mt-1.5"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
        {isSignup && (
          <p className="mt-1.5 text-xs text-muted">At least 10 characters, including a letter and a number.</p>
        )}
      </div>

      {state.error && (
        <p className="rounded-lg bg-maroon/10 px-3 py-2 text-sm text-maroon" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-maroon underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-maroon underline underline-offset-2">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
