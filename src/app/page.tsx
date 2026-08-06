import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { REGIONS } from "@/lib/prompt";

const STEPS = [
  { n: "1", title: "Snap the card", body: "Lay the kankotri on any table and take a plain photo — no studio needed." },
  { n: "2", title: "Pick a look", body: "Choose your region, a mood from elegant to opulent, and the Instagram size." },
  { n: "3", title: "Post it", body: "Download a premium, editorial-quality shot with the card kept pixel-perfect." },
];

const FEATURES = [
  { title: "Region-aware", body: "Florals, fabrics and palettes tuned to Gujarati, Punjabi, South Indian and more." },
  { title: "Your card, untouched", body: "The design and text stay exactly as printed — only the scene around it is created." },
  { title: "Spend-safe", body: "A hard cost cap and per-studio credits keep AI spend fully under control." },
  { title: "Instagram-ready", body: "Exports in 4:5, 1:1 and 9:16 for feed posts, the grid and Stories or Reels." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="container-page grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="label text-maroon">For wedding-card studios</p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              A premium photoshoot for every kankotri, from one phone photo.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Upload a card on a plain table and get an editorial-quality product shot, matched to your region and
              style, ready for Instagram in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
              <Link href="#how" className="btn-outline">
                How it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">Free preview mode — no API key needed to try it.</p>
          </div>

          {/* Flat sample — no gradient, no glow */}
          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:ml-auto">
            <div className="card-surface p-5 sm:p-7">
              <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-cream">
                <div className="aspect-[3/4] w-3/5 rounded-md border border-ink/10 bg-white">
                  <div className="flex h-full flex-col items-center justify-between px-4 py-6">
                    <span className="h-1.5 w-12 rounded-full bg-maroon/30" />
                    <div className="w-full space-y-2">
                      <span className="mx-auto block h-1.5 w-3/4 rounded-full bg-ink/15" />
                      <span className="mx-auto block h-1.5 w-2/3 rounded-full bg-ink/10" />
                    </div>
                    <span className="h-1.5 w-14 rounded-full bg-maroon/20" />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted">A phone photo, restyled into a premium shot.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-ink/10">
          <div className="container-page py-16">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Three steps to a premium post</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card-surface p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-maroon/25 font-display text-base text-maroon">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-ink/10">
          <div className="container-page py-16">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card-surface p-6">
                  <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Regions */}
        <section className="border-t border-ink/10">
          <div className="container-page py-14">
            <h2 className="text-center font-display text-xl font-semibold text-ink sm:text-2xl">
              Built for India&rsquo;s wedding styles
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {REGIONS.map((r) => (
                <span
                  key={r.id}
                  className="rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink/80"
                >
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-ink/10">
          <div className="container-page py-16">
            <div className="rounded-2xl bg-maroon px-6 py-12 text-center text-ivory sm:px-10 sm:py-14">
              <h2 className="mx-auto max-w-2xl font-display text-2xl font-semibold sm:text-3xl">
                Turn this season&rsquo;s cards into scroll-stopping posts.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ivory/80">
                Create your studio in a minute and start with free preview generations today.
              </p>
              <Link href="/signup" className="btn-onaccent mt-8">
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted sm:flex-row">
          <span className="font-display text-ink">Kankotri Studio</span>
          <span>Premium AI photoshoots for Indian wedding cards.</span>
        </div>
      </footer>
    </>
  );
}
