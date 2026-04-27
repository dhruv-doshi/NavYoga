import { computeStepMastery, shouldAdvanceStep } from "@/lib/stepInstructions";
import type { PoseStep, PoseComparisonResult } from "@/lib/types";

describe("computeStepMastery", () => {
  const mockStep: PoseStep = {
    index: 0,
    title: "Step 1",
    instruction: "Test instruction",
    focusJoints: ["leftKnee", "rightElbow"],
  };

  it("should return 100 when all focus joints are correct", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null },
        { joint: "rightElbow", status: "correct", angleDeg: 160, deviation: 0, correctionText: null },
      ],
      score: 100,
      corrections: [],
    };
    const mastery = computeStepMastery(result, mockStep);
    expect(mastery).toBe(100);
  });

  it("should return 50 when half of focus joints are correct", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null },
        { joint: "rightElbow", status: "too_low", angleDeg: 140, deviation: 10, correctionText: "Fix it" },
      ],
      score: 50,
      corrections: ["Fix it"],
    };
    const mastery = computeStepMastery(result, mockStep);
    expect(mastery).toBe(50);
  });

  it("should return 0 when all focus joints are incorrect", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        { joint: "leftKnee", status: "too_low", angleDeg: 60, deviation: 20, correctionText: "Fix it" },
        { joint: "rightElbow", status: "too_high", angleDeg: 190, deviation: 10, correctionText: "Fix it" },
      ],
      score: 0,
      corrections: ["Fix it", "Fix it"],
    };
    const mastery = computeStepMastery(result, mockStep);
    expect(mastery).toBe(0);
  });

  it("should ignore joints not in focus", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null },
        { joint: "rightElbow", status: "correct", angleDeg: 160, deviation: 0, correctionText: null },
        { joint: "leftShoulder", status: "too_low", angleDeg: 50, deviation: 30, correctionText: "Fix it" },
      ],
      score: 66,
      corrections: ["Fix it"],
    };
    const mastery = computeStepMastery(result, mockStep);
    expect(mastery).toBe(100);
  });

  it("should return 0 when no focus joints in result", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        { joint: "leftShoulder", status: "correct", angleDeg: 90, deviation: 0, correctionText: null },
      ],
      score: 0,
      corrections: [],
    };
    const mastery = computeStepMastery(result, mockStep);
    expect(mastery).toBe(0);
  });
});

describe("shouldAdvanceStep", () => {
  it("should return true when mastery >= threshold", () => {
    expect(shouldAdvanceStep(80)).toBe(true);
    expect(shouldAdvanceStep(90)).toBe(true);
    expect(shouldAdvanceStep(100)).toBe(true);
  });

  it("should return false when mastery < threshold", () => {
    expect(shouldAdvanceStep(79)).toBe(false);
    expect(shouldAdvanceStep(50)).toBe(false);
    expect(shouldAdvanceStep(0)).toBe(false);
  });
});
