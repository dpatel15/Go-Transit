import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { GeminiProvider } from "./gemini-provider";

async function tinyImageBase64(): Promise<string> {
  const buf = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

async function jpegCard(): Promise<Buffer> {
  return sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .jpeg()
    .toBuffer();
}

function fakeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("GeminiProvider", () => {
  it("sends the card + prompt and returns the image resized to target", async () => {
    const imgB64 = await tinyImageBase64();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return fakeResponse({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: imgB64 } }] } }],
      });
    }) as unknown as typeof fetch;

    const provider = new GeminiProvider({ apiKey: "SECRET_KEY", model: "gemini-2.5-flash-image", fetchImpl });
    const card = await jpegCard();

    const out = await provider.generate({
      image: { data: card, mimeType: "image/jpeg" },
      prompt: "PROMPT_TEXT",
      negativePrompt: "NEG_TEXT",
      target: { width: 1080, height: 1080 },
      seed: 5,
    });

    expect(out.provider).toBe("gemini");
    expect(out.model).toBe("gemini-2.5-flash-image");
    expect(out.costUsd).toBeCloseTo(0.039);
    const meta = await sharp(out.data).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);

    expect(calls).toHaveLength(1);
    const first = calls[0]!;
    expect(first.url).toContain("gemini-2.5-flash-image:generateContent");
    // API key goes in the header, never the URL.
    expect(first.url).not.toContain("SECRET_KEY");
    const headers = first.init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("SECRET_KEY");

    const sent = JSON.parse(first.init.body as string);
    expect(sent.contents[0].parts[0].text).toContain("PROMPT_TEXT");
    expect(sent.contents[0].parts[0].text).toContain("NEG_TEXT");
    expect(sent.contents[0].parts[1].inlineData.data).toBe(card.toString("base64"));
    expect(sent.generationConfig.responseModalities).toEqual(["IMAGE"]);
  });

  it("throws a redacted error on API failure (never leaks the key)", async () => {
    const fetchImpl = (async () =>
      fakeResponse({ error: "invalid key SUPER_SECRET provided" }, false, 400)) as unknown as typeof fetch;
    const provider = new GeminiProvider({ apiKey: "SUPER_SECRET", fetchImpl });
    const card = await jpegCard();

    await expect(
      provider.generate({ image: { data: card, mimeType: "image/jpeg" }, prompt: "x", target: { width: 100, height: 100 } }),
    ).rejects.toThrow(/400/);

    try {
      await provider.generate({
        image: { data: card, mimeType: "image/jpeg" },
        prompt: "x",
        target: { width: 100, height: 100 },
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).not.toContain("SUPER_SECRET");
      expect((e as Error).message).toContain("***");
    }
  });

  it("throws when the response has no image part", async () => {
    const fetchImpl = (async () =>
      fakeResponse({ candidates: [{ content: { parts: [{ text: "sorry" }] } }] })) as unknown as typeof fetch;
    const provider = new GeminiProvider({ apiKey: "k", fetchImpl });
    const card = await jpegCard();

    await expect(
      provider.generate({ image: { data: card, mimeType: "image/jpeg" }, prompt: "x", target: { width: 100, height: 100 } }),
    ).rejects.toThrow(/no image/i);
  });

  it("surfaces a safety block clearly", async () => {
    const fetchImpl = (async () => fakeResponse({ promptFeedback: { blockReason: "SAFETY" } })) as unknown as typeof fetch;
    const provider = new GeminiProvider({ apiKey: "k", fetchImpl });
    const card = await jpegCard();

    await expect(
      provider.generate({ image: { data: card, mimeType: "image/jpeg" }, prompt: "x", target: { width: 100, height: 100 } }),
    ).rejects.toThrow(/SAFETY/);
  });

  it("requires an API key", () => {
    expect(() => new GeminiProvider({ apiKey: "" })).toThrow();
  });
});
