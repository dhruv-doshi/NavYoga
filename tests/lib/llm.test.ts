import { buildStepPrompt } from "@/lib/llm";
import type { PoseDefinition } from "@/lib/types";

const fakePose: PoseDefinition = {
  id: "warrior-2",
  name: "Warrior II",
  sanskrit: "Virabhadrasana II",
  description: "A foundational standing pose.",
  difficulty: "beginner",
  imageUrl: "/images/warrior2.jpg",
  angles: [
    {
      joint: "leftKnee",
      landmarks: [23, 25, 27],
      min: 85,
      max: 95,
      correctionLow: "Bend your left knee more",
      correctionHigh: "Straighten your left knee slightly",
    },
    {
      joint: "rightElbow",
      landmarks: [14, 16, 18],
      min: 160,
      max: 180,
      correctionLow: "Stretch your right arm out further",
      correctionHigh: "Soften your right elbow slightly",
    },
  ],
};

describe("buildStepPrompt", () => {
  it("returns a system and user string", () => {
    const { system, user } = buildStepPrompt(fakePose);
    expect(typeof system).toBe("string");
    expect(typeof user).toBe("string");
  });

  it("system prompt includes natural-language guidance", () => {
    const { system } = buildStepPrompt(fakePose);
    expect(system).toMatch(/natural language|body cues|DO:|DON'T:/i);
  });

  it("system prompt forbids angle measurements", () => {
    const { system } = buildStepPrompt(fakePose);
    expect(system).toMatch(/don'?t.*angle|NOT.*angle|avoid.*degree|angle measurements/i);
  });

  it("system prompt encourages second-person voice", () => {
    const { system } = buildStepPrompt(fakePose);
    expect(system).toMatch(/second.?person|your/i);
  });

  it("user prompt includes the pose name", () => {
    const { user } = buildStepPrompt(fakePose);
    expect(user).toContain("Warrior II");
  });

  it("user prompt includes all joints", () => {
    const { user } = buildStepPrompt(fakePose);
    expect(user).toContain("leftKnee");
    expect(user).toContain("rightElbow");
  });

  it("step count is clamped to LLM_MAX_STEPS", () => {
    const poseWithManyJoints: PoseDefinition = {
      ...fakePose,
      angles: Array.from({ length: 20 }, (_, i) => ({
        joint: `joint${i}`,
        landmarks: [0, 1, 2] as [number, number, number],
        min: 80,
        max: 100,
        correctionLow: "adjust",
        correctionHigh: "adjust",
      })),
    };
    const { system } = buildStepPrompt(poseWithManyJoints);
    // CONFIG.LLM_MAX_STEPS = 6, so prompt should say 6 steps
    expect(system).toMatch(/6/);
  });
});
