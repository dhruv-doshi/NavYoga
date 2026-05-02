import { computeFrameSampleTimes } from "@/lib/videoSampling";

describe("computeFrameSampleTimes", () => {
  it("returns the correct number of frame times", () => {
    const { times } = computeFrameSampleTimes(60, 24);
    expect(times).toHaveLength(24);
  });

  it("first sample is at trimStart (5% of duration)", () => {
    const { times, trimStart } = computeFrameSampleTimes(60, 24);
    expect(times[0]).toBeCloseTo(trimStart, 5);
    expect(trimStart).toBeCloseTo(3, 5); // 60 * 0.05
  });

  it("last sample is before trimEnd (95% of duration)", () => {
    const { times, trimEnd } = computeFrameSampleTimes(60, 24);
    expect(times[times.length - 1]).toBeLessThan(trimEnd);
    expect(trimEnd).toBeCloseTo(57, 5); // 60 * 0.95
  });

  it("samples span the full trimmed range", () => {
    const { times, trimStart, trimEnd } = computeFrameSampleTimes(60, 24);
    const range = trimEnd - trimStart;
    const span = times[times.length - 1] - times[0];
    // span should cover most of the range (not 100% since interval spacing)
    expect(span).toBeGreaterThan(range * 0.8);
  });

  it("times are monotonically increasing", () => {
    const { times } = computeFrameSampleTimes(60, 24);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  it("works correctly for 15s videos", () => {
    const { times } = computeFrameSampleTimes(15, 24, 0.05, 0.95);
    expect(times).toHaveLength(24);
    expect(times[0]).toBeCloseTo(0.75, 5); // 15 * 0.05
    expect(times[times.length - 1]).toBeLessThan(15 * 0.95);
  });

  it("handles custom trim ratios", () => {
    const { trimStart, trimEnd } = computeFrameSampleTimes(100, 10, 0.1, 0.9);
    expect(trimStart).toBeCloseTo(10, 5);
    expect(trimEnd).toBeCloseTo(90, 5);
  });

  it("handles count=1 without NaN", () => {
    const { times } = computeFrameSampleTimes(60, 1);
    expect(times).toHaveLength(1);
    expect(isNaN(times[0])).toBe(false);
  });
});
