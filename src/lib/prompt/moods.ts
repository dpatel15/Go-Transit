import type { Mood, MoodId } from "./types";

/**
 * Mood ladder from restrained to lavish. "Elegant" is the recommended default —
 * premium and tasteful. Higher intensities add props, colour and drama for the
 * occasional bolder hero post, without tipping into gaudy.
 */
export const MOODS: readonly Mood[] = [
  {
    id: "minimal",
    label: "Minimal Luxe",
    blurb: "Airy, gallery-like, lots of negative space. Ultra-clean.",
    intensity: 1,
    propDensity: "Use only one or two tiny accents and lots of empty, breathing space.",
    lightingStyle: "even, soft diffused light with the faintest gradient",
    composition: "Calm and editorial, with the card floating in generous negative space.",
  },
  {
    id: "elegant",
    label: "Elegant",
    blurb: "Refined and premium — our recommended default.",
    intensity: 2,
    propDensity: "Place a few carefully chosen props with clear space between them.",
    lightingStyle: "soft directional light with a gentle falloff",
    composition: "Balanced and considered, the card clearly the hero with quiet supporting details.",
  },
  {
    id: "festive",
    label: "Festive",
    blurb: "Warm, celebratory, wedding-season glow.",
    intensity: 3,
    propDensity: "Layer several coordinated props and florals for a warm, abundant feel — still curated.",
    lightingStyle: "warm, glowing light with soft festive bokeh",
    composition: "Rich and inviting, with layered depth around the hero card.",
  },
  {
    id: "opulent",
    label: "Opulent",
    blurb: "Lavish and grand — use sparingly for statement posts.",
    intensity: 4,
    propDensity: "Build a luxurious, layered abundance of florals, metals and textures — opulent but never cluttered.",
    lightingStyle: "dramatic, directional light with deep, rich shadows and luminous highlights",
    composition: "Grand and cinematic, the card enthroned amid lush, high-end styling.",
  },
];

export function getMood(id: string): Mood {
  const mood = MOODS.find((m) => m.id === id);
  if (!mood) throw new Error(`Unknown mood: ${id}`);
  return mood;
}

export function isMoodId(id: string): id is MoodId {
  return MOODS.some((m) => m.id === id);
}

export const DEFAULT_MOOD: MoodId = "elegant";
