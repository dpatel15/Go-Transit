/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useRef, useState } from "react";
import {
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_MOOD,
  DEFAULT_REGION,
  MOODS,
  REGIONS,
  getRegion,
  getMood,
  getAspectRatio,
} from "@/lib/prompt";
import type { AspectRatioId, MoodId, RegionId } from "@/lib/prompt";

interface GalleryItem {
  id: string;
  url: string;
  download: string;
  region: string;
  mood: string;
  aspectRatio: string;
}

interface GenResult {
  id: string;
  outputUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  seed: number;
  provider: string;
  costUsd: number;
  remainingCredits: number;
  region: string;
  mood: string;
  aspectRatio: string;
}

export function StudioClient({
  remainingCredits,
  previewMode,
  initialGallery,
}: {
  orgName: string;
  remainingCredits: number;
  previewMode: boolean;
  initialGallery: GalleryItem[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionId>(DEFAULT_REGION);
  const [mood, setMood] = useState<MoodId>(DEFAULT_MOOD);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>(DEFAULT_ASPECT_RATIO);
  const [notes, setNotes] = useState("");
  const [seed, setSeed] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const [credits, setCredits] = useState(remainingCredits);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | null) => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
    setFile(f);
    setResult(null);
    setError(null);
    setSeed(null);
  };

  const generate = useCallback(
    async (newLook = false) => {
      if (!file) {
        setError("Please choose a card photo first.");
        return;
      }
      setWorking(true);
      setError(null);
      const fd = new FormData();
      fd.set("image", file);
      fd.set("region", region);
      fd.set("mood", mood);
      fd.set("aspectRatio", aspectRatio);
      if (notes.trim()) fd.set("notes", notes.trim());
      const useSeed = newLook ? Math.floor(Math.random() * 1_000_000_000) : seed;
      if (useSeed !== null && useSeed !== undefined) fd.set("seed", String(useSeed));

      try {
        const res = await fetch("/api/generate", { method: "POST", body: fd });
        const data = (await res.json()) as GenResult & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Generation failed. Please try again.");
          return;
        }
        setResult(data);
        setSeed(data.seed);
        setCredits(data.remainingCredits);
        setGallery((g) => [
          {
            id: data.id,
            url: data.outputUrl,
            download: data.downloadUrl,
            region: data.region,
            mood: data.mood,
            aspectRatio: data.aspectRatio,
          },
          ...g,
        ]);
      } catch {
        setError("Network error — please try again.");
      } finally {
        setWorking(false);
      }
    },
    [file, region, mood, aspectRatio, notes, seed],
  );

  const regionInfo = getRegion(region);
  const moodInfo = getMood(mood);
  const aspectInfo = getAspectRatio(aspectRatio);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Create a post</h1>
          <p className="mt-1 text-sm text-muted">Upload a card photo, choose a look, and generate.</p>
        </div>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-gold-dark">
          {credits} credit{credits === 1 ? "" : "s"} left this month
        </span>
      </div>

      {previewMode && (
        <div className="rounded-xl border border-gold/30 bg-cream/60 px-4 py-3 text-sm text-ink/80">
          <strong className="font-medium">Preview mode.</strong> You&rsquo;re seeing free mock composites. Add a
          Gemini API key (see the README) to switch on photoreal output — your $10 spend cap stays enforced.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Controls */}
        <div className="card-surface space-y-5 p-6">
          <div>
            <span className="label">1 · Card photo</span>
            <label
              className="mt-2 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink/25 bg-white/60 text-center transition hover:border-gold"
              htmlFor="card-input"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Selected card" className="h-full w-full object-contain" />
              ) : (
                <span className="px-6 text-sm text-muted">
                  Tap to choose a photo of the card
                  <br />
                  <span className="text-xs">JPEG, PNG or WebP · up to 12&nbsp;MB</span>
                </span>
              )}
            </label>
            <input
              id="card-input"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="region">
                2 · Region / style
              </label>
              <select
                id="region"
                className="field mt-1.5"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionId)}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                    {r.featured ? " ★" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">{regionInfo.blurb}</p>
            </div>

            <div>
              <label className="label" htmlFor="mood">
                3 · Mood
              </label>
              <select
                id="mood"
                className="field mt-1.5"
                value={mood}
                onChange={(e) => setMood(e.target.value as MoodId)}
              >
                {MOODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">{moodInfo.blurb}</p>
            </div>
          </div>

          <div>
            <span className="label">4 · Size</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectRatio(a.id)}
                  className={
                    "rounded-full border px-4 py-1.5 text-sm transition " +
                    (aspectRatio === a.id
                      ? "border-maroon bg-maroon text-ivory"
                      : "border-ink/15 text-ink/80 hover:border-ink/30")
                  }
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{aspectInfo.use}</p>
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Extra note (optional)
            </label>
            <input
              id="notes"
              className="field mt-1.5"
              value={notes}
              maxLength={200}
              placeholder="e.g. softer background, more marigold"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-maroon/10 px-3 py-2 text-sm text-maroon" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={working || !file}
            onClick={() => generate(false)}
          >
            {working ? "Creating your photoshoot…" : "Generate"}
          </button>
        </div>

        {/* Result */}
        <div className="card-surface flex flex-col p-6">
          <span className="label">Result</span>
          <div className="mt-2 flex flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-cream to-sand/50 p-4">
            {working ? (
              <div className="animate-pulse text-sm text-muted">Styling the scene…</div>
            ) : result ? (
              <img
                src={result.outputUrl}
                alt="Generated premium card photo"
                className="max-h-[520px] w-auto rounded-lg shadow-premium"
              />
            ) : (
              <div className="max-w-xs text-center text-sm text-muted">
                Your premium shot will appear here. Upload a card and press Generate.
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>{getRegion(result.region as RegionId).label}</span>
                <span>· {getMood(result.mood as MoodId).label}</span>
                <span>· {result.width}×{result.height}</span>
                <span>· seed {result.seed}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={result.downloadUrl} className="btn-gold flex-1 text-center">
                  Download
                </a>
                <button type="button" className="btn-outline flex-1" disabled={working} onClick={() => generate(true)}>
                  Try another look
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {gallery.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-ink">Your recent posts</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {gallery.map((g) => (
              <a
                key={g.id}
                href={g.download}
                className="group relative overflow-hidden rounded-xl border border-ink/10 bg-white/60"
                title="Download"
              >
                <img
                  src={g.url}
                  alt="Generated card"
                  loading="lazy"
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.03]"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
