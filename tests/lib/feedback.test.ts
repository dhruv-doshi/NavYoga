import { generateFeedback, getFeedbackHeadline } from "@/lib/feedback";
import type { PoseComparisonResult } from "@/lib/types";

describe("generateFeedback", () => {
  it("should return empty array when no corrections", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        {
          joint: "leftKnee",
          status: "correct",
          angleDeg: 90,
          deviation: 0,
          correctionText: null,
        },
      ],
      score: 100,
      corrections: [],
    };
    const feedback = generateFeedback(result);
    expect(feedback).toHaveLength(0);
  });

  it("should sort by deviation (worst first)", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        {
          joint: "leftKnee",
          status: "too_low",
          angleDeg: 70,
          deviation: 20,
          correctionText: "Increase left knee",
        },
        {
          joint: "rightElbow",
          status: "too_high",
          angleDeg: 190,
          deviation: 10,
          correctionText: "Decrease right elbow",
        },
      ],
      score: 50,
      corrections: ["Increase left knee", "Decrease right elbow"],
    };
    const feedback = generateFeedback(result);
    expect(feedback[0].joint).toBe("Left Knee");
    expect(feedback[1].joint).toBe("Right Elbow");
  });

  it("should limit to MAX_FEEDBACK_ITEMS", () => {
    const joints = Array.from({ length: 10 }, (_, i) => ({
      joint: `joint${i}`,
      status: "too_low" as const,
      angleDeg: i * 5,
      deviation: 20 - i,
      correctionText: `Correct joint ${i}`,
    }));
    const result: PoseComparisonResult = {
      poseId: "test",
      joints,
      score: 0,
      corrections: joints.map((j) => j.correctionText!),
    };
    const feedback = generateFeedback(result);
    expect(feedback.length).toBeLessThanOrEqual(3);
  });

  it("should mark severity as error when deviation > threshold", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        {
          joint: "leftKnee",
          status: "too_low",
          angleDeg: 50,
          deviation: 30,
          correctionText: "Increase left knee",
        },
      ],
      score: 0,
      corrections: ["Increase left knee"],
    };
    const feedback = generateFeedback(result);
    expect(feedback[0].severity).toBe("error");
  });

  it("should mark severity as warning when deviation <= threshold", () => {
    const result: PoseComparisonResult = {
      poseId: "test",
      joints: [
        {
          joint: "leftKnee",
          status: "too_low",
          angleDeg: 78,
          deviation: 2,
          correctionText: "Increase left knee",
        },
      ],
      score: 0,
      corrections: ["Increase left knee"],
    };
    const feedback = generateFeedback(result);
    expect(feedback[0].severity).toBe("warning");
  });
});

describe("getFeedbackHeadline", () => {
  it("should return perfect alignment at 100", () => {
    expect(getFeedbackHeadline(100)).toContain("Perfect");
  });

  it("should return great form at 80+", () => {
    expect(getFeedbackHeadline(85)).toContain("Great");
  });

  it("should return getting there at 60-79", () => {
    expect(getFeedbackHeadline(70)).toContain("Getting there");
  });

  it("should return keep working at 40-59", () => {
    expect(getFeedbackHeadline(50)).toContain("Keep working");
  });

  it("should return foundational at <40", () => {
    expect(getFeedbackHeadline(30)).toContain("foundational");
  });
});
