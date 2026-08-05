import type { AspectRatio, AspectRatioId } from "./types";

/**
 * Output formats tuned for Instagram. Portrait 4:5 is the default because it
 * commands the most feed real-estate.
 */
export const ASPECT_RATIOS: readonly AspectRatio[] = [
  {
    id: "4:5",
    label: "4:5 portrait",
    use: "Instagram portrait feed post (max feed real-estate)",
    width: 1080,
    height: 1350,
    composition:
      "Vertical portrait framing; stack the styling above and below the card so the eye travels down the frame.",
  },
  {
    id: "1:1",
    label: "1:1 square",
    use: "Instagram feed post and profile grid",
    width: 1080,
    height: 1080,
    composition: "Balanced square framing with the card centred and even styling weight around it.",
  },
  {
    id: "9:16",
    label: "9:16 vertical",
    use: "Instagram / Facebook Story and Reel cover",
    width: 1080,
    height: 1920,
    composition:
      "Tall vertical framing; keep the card in the upper-middle third with room below for a caption overlay to be added later.",
  },
];

export function getAspectRatio(id: string): AspectRatio {
  const ar = ASPECT_RATIOS.find((a) => a.id === id);
  if (!ar) throw new Error(`Unknown aspect ratio: ${id}`);
  return ar;
}

export function isAspectRatioId(id: string): id is AspectRatioId {
  return ASPECT_RATIOS.some((a) => a.id === id);
}

export const DEFAULT_ASPECT_RATIO: AspectRatioId = "4:5";
