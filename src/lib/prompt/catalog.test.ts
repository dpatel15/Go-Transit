import { describe, it, expect } from "vitest";
import { REGIONS, DEFAULT_REGION, isRegionId } from "./regions";
import { MOODS, DEFAULT_MOOD } from "./moods";
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO } from "./aspect";
import { SCENE_TEMPLATES, scenesForRegion } from "./scenes";

function uniqueIds<T extends { id: string }>(items: readonly T[]): boolean {
  return new Set(items.map((i) => i.id)).size === items.length;
}

describe("region catalog", () => {
  it("has unique ids", () => {
    expect(uniqueIds(REGIONS)).toBe(true);
  });

  it("every region is fully populated", () => {
    for (const r of REGIONS) {
      expect(r.paletteName.length).toBeGreaterThan(0);
      expect(r.lighting.length).toBeGreaterThan(0);
      expect(r.surfaces.length).toBeGreaterThan(0);
      expect(r.florals.length).toBeGreaterThan(0);
      expect(r.props.length).toBeGreaterThanOrEqual(1);
      expect(r.motifs.length).toBeGreaterThan(0);
    }
  });

  it("every region has at least one usable scene template", () => {
    for (const r of REGIONS) {
      expect(scenesForRegion(r.id).length).toBeGreaterThan(0);
    }
  });

  it("has a valid default", () => {
    expect(isRegionId(DEFAULT_REGION)).toBe(true);
  });
});

describe("mood catalog", () => {
  it("has unique ids and four intensity levels", () => {
    expect(uniqueIds(MOODS)).toBe(true);
    expect(new Set(MOODS.map((m) => m.intensity))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("every mood is fully populated", () => {
    for (const m of MOODS) {
      expect(m.propDensity.length).toBeGreaterThan(0);
      expect(m.lightingStyle.length).toBeGreaterThan(0);
      expect(m.composition.length).toBeGreaterThan(0);
    }
  });

  it("default is a known mood", () => {
    expect(MOODS.some((m) => m.id === DEFAULT_MOOD)).toBe(true);
  });
});

describe("aspect ratio catalog", () => {
  it("has unique ids and positive dimensions", () => {
    expect(uniqueIds(ASPECT_RATIOS)).toBe(true);
    for (const a of ASPECT_RATIOS) {
      expect(a.width).toBeGreaterThan(0);
      expect(a.height).toBeGreaterThan(0);
      expect(a.use.length).toBeGreaterThan(0);
      expect(a.composition.length).toBeGreaterThan(0);
    }
  });

  it("default is a known aspect ratio", () => {
    expect(ASPECT_RATIOS.some((a) => a.id === DEFAULT_ASPECT_RATIO)).toBe(true);
  });
});

describe("scene template catalog", () => {
  it("has unique ids and valid scopes", () => {
    expect(uniqueIds(SCENE_TEMPLATES)).toBe(true);
    for (const t of SCENE_TEMPLATES) {
      expect(t.setup.length).toBeGreaterThan(0);
      if (t.scope !== "any") {
        expect(Array.isArray(t.scope)).toBe(true);
        for (const rid of t.scope) {
          expect(isRegionId(rid)).toBe(true);
        }
      }
    }
  });
});
