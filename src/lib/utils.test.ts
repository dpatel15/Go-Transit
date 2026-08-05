import { describe, it, expect } from "vitest";
import { cn, formatUsd } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves conflicting tailwind utilities (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional falsy values", () => {
    expect(cn("base", false && "hidden", undefined, "block")).toBe("base block");
  });
});

describe("formatUsd", () => {
  it("formats whole dollars", () => {
    expect(formatUsd(10)).toBe("$10.00");
  });

  it("rounds to cents", () => {
    expect(formatUsd(0.039)).toBe("$0.04");
  });
});
