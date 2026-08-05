import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";

describe("password hashing", () => {
  it("round-trips a correct password", () => {
    const hash = hashPassword("correct horse battery 9");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery 9", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("correct horse battery 9");
    expect(verifyPassword("wrong password 1", hash)).toBe(false);
  });

  it("uses a unique salt per hash", () => {
    expect(hashPassword("samePassword1")).not.toBe(hashPassword("samePassword1"));
  });

  it("returns false for malformed stored hashes", () => {
    expect(verifyPassword("x", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("x", "scrypt$16384$8$1$onlyfive")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a reasonable password", () => {
    expect(validatePasswordStrength("kankotri2026").ok).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(validatePasswordStrength("ab1").ok).toBe(false);
  });

  it("requires a letter and a number", () => {
    expect(validatePasswordStrength("alllettersonly").ok).toBe(false);
    expect(validatePasswordStrength("1234567890").ok).toBe(false);
  });
});
