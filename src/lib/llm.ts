import { CONFIG } from "./config";
import type { PoseDefinition, PoseStep } from "./types";

export function buildStepPrompt(
  pose: PoseDefinition
): { system: string; user: string } {
  const jointList = pose.angles.map((c) => c.joint).join(", ");
  const stepCount = Math.min(CONFIG.LLM_MAX_STEPS, Math.max(1, pose.angles.length));

  const system = `You are a warm, encouraging yoga instructor guiding a student into a pose. The student ONLY needs to move these specific body parts: ${jointList}.

Generate exactly ${stepCount} ordered, progressive steps. Rules:
- ONLY mention body parts that correspond to the joints listed above
- Do NOT add steps for unlisted body parts (e.g., if "leftKnee" is not in the joint list, do not mention knees or legs)
- focusJoints array MUST be a subset of: [${jointList}]
- Each step addresses 1-2 joints from the list
- Build progressively toward the full pose

Voice & tone (CRITICAL — follow exactly):
- Use plain, natural language that a complete beginner would immediately understand
- DO: "stretch your elbow out", "lift your chest up", "soften your knees", "reach your arms out wide", "press your foot firmly down", "open your hips toward the side"
- DON'T: "increase the angle at your elbow", "set your knee to 90°", "adjust your hip flexion", "extend the joint", "decrease the angle"
- Always say "your" before a body part, not "the"
- Second person, present tense, warm and encouraging

Return a JSON array with objects containing:
- title (string): Short step name (e.g., "Ground your feet")
- instruction (string): Full spoken instruction (e.g., "Stand with your feet hip-width apart, toes pointing forward")
- focusJoints (string[]): Joint names this step addresses (must be from the approved list)

Approved joints: [${jointList}]

Return ONLY valid JSON array, no markdown, no extra text.`;

  const user = `Pose: ${pose.name} (${pose.sanskrit})
Description: ${pose.description}

Target joints: [${jointList}]

Generate exactly ${stepCount} progressive steps. Do NOT mention any body parts outside the target joints.`;

  return { system, user };
}

export async function generateSteps(pose: PoseDefinition): Promise<PoseStep[]> {
  const { system, user } = buildStepPrompt(pose);

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  let steps: unknown[] = [];

  if (typeof data === "string") {
    steps = JSON.parse(data);
  } else if (Array.isArray(data)) {
    steps = data;
  } else if (data.steps && Array.isArray(data.steps)) {
    steps = data.steps;
  } else {
    throw new Error("Invalid LLM response format");
  }

  const validJoints = new Set(pose.angles.map((c) => c.joint));
  const validatedSteps: PoseStep[] = steps.map((step: unknown, idx: number) => {
    const s = step as Record<string, unknown>;
    const focusJoints = (Array.isArray(s.focusJoints) ? s.focusJoints : []).filter(
      (j) => validJoints.has(j)
    );

    return {
      index: idx,
      title: String(s.title || "Step"),
      instruction: String(s.instruction || ""),
      focusJoints,
    };
  });

  return validatedSteps;
}
