import { CONFIG } from "./config";
import type { PoseDefinition, PoseStep } from "./types";

export function buildStepPrompt(
  pose: PoseDefinition
): { system: string; user: string } {
  const jointList = pose.angles.map((c) => c.joint).join(", ");

  const system = `You are a yoga instructor guiding a student into a pose. Generate exactly ${CONFIG.LLM_MAX_STEPS} ordered, progressive steps.

Each step should:
- Address 1-2 joints at a time
- Use human-friendly body cues (e.g., "raise your arms above your head"), NOT angle measurements
- Be clear and actionable for a beginner
- Build progressively toward the full pose

Return a JSON array with objects containing:
- title (string): Short step name (e.g., "Ground your feet")
- instruction (string): Full spoken instruction (e.g., "Stand with feet hip-width apart, toes forward")
- focusJoints (string[]): Joint names this step addresses (ONLY from the approved list below)

Approved joints: ${jointList}

Return ONLY valid JSON array, no markdown, no extra text.`;

  const user = `Pose: ${pose.name} (${pose.sanskrit})
Description: ${pose.description}

Generate ${CONFIG.LLM_MAX_STEPS} progressive steps using ONLY these joints: ${jointList}`;

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
