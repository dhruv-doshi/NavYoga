import { calcAngle, computeAngles } from "@/lib/angles";
import type { Landmark } from "@/lib/types";

describe("calcAngle", () => {
  it("should return 180 for collinear points", () => {
    const a: Landmark = { x: 0, y: 0, z: 0, visibility: 1 };
    const b: Landmark = { x: 1, y: 0, z: 0, visibility: 1 };
    const c: Landmark = { x: 2, y: 0, z: 0, visibility: 1 };
    expect(calcAngle(a, b, c)).toBeCloseTo(180, 1);
  });

  it("should return 90 for perpendicular vectors", () => {
    const a: Landmark = { x: 0, y: 0, z: 0, visibility: 1 };
    const b: Landmark = { x: 1, y: 0, z: 0, visibility: 1 };
    const c: Landmark = { x: 1, y: 1, z: 0, visibility: 1 };
    expect(calcAngle(a, b, c)).toBeCloseTo(90, 0);
  });

  it("should return 0 for overlapping points", () => {
    const a: Landmark = { x: 0, y: 0, z: 0, visibility: 1 };
    const b: Landmark = { x: 1, y: 0, z: 0, visibility: 1 };
    const c: Landmark = { x: 0, y: 0, z: 0, visibility: 1 };
    expect(calcAngle(a, b, c)).toBeCloseTo(0, 1);
  });
});

describe("computeAngles", () => {
  it("should return empty object for empty landmarks", () => {
    const angles = computeAngles([]);
    expect(Object.keys(angles).length).toBe(0);
  });

  it("should skip landmarks with low visibility", () => {
    const landmarks: Landmark[] = new Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.1,
    }));
    const angles = computeAngles(landmarks);
    expect(Object.keys(angles).length).toBe(0);
  });

  it("should compute angles for valid landmarks", () => {
    const landmarks: Landmark[] = new Array(33).fill(null).map((_, i) => ({
      x: Math.cos((i * 2 * Math.PI) / 33),
      y: Math.sin((i * 2 * Math.PI) / 33),
      z: 0,
      visibility: 1,
    }));
    const angles = computeAngles(landmarks);
    expect(Object.keys(angles).length).toBeGreaterThan(0);
    Object.values(angles).forEach((angle) => {
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThanOrEqual(180);
    });
  });
});
