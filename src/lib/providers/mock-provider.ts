import sharp from "sharp";
import { pick, seededRng } from "@/lib/prompt/rng";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "./types";

/**
 * MockProvider — a free, offline, deterministic stand-in for a real image model.
 *
 * It doesn't call any AI; instead it composites the uploaded card onto a warm
 * gradient backdrop at the exact target size, with a soft shadow and a small
 * "mock preview" caption. That's enough to exercise the entire pipeline (upload
 * -> generate -> store -> download in Instagram sizes) at zero cost, and to run
 * the full test suite without any API key or network.
 */

const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#f3e2c7", "#c98b5a"],
  ["#f6ead6", "#a8722f"],
  ["#efd9c3", "#8f3341"],
  ["#e9e3d6", "#6e1e2a"],
  ["#f4ecd9", "#3f5a4a"],
];

function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

export class MockProvider implements ImageProvider {
  readonly name = "mock";
  readonly costPerImageUsd = 0;

  async generate(params: GenerateImageParams): Promise<GeneratedImage> {
    const { width: W, height: H } = params.target;
    const rng = seededRng(params.seed ?? 1);
    const palette = pick(rng, PALETTES);
    const c1 = palette[0];
    const c2 = palette[1];
    const caption = xmlEscape("Kankotri Studio · mock preview");
    const captionSize = Math.round(Math.min(W, H) * 0.03);

    const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <radialGradient id="v" cx="50%" cy="42%" r="80%">
          <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.30"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" fill="url(#v)"/>
      <text x="50%" y="${H - Math.round(H * 0.03)}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="${captionSize}"
        fill="#ffffff" fill-opacity="0.72" letter-spacing="2">${caption}</text>
    </svg>`;

    // Fit the card within ~72% of the frame, preserving its aspect ratio.
    const boxW = Math.round(W * 0.72);
    const boxH = Math.round(H * 0.72);
    const card = await sharp(params.image.data)
      .rotate() // honour EXIF orientation from phone photos
      .resize(boxW, boxH, { fit: "inside", withoutEnlargement: false })
      .toBuffer({ resolveWithObject: true });

    const cw = card.info.width;
    const ch = card.info.height;
    const left = Math.round((W - cw) / 2);
    const top = Math.round((H - ch) / 2);

    const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect x="${left}" y="${top + Math.round(ch * 0.03)}" width="${cw}" height="${ch}"
        rx="14" fill="#000000" fill-opacity="0.35"/>
    </svg>`;
    const shadow = await sharp(Buffer.from(shadowSvg)).blur(22).png().toBuffer();

    const data = await sharp(Buffer.from(bgSvg))
      .composite([
        { input: shadow, top: 0, left: 0 },
        { input: card.data, top, left },
      ])
      .jpeg({ quality: 88 })
      .toBuffer();

    return {
      data,
      mimeType: "image/jpeg",
      provider: this.name,
      model: "mock-composite",
      costUsd: 0,
      seed: params.seed,
    };
  }
}
