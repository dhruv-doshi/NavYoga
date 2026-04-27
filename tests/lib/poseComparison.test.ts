import { comparePose, comparisonToJointColors } from "@/lib/poseComparison";
import type { PoseDefinition, AngleMap } from "@/lib/types";

const mockPose: PoseDefinition = {
  id: "test-pose",
  name: "Test Pose",
  sanskrit: "Test Asana",
  description: "A test pose",
  difficulty: "beginner",
  imageUrl: "/test.svg",
  angles: [
    {
      joint: "leftKnee",
      landmarks: [23, 25, 27],
      min: 80,
      max: 100,
      correctionLow: "Increase left knee",
      correctionHigh: "Decrease left knee",
    },
    {
      joint: "rightElbow",
      landmarks: [12, 14, 16],
      min: 150,
      max: 180,
      correctionLow: "Increase right elbow",
      correctionHigh: "Decrease right elbow",
    },
  ],
};

describe("comparePose", () => {
  it("should mark joints as correct when within range", () => {
    const angles: AngleMap = {
      leftKnee: 90,
      rightElbow: 160,
    };
    const result = comparePose(angles, mockPose);
    expect(result.joints[0].status).toBe("correct");
    expect(result.joints[1].status).toBe("correct");
    expect(result.score).toBe(100);
  });

  it("should mark joints as too_low when below min (with tolerance)", () => {
    const angles: AngleMap = {
      leftKnee: 70,
      rightElbow: 160,
    };
    const result = comparePose(angles, mockPose);
    expect(result.joints[0].status).toBe("too_low");
    expect(result.joints[0].deviation).toBeGreaterThan(0);
  });

  it("should mark joints as too_high when above max (with tolerance)", () => {
    const angles: AngleMap = {
      leftKnee: 110,
      rightElbow: 160,
    };
    const result = comparePose(angles, mockPose);
    expect(result.joints[0].status).toBe("too_high");
    expect(result.joints[0].deviation).toBeGreaterThan(0);
  });

  it("should mark joints as unknown when not in angles map", () => {
    const angles: AngleMap = {};
    const result = comparePose(angles, mockPose);
    expect(result.joints[0].status).toBe("unknown");
    expect(result.joints[1].status).toBe("unknown");
    expect(result.score).toBe(0);
  });

  it("should calculate score correctly", () => {
    const angles: AngleMap = {
      leftKnee: 90,
      rightElbow: 175,
    };
    const result = comparePose(angles, mockPose);
    expect(result.score).toBe(100);
  });

  it("should apply tolerance when configured", () => {
    const angles: AngleMap = {
      leftKnee: 75,
      rightElbow: 160,
    };
    const result = comparePose(angles, mockPose);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("comparisonToJointColors", () => {
  it("should map correct joints to correct color", () => {
    const angles: AngleMap = { leftKnee: 90, rightElbow: 160 };
    const result = comparePose(angles, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("correct");
    expect(colors.rightElbow).toBe("correct");
  });

  it("should map incorrect joints to error color", () => {
    const angles: AngleMap = { leftKnee: 50, rightElbow: 160 };
    const result = comparePose(angles, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("error");
    expect(colors.rightElbow).toBe("correct");
  });

  it("should map unknown joints to default color", () => {
    const angles: AngleMap = {};
    const result = comparePose(angles, mockPose);
    const colors = comparisonToJointColors(result);
    expect(colors.leftKnee).toBe("default");
    expect(colors.rightElbow).toBe("default");
  });
});
