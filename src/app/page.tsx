import Link from "next/link";

export default function Home() {
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-20 text-center">
      <p className="label mb-5 text-gold">Kankotri Studio</p>
      <h1 className="font-display text-4xl leading-tight text-ink sm:text-6xl">
        A premium photoshoot for every wedding card —
        <span className="text-maroon"> from a single phone photo.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Upload a kankotri on a plain table. Get an editorial-quality product
        shot, matched to your region and style, ready for Instagram.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/signup" className="btn-primary">
          Get started
        </Link>
        <Link href="/login" className="btn-outline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
