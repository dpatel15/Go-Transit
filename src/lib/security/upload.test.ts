import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  sniffImageType,
  validateAndNormalizeUpload,
  DEFAULT_UPLOAD_LIMITS,
} from "./upload";

async function makeImage(
  format: "png" | "jpeg" | "webp",
  w = 400,
  h = 600,
): Promise<Buffer> {
  const base = sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 60, b: 40 } } });
  if (format === "png") return base.png().toBuffer();
  if (format === "webp") return base.webp().toBuffer();
  return base.jpeg().toBuffer();
}

describe("sniffImageType", () => {
  it("detects jpeg, png and webp from magic bytes", async () => {
    expect(sniffImageType(await makeImage("jpeg"))).toBe("jpeg");
    expect(sniffImageType(await makeImage("png"))).toBe("png");
    expect(sniffImageType(await makeImage("webp"))).toBe("webp");
  });

  it("returns null for non-images", () => {
    expect(sniffImageType(Buffer.from("this is definitely not an image"))).toBeNull();
  });
});

describe("validateAndNormalizeUpload", () => {
  it("accepts a valid image and re-encodes to JPEG", async () => {
    const png = await makeImage("png", 400, 600);
    const result = await validateAndNormalizeUpload(png);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.image.mimeType).toBe("image/jpeg");
      expect(result.image.sourceFormat).toBe("png");
      expect(result.image.width).toBe(400);
      expect(result.image.height).toBe(600);
      // Output is really a JPEG.
      expect(sniffImageType(result.image.data)).toBe("jpeg");
    }
  });

  it("rejects an empty file", async () => {
    const r = await validateAndNormalizeUpload(Buffer.alloc(0));
    expect(r.ok).toBe(false);
  });

  it("rejects files over the byte limit", async () => {
    const png = await makeImage("png", 400, 600);
    const r = await validateAndNormalizeUpload(png, { ...DEFAULT_UPLOAD_LIMITS, maxBytes: 10 });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/too large/i) });
  });

  it("rejects non-image bytes", async () => {
    const r = await validateAndNormalizeUpload(Buffer.from("<html>not an image</html>"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unsupported/i);
  });

  it("rejects images below the minimum dimension", async () => {
    const tiny = await makeImage("png", 50, 50);
    const r = await validateAndNormalizeUpload(tiny);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too small/i);
  });

  it("rejects images above the maximum dimension", async () => {
    const png = await makeImage("png", 400, 600);
    const r = await validateAndNormalizeUpload(png, {
      ...DEFAULT_UPLOAD_LIMITS,
      minDimension: 10,
      maxDimension: 100,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });
});
