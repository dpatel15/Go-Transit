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
  { title: "Instagram-ready", body: "Exports in 4:5, 1:1 and 9:16 for feed posts, the grid and Stories/Reels." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <main>
        <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="label text-gold">For wedding-card studios</p>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
              A premium photoshoot for every kankotri —
              <span className="text-maroon"> from one phone photo.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Upload a card on a plain table and get an editorial-quality product shot, matched to your region
              and style, ready for Instagram in seconds.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
              <Link href="#how" className="btn-outline">
                How it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">Free preview mode — no API key needed to try it.</p>
          </div>

          {/* Decorative "after" panel */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="aspect-[4/5] rounded-xl2 bg-gradient-to-br from-cream via-sand/70 to-gold/30 p-8 shadow-premium">
              <div className="flex h-full items-center justify-center">
                <div className="relative aspect-[3/4] w-2/3 rounded-lg bg-ivory shadow-card ring-1 ring-ink/10">
                  <div className="absolute inset-x-6 top-8 space-y-2">
                    <div className="mx-auto h-2 w-16 rounded-full bg-gold/70" />
                    <div className="mx-auto h-1.5 w-24 rounded-full bg-ink/15" />
                    <div className="mx-auto h-1.5 w-20 rounded-full bg-ink/10" />
                  </div>
                  <div className="absolute inset-x-6 bottom-8 space-y-1.5">
                    <div className="mx-auto h-1.5 w-20 rounded-full bg-ink/10" />
                    <div className="mx-auto h-1.5 w-14 rounded-full bg-maroon/40" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-gold/40 blur-xl" />
            <div className="absolute -bottom-5 right-6 h-20 w-20 rounded-full bg-maroon/25 blur-xl" />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-ink/10 bg-white/50">
          <div className="container-page py-16">
            <h2 className="text-center font-display text-3xl text-ink">Three steps to a premium post</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-maroon font-display text-lg text-ivory">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container-page py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-surface p-6">
                <h3 className="font-display text-lg text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regions */}
        <section className="container-page pb-8">
          <h2 className="text-center font-display text-2xl text-ink">Built for India&rsquo;s wedding styles</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {REGIONS.map((r) => (
              <span
                key={r.id}
                className="rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-sm text-ink/80"
              >
                {r.label}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-page py-16">
          <div className="rounded-xl2 bg-maroon px-8 py-14 text-center text-ivory shadow-premium">
            <h2 className="font-display text-3xl">Turn this season&rsquo;s cards into scroll-stopping posts.</h2>
            <p className="mx-auto mt-3 max-w-xl text-ivory/80">
              Create your studio in a minute and start with free preview generations today.
            </p>
            <Link href="/signup" className="btn-gold mt-8">
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted sm:flex-row">
          <span className="font-display text-ink">Kankotri Studio</span>
          <span>Premium AI photoshoots for Indian wedding cards.</span>
        </div>
      </footer>
    </>
  );
}
