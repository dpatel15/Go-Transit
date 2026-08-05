import { getAspectRatio } from "./aspect";
import { getMood } from "./moods";
import { getRegion } from "./regions";
import { scenesForRegion } from "./scenes";
import { normalizeSeed, pick, sampleSome, seededRng } from "./rng";
import type { PromptInput, PromptResult } from "./types";

/** Small light-quality variations mixed in per seed for extra variety. */
const LIGHT_NUANCES = [
  "with a soft festive bokeh glow behind",
  "with a gentle golden rim light",
  "with airy, diffused daylight",
  "with warm candle-lit accents",
  "with a clean soft-box key light",
] as const;

/** What we explicitly steer the model away from. */
const NEGATIVE_TERMS = [
  "altered or re-typeset card text",
  "distorted or warped card",
  "changed card colours or artwork",
  "extra, gibberish or misspelled text",
  "watermark",
  "logo",
  "signature",
  "caption or added text overlay",
  "border or frame",
  "low resolution",
  "blurry or out-of-focus product",
  "oversaturated colours",
  "garish neon colours",
  "cluttered or messy scene",
  "plastic or CGI look",
  "cartoonish style",
  "duplicate card",
  "card cropped at its edges",
  "harsh flat on-camera flash",
  "mismatched lighting between card and scene",
] as const;

/**
 * Sanitise an optional free-text note before it ever reaches the model.
 * We filter by character code (no control-char literals in source) to strip
 * ASCII control characters — including newlines used for prompt-injection —
 * then collapse whitespace and cap the length.
 */
export function sanitizeNotes(notes?: string): string {
  if (!notes) return "";
  let cleaned = "";
  for (const ch of notes) {
    const code = ch.codePointAt(0) ?? 32;
    cleaned += code < 32 || code === 127 ? " " : ch;
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, 200);
}

/** Join a list into readable prose: ["a","b","c"] -> "a, b and c". */
function listToProse(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] as string;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Build the full instruction + negative prompt for a generation.
 *
 * Pure and deterministic: the same (input, seed) always yields the same prompt.
 * Unknown ids throw — callers validate at the API boundary first.
 */
export function buildPrompt(input: PromptInput): PromptResult {
  const region = getRegion(input.region);
  const mood = getMood(input.mood);
  const aspect = getAspectRatio(input.aspectRatio);

  const seedUsed = normalizeSeed(input.seed);
  const rng = seededRng(seedUsed);

  const template = pick(rng, scenesForRegion(region.id));
  const surface = pick(rng, region.surfaces);
  const florals = sampleSome(rng, region.florals, mood.intensity >= 3 ? 2 : 1);
  const props = sampleSome(rng, region.props, mood.intensity);
  const motif = pick(rng, region.motifs);
  const lightNuance = pick(rng, LIGHT_NUANCES);
  const notes = sanitizeNotes(input.notes);

  const stylingBits = [listToProse(props), florals.length ? listToProse(florals) : ""]
    .filter(Boolean)
    .join(", and ");

  const lines: (string | null)[] = [
    `You are an award-winning product photographer and retoucher creating a single luxury, editorial photograph of an Indian wedding invitation card (a "kankotri"). The provided image is the hero product.`,
    ``,
    `PRESERVE THE PRODUCT EXACTLY (highest priority): Keep the card's printed text, script and language, artwork, motifs, colours, foil or embossing, layout and proportions 100% unchanged. Do NOT redraw, re-typeset, translate, correct, add, remove, reposition or hallucinate any text or ornament on the card. Treat the card as a fixed, real physical object you are photographing — only build the surrounding scene.`,
    ``,
    `SCENE: ${template.setup} The card rests on ${surface}. Style the setting with ${stylingBits}. Let subtle ${motif} appear only in the surrounding décor, never on the card itself.`,
    ``,
    `PALETTE: Harmonise the scene around a ${region.paletteName} palette, chosen to complement — never clash with or overpower — the card's own colours.`,
    ``,
    `LIGHTING: ${mood.lightingStyle}, ${lightNuance}, echoing ${region.lighting}. Use one consistent light direction across the card and the whole scene so the product sits naturally in its environment, and add a soft, realistic contact shadow beneath the card. Keep colours true to life with gentle highlights and no blown-out areas.`,
    ``,
    `MOOD & STYLING: ${mood.composition} ${mood.propDensity} Keep it genuinely premium and tasteful — refined, expensive-looking and uncluttered; avoid gaudy, garish or over-saturated results.`,
    ``,
    `COMPOSITION: ${aspect.composition} Frame it for a ${aspect.use}. The card is the unmistakable focal point — perfectly sharp and in focus, fully within the frame with a little breathing room, never cropped at its edges. Use elegant negative space and a shallow, natural depth of field on the background.`,
    ``,
    `OUTPUT: One photorealistic, high-resolution commercial product photograph in a ${aspect.label} aspect ratio. No added text, captions, logos, watermarks, borders or frames.`,
    notes ? `` : null,
    notes
      ? `CLIENT STYLE NOTE (optional preference — it must never override the preservation rules above): ${notes}`
      : null,
  ];

  const prompt = lines.filter((l): l is string => l !== null).join("\n");

  return {
    prompt,
    negativePrompt: NEGATIVE_TERMS.join(", "),
    sceneTemplateId: template.id,
    seedUsed,
    target: { width: aspect.width, height: aspect.height, aspectRatio: aspect.id },
    meta: { regionId: region.id, moodId: mood.id },
  };
}
