import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { MockProvider } from "./mock-provider";

async function testCard(w = 400, h = 600): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 180, g: 40, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe("MockProvider", () => {
  it("produces a JPEG at the exact target dimensions with zero cost", async () => {
    const card = await testCard();
    const provider = new MockProvider();
    const out = await provider.generate({
      image: { data: card, mimeType: "image/png" },
      prompt: "any",
      target: { width: 1080, height: 1350 },
      seed: 7,
    });

    expect(out.mimeType).toBe("image/jpeg");
    expect(out.provider).toBe("mock");
    expect(out.costUsd).toBe(0);

    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
  });

  it("is deterministic for the same seed and input", async () => {
    const card = await testCard();
    const provider = new MockProvider();
    const params = {
      image: { data: card, mimeType: "image/png" },
      prompt: "any",
      target: { width: 1080, height: 1080 },
      seed: 9,
    };
    const a = await provider.generate(params);
    const b = await provider.generate(params);
    expect(Buffer.compare(a.data, b.data)).toBe(0);
  });

  it("handles landscape cards without overflowing the frame", async () => {
    const card = await testCard(1200, 400);
    const provider = new MockProvider();
    const out = await provider.generate({
      image: { data: card, mimeType: "image/png" },
      prompt: "any",
      target: { width: 1080, height: 1920 },
      seed: 3,
    });
    const meta = await sharp(out.data).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
  });
});
