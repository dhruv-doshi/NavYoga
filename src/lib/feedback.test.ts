import { generateFeedback, getFeedbackHeadline } from "./feedback";
import type { PoseComparisonResult } from "./types";

function makeResult(
  joints: Array<{
    joint: string;
    status: "correct" | "too_low" | "too_high" | "unknown";
    correctionText?: string;
  }>
): PoseComparisonResult {
  return {
    poseId: "test",
    score: 0,
    corrections: [],
    joints: joints.map(({ joint, status, correctionText = null }) => ({
      joint,
      status,
      angleDeg: 90,
      correctionText,
    })),
  };
}

describe("generateFeedback", () => {
  it("returns empty array when all joints are correct", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "correct" },
      { joint: "rightKnee", status: "correct" },
    ]);
    expect(generateFeedback(result)).toHaveLength(0);
  });

  it("returns empty array when all joints are unknown", () => {
    const result = makeResult([{ joint: "leftKnee", status: "unknown" }]);
    expect(generateFeedback(result)).toHaveLength(0);
  });

  it("returns at most 4 items even when more joints are incorrect", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "too_low", correctionText: "Msg 1" },
      { joint: "rightKnee", status: "too_low", correctionText: "Msg 2" },
      { joint: "leftElbow", status: "too_high", correctionText: "Msg 3" },
      { joint: "rightElbow", status: "too_low", correctionText: "Msg 4" },
      { joint: "leftHip", status: "too_low", correctionText: "Msg 5" },
    ]);
    expect(generateFeedback(result)).toHaveLength(4);
  });

  it("includes correctionLow text for too_low joints", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "too_low", correctionText: "Straighten your left knee" },
    ]);
    const items = generateFeedback(result);
    expect(items[0].message).toBe("Straighten your left knee");
    expect(items[0].severity).toBe("error");
  });

  it("includes correctionHigh text for too_high joints", () => {
    const result = makeResult([
      { joint: "rightKnee", status: "too_high", correctionText: "Soften your right knee" },
    ]);
    const items = generateFeedback(result);
    expect(items[0].message).toBe("Soften your right knee");
  });

  it("formats joint names from camelCase to Title Case", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "too_low", correctionText: "Fix it" },
    ]);
    const items = generateFeedback(result);
    expect(items[0].joint).toBe("Left Knee");
  });

  it("skips joints with null correctionText", () => {
    const result = makeResult([
      { joint: "leftKnee", status: "too_low", correctionText: undefined },
    ]);
    // correctionText defaults to null in makeResult when undefined
    expect(generateFeedback(result)).toHaveLength(0);
  });
});

describe("getFeedbackHeadline", () => {
  it("returns 'Perfect alignment!' at score 100", () => {
    expect(getFeedbackHeadline(100)).toBe("Perfect alignment!");
  });

  it("returns great-form headline at score 80", () => {
    expect(getFeedbackHeadline(80)).toBe("Great form — minor adjustments needed");
  });

  it("returns great-form headline at score 99", () => {
    expect(getFeedbackHeadline(99)).toBe("Great form — minor adjustments needed");
  });

  it("returns getting-there headline at score 60", () => {
    expect(getFeedbackHeadline(60)).toBe("Getting there — focus on the corrections below");
  });

  it("returns keep-working headline at score 40", () => {
    expect(getFeedbackHeadline(40)).toBe("Keep working — several joints need attention");
  });

  it("returns foundational headline at score below 40", () => {
    expect(getFeedbackHeadline(0)).toBe("Work on your foundational alignment first");
    expect(getFeedbackHeadline(39)).toBe("Work on your foundational alignment first");
  });
});
