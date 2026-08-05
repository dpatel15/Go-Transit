import { describe, it, expect } from "vitest";
import { generateSessionToken, hashToken, newId, generateCsrfToken } from "./tokens";

describe("session tokens", () => {
  it("generates unique, URL-safe tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes tokens deterministically to 64 hex chars", () => {
    const t = generateSessionToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("ids and csrf", () => {
  it("newId returns unique uuids", () => {
    expect(newId()).not.toBe(newId());
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("csrf tokens are unique and non-empty", () => {
    const a = generateCsrfToken();
    expect(a.length).toBeGreaterThan(10);
    expect(a).not.toBe(generateCsrfToken());
  });
});
