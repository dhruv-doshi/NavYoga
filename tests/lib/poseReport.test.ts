import { buildAnnotations } from "@/lib/poseReport";
import type { PoseComparisonResult } from "@/lib/types";

const makeResult = (joints: PoseComparisonResult["joints"]): PoseComparisonResult => ({
  poseId: "test",
  joints,
  score: 75,
  corrections: [],
});

describe("buildAnnotations", () => {
  it("excludes unknown joints", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "unknown", angleDeg: 0, deviation: 0, correctionText: null, jointScore: 0 },
    ]);
    expect(buildAnnotations(result)).toHaveLength(0);
  });

  it("correct joints get status correct and message 'aligned'", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null, jointScore: 1 },
    ]);
    const anns = buildAnnotations(result);
    expect(anns[0].status).toBe("correct");
    expect(anns[0].message).toBe("aligned");
  });

  it("incorrect joints get status incorrect and use correctionText", () => {
    const result = makeResult([
      { joint: "rightElbow", status: "too_low", angleDeg: 60, deviation: 20, correctionText: "Stretch your right arm out", jointScore: 0.5 },
    ]);
    const anns = buildAnnotations(result);
    expect(anns[0].status).toBe("incorrect");
    expect(anns[0].message).toBe("Stretch your right arm out");
  });

  it("falls back to 'needs adjustment' when correctionText is null", () => {
    const result = makeResult([
      { joint: "leftHip", status: "too_high", angleDeg: 130, deviation: 10, correctionText: null, jointScore: 0.5 },
    ]);
    const anns = buildAnnotations(result);
    expect(anns[0].message).toBe("needs adjustment");
  });

  it("formats joint label from camelCase", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null, jointScore: 1 },
    ]);
    const anns = buildAnnotations(result);
    expect(anns[0].label).toBe("Left Knee");
  });

  it("includes both correct and incorrect joints (excluding unknown)", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "correct", angleDeg: 90, deviation: 0, correctionText: null, jointScore: 1 },
      { joint: "rightElbow", status: "too_high", angleDeg: 130, deviation: 10, correctionText: "Soften your elbow", jointScore: 0.5 },
      { joint: "leftHip", status: "unknown", angleDeg: 0, deviation: 0, correctionText: null, jointScore: 0 },
    ]);
    const anns = buildAnnotations(result);
    expect(anns).toHaveLength(2);
  });
});
