import type { RegionId, SceneTemplate } from "./types";

/**
 * Staging templates. "any"-scope sets are region-neutral compositions that work
 * everywhere (and combine with each region's own props/palette for variety);
 * region-scoped sets add signature stagings. The seed selects among all
 * templates valid for the chosen region, so re-running gives a fresh-but-
 * coherent look every time.
 */
export const SCENE_TEMPLATES: readonly SceneTemplate[] = [
  // ---- Region-neutral premium compositions --------------------------------
  {
    id: "flatlay-editorial",
    scope: "any",
    name: "Overhead flat-lay",
    setup:
      "Shoot directly overhead as an elegant flat-lay, the card laid flat and perfectly square to the frame with styling arranged around its corners.",
  },
  {
    id: "propped-hero",
    scope: "any",
    name: "Softly propped hero",
    setup:
      "Stand the card gently propped at a slight angle as the clear hero, a soft out-of-focus backdrop behind it.",
  },
  {
    id: "draped-fabric",
    scope: "any",
    name: "Draped fabric bed",
    setup:
      "Rest the card on a softly draped fabric with graceful folds catching the light, a single floral accent nearby.",
  },
  {
    id: "negative-space",
    scope: "any",
    name: "Minimal negative space",
    setup:
      "Place the card slightly off-centre with expansive, calm negative space and a lone, deliberate prop.",
  },
  {
    id: "bokeh-backdrop",
    scope: "any",
    name: "Warm bokeh backdrop",
    setup:
      "Set the card in the foreground against a warm, softly glowing bokeh of festive lights far behind it.",
  },

  // ---- Gujarati -----------------------------------------------------------
  {
    id: "guj-brass-marigold",
    scope: ["gujarati"],
    name: "Brass & marigold",
    setup:
      "Rest the card beside a gently lit brass diya with loose marigold petals scattered just off to one side and a mango-leaf toran softly blurred behind.",
  },
  {
    id: "guj-thali",
    scope: ["gujarati"],
    name: "Festive thali",
    setup:
      "Lay the card on a brushed brass thali flanked by betel leaves, a small kalash and a scatter of marigold, warm festive light washing across it.",
  },
  {
    id: "guj-bandhani-drape",
    scope: ["gujarati", "marwari"],
    name: "Bandhani drape",
    setup:
      "Prop the card against a folded bandhani drape with a fresh marigold garland framing the lower edge and ivory space above.",
  },

  // ---- Universal premium --------------------------------------------------
  {
    id: "uni-marble-orchid",
    scope: ["universal"],
    name: "Marble & orchid",
    setup:
      "Centre the card on honed marble with a single white-orchid sprig and a whisper of silk ribbon, cool clean light and lots of air.",
  },
  {
    id: "uni-linen-topdown",
    scope: ["universal"],
    name: "Linen flat-lay",
    setup:
      "Lay the card flat on fine linen shot from above, a few soft petals and one slim candle placed with restraint.",
  },

  // ---- Marwari / Rajasthani ----------------------------------------------
  {
    id: "mar-velvet-gold",
    scope: ["marwari"],
    name: "Velvet & gold",
    setup:
      "Rest the card on deep velvet beside an ornate brass lamp and gota-patti fabric, regal light pooling around it.",
  },

  // ---- Punjabi ------------------------------------------------------------
  {
    id: "pun-phulkari",
    scope: ["punjabi"],
    name: "Phulkari & brass",
    setup:
      "Set the card over a folded phulkari dupatta with a brass tray and marigold garland, bright celebratory light.",
  },

  // ---- South Indian -------------------------------------------------------
  {
    id: "south-lamp-jasmine",
    scope: ["south-indian"],
    name: "Lamp & jasmine",
    setup:
      "Place the card beside a lit brass kuthu vilakku with strings of jasmine and betel leaves, a warm lamp glow across the scene.",
  },

  // ---- Bengali ------------------------------------------------------------
  {
    id: "beng-shankha-shiuli",
    scope: ["bengali"],
    name: "Shankha & shiuli",
    setup:
      "Rest the card on handloom cotton with a red-and-white shankha and scattered shiuli flowers, soft warm light.",
  },
];

/** All templates valid for a region: its own plus every region-neutral set. */
export function scenesForRegion(regionId: RegionId): SceneTemplate[] {
  return SCENE_TEMPLATES.filter(
    (t) => t.scope === "any" || (Array.isArray(t.scope) && t.scope.includes(regionId)),
  );
}
