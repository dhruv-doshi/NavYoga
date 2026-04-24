import { comparePose, comparisonToJointColors } from "./poseComparison";
import type { PoseDefinition, AngleMap } from "./types";

// Minimal pose fixture with two joint constraints
const mockPose: PoseDefinition = {
  id: "test-pose",
  name: "Test Pose",
  sanskrit: "Testasana",
  description: "A pose for testing",
  difficulty: "beginner",
  imageUrl: "/images/test.jpg",
  focus: ["balance"],
  angles: [
    {
      joint: "leftKnee",
      landmarks: [23, 25, 27],
      min: 160,
      max: 180,
      correctionLow: "Straighten your left knee",
      correctionHigh: "Soften your left knee",
    },
    {
      joint: "rightKnee",
      landmarks: [24, 26, 28],
      min: 160,
      max: 180,
      correctionLow: "Straighten your right knee",
      correctionHigh: "Soften your right knee",
    },
  ],
};

describe("comparePose", () => {
  it("marks a joint as 'correct' when angle is within [min, max]", () => {
    const angles: AngleMap = { leftKnee: 170, rightKnee: 175 };
    const result = comparePose(angles, mockPose);
    const lk = result.joints.find((j) => j.joint === "leftKnee")!;
    expect(lk.status).toBe("correct");
    expect(lk.correctionText).toBeNull();
  });

  it("marks a joint as 'too_low' when angle < min", () => {
    const angles: AngleMap = { leftKnee: 140, rightKnee: 170 };
    const result = comparePose(angles, mockPose);
    const lk = result.joints.find((j) => j.joint === "leftKnee")!;
    expect(lk.status).toBe("too_low");
    expect(lk.correctionText).toBe("Straighten your left knee");
  });

  it("marks a joint as 'too_high' when angle > max", () => {
    const angles: AngleMap = { leftKnee: 185, rightKnee: 170 };
    const result = comparePose(angles, mockPose);
    const lk = result.joints.find((j) => j.joint === "leftKnee")!;
    expect(lk.status).toBe("too_high");
    expect(lk.correctionText).toBe("Soften your left knee");
  });

  it("marks a joint as 'unknown' when angle is not in the angles map", () => {
    const angles: AngleMap = { rightKnee: 170 }; // leftKnee missing
    const result = comparePose(angles, mockPose);
    const lk = result.joints.find((j) => j.joint === "leftKnee")!;
    expect(lk.status).toBe("unknown");
  });

  it("returns score 100 when all joints are correct", () => {
    const angles: AngleMap = { leftKnee: 170, rightKnee: 170 };
    const result = comparePose(angles, mockPose);
    expect(result.score).toBe(100);
  });

  it("returns score 0 when no joints are correct", () => {
    const angles: AngleMap = { leftKnee: 90, rightKnee: 90 };
    const result = comparePose(angles, mockPose);
    expect(result.score).toBe(0);
  });

  it("returns score 50 when half the joints are correct", () => {
    const angles: AngleMap = { leftKnee: 170, rightKnee: 90 };
    const result = comparePose(angles, mockPose);
    expect(result.score).toBe(50);
  });

  it("returns score 0 when all joints are unknown (no landmarks detected)", () => {
    const result = comparePose({}, mockPose);
    expect(result.score).toBe(0);
  });

  it("score excludes unknown joints from denominator", () => {
    // Only rightKnee detected and correct; leftKnee unknown
    const angles: AngleMap = { rightKnee: 170 };
    const result = comparePose(angles, mockPose);
    // 1 correct out of 1 evaluated = 100%
    expect(result.score).toBe(100);
  });

  it("returns the poseId in the result", () => {
    const result = comparePose({}, mockPose);
    expect(result.poseId).toBe("test-pose");
  });

  it("populates corrections array for non-correct joints", () => {
    const angles: AngleMap = { leftKnee: 90, rightKnee: 170 };
    const result = comparePose(angles, mockPose);
    expect(result.corrections).toContain("Straighten your left knee");
    expect(result.corrections).not.toContain("Straighten your right knee");
  });
});

describe("comparisonToJointColors", () => {
  it("maps 'correct' joints to 'correct'", () => {
    const result = comparePose({ leftKnee: 170, rightKnee: 170 }, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("correct");
    expect(colors.rightKnee).toBe("correct");
  });

  it("maps 'too_low' joints to 'error'", () => {
    const result = comparePose({ leftKnee: 90, rightKnee: 170 }, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("error");
  });

  it("maps 'too_high' joints to 'error'", () => {
    const result = comparePose({ leftKnee: 190, rightKnee: 170 }, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("error");
  });

  it("maps 'unknown' joints to 'default'", () => {
    const result = comparePose({}, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("default");
    expect(colors.rightKnee).toBe("default");
  });
});
