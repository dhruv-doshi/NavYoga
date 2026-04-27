import { CONFIG } from "./config";
import type { PoseStep, PoseComparisonResult } from "./types";

export function computeStepMastery(
  result: PoseComparisonResult,
  step: PoseStep
): number {
  const stepJoints = new Set(step.focusJoints);
  const relevantJoints = result.joints.filter((j) => stepJoints.has(j.joint));

  if (relevantJoints.length === 0) {
    return 0;
  }

  const correctCount = relevantJoints.filter((j) => j.status === "correct").length;
  return Math.round((correctCount / relevantJoints.length) * 100);
}

export function shouldAdvanceStep(mastery: number): boolean {
  return mastery >= CONFIG.STEP_ADVANCEMENT_THRESHOLD;
}
