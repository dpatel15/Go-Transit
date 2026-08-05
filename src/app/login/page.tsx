import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { loginAction } from "@/lib/auth/actions";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/studio");
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your studio.</p>
        </div>
        <div className="card-surface p-8">
          <AuthForm mode="login" action={loginAction} />
        </div>
      </div>
    </main>
  );
}
