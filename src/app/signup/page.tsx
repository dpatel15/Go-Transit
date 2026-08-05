import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { signupAction } from "@/lib/auth/actions";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  if (await getCurrentSession()) redirect("/studio");
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="justify-center" />
          <h1 className="mt-6 font-display text-3xl text-ink">Create your studio</h1>
          <p className="mt-2 text-sm text-muted">
            Start turning card photos into premium posts. Free preview mode included.
          </p>
        </div>
        <div className="card-surface p-8">
          <AuthForm mode="signup" action={signupAction} />
        </div>
      </div>
    </main>
  );
}
