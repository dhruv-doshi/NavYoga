import type { PoseStep, PoseComparisonResult } from "./types";

export function computeStepMastery(
  result: PoseComparisonResult,
  step: PoseStep
): number {
  const focus = new Set(step.focusJoints);
  const relevant = result.joints.filter((j) => focus.has(j.joint));

  if (relevant.length === 0) {
    console.warn(
      "[computeStepMastery] step '%s' focusJoints %o have no overlap with result joints — returning 0",
      step.title, step.focusJoints
    );
    return 0;
  }

  const sum = relevant.reduce((acc, j) => acc + (j.jointScore ?? 0), 0);
  const mastery = Math.round((sum / relevant.length) * 100);
  console.debug("[computeStepMastery] step '%s' mastery=%d%%", step.title, mastery);
  return mastery;
}
