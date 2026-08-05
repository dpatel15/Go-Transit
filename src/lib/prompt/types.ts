/**
 * Types for the Kankotri Studio prompt/style engine.
 *
 * This module is intentionally free of any I/O, env or DB access so it can be
 * unit-tested in isolation and reused by both the API and the UI (the catalogs
 * are the single source of truth for the pickers on screen).
 */

export type RegionId =
  | "gujarati"
  | "marwari"
  | "universal"
  | "punjabi"
  | "south-indian"
  | "bengali";

export type MoodId = "minimal" | "elegant" | "festive" | "opulent";

export type AspectRatioId = "1:1" | "4:5" | "9:16";

export interface Region {
  id: RegionId;
  label: string;
  blurb: string;
  /** Fully tuned & recommended vs. usable-but-lighter styling. */
  featured: boolean;
  /** Human-readable palette name woven into the prompt. */
  paletteName: string;
  surfaces: string[];
  florals: string[];
  props: string[];
  motifs: string[];
  lighting: string;
}

export interface Mood {
  id: MoodId;
  label: string;
  blurb: string;
  /** 1 = minimal/airy … 4 = opulent/lavish. Drives prop density & flashiness. */
  intensity: 1 | 2 | 3 | 4;
  propDensity: string;
  lightingStyle: string;
  composition: string;
}

export interface AspectRatio {
  id: AspectRatioId;
  label: string;
  use: string;
  /** Target output pixels used when normalising the final image. */
  width: number;
  height: number;
  composition: string;
}

export interface SceneTemplate {
  id: string;
  /** Regions this staging suits, or "any" for region-neutral premium sets. */
  scope: RegionId[] | "any";
  name: string;
  setup: string;
}

export interface PromptInput {
  region: RegionId;
  mood: MoodId;
  aspectRatio: AspectRatioId;
  /** Optional seed for reproducible-yet-varied staging. */
  seed?: string | number;
  /** Optional free-text stylistic hint from the user (sanitised before use). */
  notes?: string;
  /** How many style-reference images the user attached (0 = none). */
  referenceCount?: number;
}

export interface PromptResult {
  prompt: string;
  negativePrompt: string;
  sceneTemplateId: string;
  seedUsed: number;
  target: { width: number; height: number; aspectRatio: AspectRatioId };
  meta: { regionId: RegionId; moodId: MoodId };
}
