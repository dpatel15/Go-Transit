import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { Wordmark } from "./brand";

export async function SiteHeader() {
  const session = await getCurrentSession();
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-ivory">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Wordmark />
        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          {session ? (
            <>
              <Link href="/studio" className="text-ink/80 transition hover:text-ink">
                Studio
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn-outline px-4 py-2">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink/80 transition hover:text-ink">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary px-5 py-2">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
