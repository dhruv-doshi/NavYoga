import { CONFIG } from "./config";
import type { PoseStep, PoseComparisonResult } from "./types";

export function computeStepMastery(
  result: PoseComparisonResult,
  step: PoseStep
): number {
  const stepJoints = new Set(step.focusJoints);
  const relevantJoints = result.joints.filter((j) => stepJoints.has(j.joint));

  // If no focusJoints match tracked joints, treat as auto-passed so the student isn't stuck.
  if (relevantJoints.length === 0) {
    console.warn("[computeStepMastery] step '%s' focusJoints %o have no overlap with result joints %o — auto-passing",
      step.title, step.focusJoints, result.joints.map(j => j.joint));
    return 100;
  }

  const correctCount = relevantJoints.filter((j) => j.status === "correct").length;
  const mastery = Math.round((correctCount / relevantJoints.length) * 100);
  console.debug("[computeStepMastery] step '%s' joints=%o correct=%d/%d mastery=%d%%",
    step.title, step.focusJoints, correctCount, relevantJoints.length, mastery);
  return mastery;
}

export function shouldAdvanceStep(mastery: number): boolean {
  return mastery >= CONFIG.STEP_ADVANCEMENT_THRESHOLD;
}
