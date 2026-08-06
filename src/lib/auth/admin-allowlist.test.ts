import { describe, it, expect } from "vitest";
import { isAllowedAdminEmail } from "./admin-allowlist";

describe("isAllowedAdminEmail", () => {
  const allow = ["boss@shop.com", "Owner@Example.com"];

  it("matches case-insensitively and trims", () => {
    expect(isAllowedAdminEmail("BOSS@shop.com", allow)).toBe(true);
    expect(isAllowedAdminEmail("  owner@example.com  ", allow)).toBe(true);
  });

  it("rejects non-listed, empty, and missing emails", () => {
    expect(isAllowedAdminEmail("random@x.com", allow)).toBe(false);
    expect(isAllowedAdminEmail("", allow)).toBe(false);
    expect(isAllowedAdminEmail(null, allow)).toBe(false);
    expect(isAllowedAdminEmail("boss@shop.com", [])).toBe(false);
  });
});
