import type { Region, RegionId } from "./types";

/**
 * Regional style library. Gujarat is the primary market and is the most richly
 * tuned, plus a region-neutral "Universal Premium" set for tasteful variety.
 * The others are usable today and easy to deepen over time.
 *
 * Palettes/props are written as descriptive prose that flows into the prompt —
 * complementing the card, never competing with it.
 */
export const REGIONS: readonly Region[] = [
  {
    id: "gujarati",
    label: "Gujarati",
    blurb: "Marigold, brass and warm festive tones — the classic Gujarati wedding look.",
    featured: true,
    paletteName: "warm marigold, vermilion and antique-brass",
    surfaces: [
      "a fold of handloom raw silk",
      "carved teak wood",
      "a brushed brass tray",
      "ivory khadi cloth",
      "warm-toned marble",
    ],
    florals: [
      "fresh marigold (genda) garlands",
      "loose marigold petals",
      "soft red roses",
      "tuberose (rajnigandha) sprigs",
    ],
    props: [
      "a gently glowing brass diya",
      "a small brass kalash",
      "betel leaves and areca nuts",
      "a coconut dressed with a kalash",
      "strings of mango-leaf toran",
      "a little bowl of kumkum and rice",
      "an antique brass bell",
    ],
    motifs: ["bandhani tie-dye patterns", "paisley (keri) motifs", "temple-arch borders", "mirror-work (abhla) accents"],
    lighting: "warm golden-hour daylight with a soft festive glow",
  },
  {
    id: "universal",
    label: "Universal Premium",
    blurb: "Region-neutral luxury — ivory, champagne and stone. Endlessly tasteful.",
    featured: true,
    paletteName: "soft neutral-luxe of ivory, champagne gold and warm stone",
    surfaces: [
      "honed marble",
      "fine natural linen",
      "brushed matte-gold metal",
      "pale travertine stone",
      "a smooth ceramic surface",
    ],
    florals: ["white orchids", "delicate baby's breath", "soft blush roses", "eucalyptus sprigs"],
    props: [
      "a single slender taper candle",
      "a clean minimalist ceramic vessel",
      "a length of silk ribbon",
      "a neatly folded linen napkin",
      "a small stack of fine paper",
    ],
    motifs: ["subtle geometric linework", "finely embossed borders"],
    lighting: "soft, diffused studio daylight",
  },
  {
    id: "marwari",
    label: "Marwari / Rajasthani",
    blurb: "Royal maroon, jewel tones and gold — regal and grand.",
    featured: false,
    paletteName: "royal maroon, jewel tones and burnished gold",
    surfaces: ["deep velvet", "carved wood with gold detailing", "sandstone", "a brass thali"],
    florals: ["red roses", "marigold garlands", "rose petals"],
    props: [
      "gota-patti trimmed fabric",
      "a meenakari enamel box",
      "an ornate brass lamp",
      "a carved jharokha frame",
      "royal brass ware",
    ],
    motifs: ["mandana folk art", "jharokha arches", "gota-patti borders"],
    lighting: "warm, regal light with rich shadow depth",
  },
  {
    id: "punjabi",
    label: "Punjabi / North Indian",
    blurb: "Vivid reds, gold and phulkari brightness — celebratory and bold.",
    featured: false,
    paletteName: "vivid red, gold and phulkari-bright accents",
    surfaces: ["silk with phulkari embroidery", "warm wood", "a brass tray"],
    florals: ["marigold garlands", "red and pink roses", "rose petals"],
    props: ["a folded phulkari dupatta", "kaleere ornaments", "brass ware", "a decorated mehndi cone"],
    motifs: ["phulkari embroidery", "bagh floral patterns"],
    lighting: "bright, warm celebratory light",
  },
  {
    id: "south-indian",
    label: "South Indian",
    blurb: "Temple gold, kanjivaram silk and jasmine white — serene and classic.",
    featured: false,
    paletteName: "temple gold, kanjivaram-silk red and jasmine white",
    surfaces: ["kanjivaram silk", "a fresh banana leaf", "carved wood", "a brass surface"],
    florals: ["strings of jasmine (mallige)", "red roses", "betel and flowers"],
    props: [
      "a lit brass kuthu vilakku lamp",
      "betel leaves with coconut",
      "a brass urli with floating flowers",
      "a small kolam pattern in rice flour",
    ],
    motifs: ["temple gopuram borders", "kolam patterns", "annapakshi motifs"],
    lighting: "warm temple-lamp glow with soft daylight",
  },
  {
    id: "bengali",
    label: "Bengali / East Indian",
    blurb: "Red-and-white, shiuli flowers and terracotta — soft and folk-elegant.",
    featured: false,
    paletteName: "red-and-white with terracotta and gold",
    surfaces: ["handloom cotton", "terracotta", "cane weave", "brushed brass"],
    florals: ["shiuli (night jasmine)", "tuberose", "red hibiscus"],
    props: ["a white-and-red shankha (conch)", "a terracotta diya", "alpona-patterned cloth", "brass ware"],
    motifs: ["alpona rice-paste art", "terracotta temple carvings"],
    lighting: "soft, warm diffused light",
  },
];

export function getRegion(id: string): Region {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export function isRegionId(id: string): id is RegionId {
  return REGIONS.some((r) => r.id === id);
}

export const DEFAULT_REGION: RegionId = "gujarati";
