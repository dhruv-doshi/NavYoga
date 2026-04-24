import { calcAngle, computeAngles } from "./angles";
import type { Landmark } from "./types";

// Helper to build a visible landmark
function lm(x: number, y: number, z = 0, visibility = 1): Landmark {
  return { x, y, z, visibility };
}

// Build a full 33-landmark array (all visible, placed at origin by default)
function makeLandmarks(overrides: Record<number, Landmark> = {}): Landmark[] {
  const base = Array.from({ length: 33 }, (_, i) =>
    lm(i * 0.01, i * 0.01, 0, 1)
  );
  for (const [idx, l] of Object.entries(overrides)) {
    base[Number(idx)] = l;
  }
  return base;
}

describe("calcAngle", () => {
  it("returns 90° for perpendicular vectors", () => {
    const a = lm(0, 0); // vector a→b = (1,0)
    const b = lm(1, 0); // vertex
    const c = lm(1, 1); // vector c→b = (0,-1)  ⟹ 90°
    expect(calcAngle(a, b, c)).toBeCloseTo(90, 1);
  });

  it("returns 180° for collinear points", () => {
    const a = lm(0, 0);
    const b = lm(1, 0);
    const c = lm(2, 0); // straight line → angle at b = 180°
    expect(calcAngle(a, b, c)).toBeCloseTo(180, 1);
  });

  it("returns 0° when a and c are on the same ray from b (0° angle)", () => {
    const a = lm(2, 0);
    const b = lm(1, 0);
    const c = lm(2, 0); // a === c → cos = 1 → 0°
    expect(calcAngle(a, b, c)).toBeCloseTo(0, 1);
  });

  it("returns 0 when b coincides with a (degenerate — zero-length vector)", () => {
    const a = lm(1, 0);
    const b = lm(1, 0); // b == a ⟹ magA = 0
    const c = lm(2, 0);
    expect(calcAngle(a, b, c)).toBe(0);
  });

  it("returns 0 when b coincides with c (degenerate)", () => {
    const a = lm(0, 0);
    const b = lm(1, 0);
    const c = lm(1, 0); // b == c ⟹ magC = 0
    expect(calcAngle(a, b, c)).toBe(0);
  });

  it("handles 3-D landmarks correctly", () => {
    // 45° in the XZ plane
    const a = lm(1, 0, 0);
    const b = lm(0, 0, 0);
    const c = lm(0, 0, 1);
    expect(calcAngle(a, b, c)).toBeCloseTo(90, 1);
  });
});

describe("computeAngles", () => {
  it("returns all 10 joint angles when all landmarks are fully visible", () => {
    // Place landmarks so every joint gets a non-degenerate angle
    // We just need non-coincident positions with visibility >= 0.5
    const landmarks = makeLandmarks({
      // leftShoulder joint: landmarks [13, 11, 23]
      13: lm(0.2, 0.3),
      11: lm(0.3, 0.2),
      23: lm(0.4, 0.5),
      // rightShoulder: [14, 12, 24]
      14: lm(0.7, 0.3),
      12: lm(0.6, 0.2),
      24: lm(0.5, 0.5),
      // leftElbow: [11, 13, 15]
      15: lm(0.1, 0.4),
      // rightElbow: [12, 14, 16]
      16: lm(0.8, 0.4),
      // leftHip: [11, 23, 25]
      25: lm(0.35, 0.7),
      // rightHip: [12, 24, 26]
      26: lm(0.55, 0.7),
      // leftKnee: [23, 25, 27]
      27: lm(0.3, 0.85),
      // rightKnee: [24, 26, 28]
      28: lm(0.6, 0.85),
      // leftAnkle: [25, 27, 31]
      31: lm(0.28, 0.95),
      // rightAnkle: [26, 28, 32]
      32: lm(0.62, 0.95),
    });

    const angles = computeAngles(landmarks);
    const joints = Object.keys(angles);
    expect(joints).toContain("leftShoulder");
    expect(joints).toContain("rightShoulder");
    expect(joints).toContain("leftElbow");
    expect(joints).toContain("rightElbow");
    expect(joints).toContain("leftHip");
    expect(joints).toContain("rightHip");
    expect(joints).toContain("leftKnee");
    expect(joints).toContain("rightKnee");
    expect(joints).toContain("leftAnkle");
    expect(joints).toContain("rightAnkle");
    expect(joints).toHaveLength(10);
  });

  it("omits a joint when any of its landmarks has visibility below 0.5", () => {
    const landmarks = makeLandmarks({
      // leftKnee vertex (25) has low visibility
      25: lm(0.35, 0.7, 0, 0.3),
    });
    const angles = computeAngles(landmarks);
    expect(angles).not.toHaveProperty("leftKnee");
  });

  it("omits a joint when a non-vertex landmark has low visibility", () => {
    const landmarks = makeLandmarks({
      // leftAnkle uses [25, 27, 31]; make landmark 31 invisible
      31: lm(0.28, 0.95, 0, 0.1),
    });
    const angles = computeAngles(landmarks);
    expect(angles).not.toHaveProperty("leftAnkle");
  });

  it("rounds returned angles to 1 decimal place", () => {
    const landmarks = makeLandmarks({
      13: lm(0.1, 0.3),
      11: lm(0.3, 0.2),
      23: lm(0.41, 0.55),
    });
    const angles = computeAngles(landmarks);
    if (angles.leftShoulder !== undefined) {
      const str = String(angles.leftShoulder);
      const decimalPlaces = str.includes(".") ? str.split(".")[1].length : 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty object when landmark array is empty", () => {
    expect(computeAngles([])).toEqual({});
  });
});
