/**
 * @file lib/poseComparison.ts
 * @description Compare live joint angles against a reference pose definition.
 *
 * Phase 8:
 * - `comparePose(angles, pose)` — returns per-joint status and overall score
 * - Score = (correct joints / total evaluated joints) × 100
 */

import type { AngleMap, PoseDefinition, PoseComparisonResult, JointComparisonResult, JointStatus } from "./types";

/**
 * Compare the user's current joint angles against a target pose.
 *
 * @param angles - Live angle map from computeAngles()
 * @param pose   - The reference pose definition from poses.json
 * @returns PoseComparisonResult with per-joint status, corrections, and score
 */
export function comparePose(
  angles: AngleMap,
  pose: PoseDefinition
): PoseComparisonResult {
  console.log("[PoseComparison] comparePose: pose=%s, inputAngles=%o", pose.id, angles);

  const joints: JointComparisonResult[] = [];
  const corrections: string[] = [];

  for (const constraint of pose.angles) {
    const { joint, min, max, correctionLow, correctionHigh } = constraint;
    const angleDeg = angles[joint];

    let status: JointStatus;
    let correctionText: string | null = null;
    let deviation = 0;

    if (angleDeg === undefined) {
      status = "unknown";
      console.debug("[PoseComparison]   %s → unknown (not in angleMap)", joint);
    } else if (angleDeg < min) {
      status = "too_low";
      deviation = min - angleDeg;
      correctionText = correctionLow;
      corrections.push(correctionText);
      console.debug("[PoseComparison]   %s → too_low  (%.1f° < min %.1f°, deviation %.1f°)", joint, angleDeg, min, deviation);
    } else if (angleDeg > max) {
      status = "too_high";
      deviation = angleDeg - max;
      correctionText = correctionHigh;
      corrections.push(correctionText);
      console.debug("[PoseComparison]   %s → too_high (%.1f° > max %.1f°, deviation %.1f°)", joint, angleDeg, max, deviation);
    } else {
      status = "correct";
      console.debug("[PoseComparison]   %s → correct  (%.1f° in [%.1f°, %.1f°])", joint, angleDeg, min, max);
    }

    joints.push({ joint, status, angleDeg: angleDeg ?? 0, deviation, correctionText });
  }

  // Score: only count joints that were actually detected (not "unknown")
  const evaluated = joints.filter((j) => j.status !== "unknown");
  const correct = evaluated.filter((j) => j.status === "correct").length;
  const score = evaluated.length > 0 ? Math.round((correct / evaluated.length) * 100) : 0;

  console.log(
    "[PoseComparison] result: score=%d%% (%d/%d correct), corrections=%d, unknowns=%d",
    score, correct, evaluated.length, corrections.length, joints.length - evaluated.length
  );

  return { poseId: pose.id, joints, score, corrections };
}

/**
 * Map joint comparison results to the color format expected by drawing.ts.
 *
 * @param result - PoseComparisonResult from comparePose()
 * @returns Record<jointName, "correct" | "error" | "default">
 */
export function comparisonToJointColors(
  result: PoseComparisonResult
): Record<string, "correct" | "error" | "default"> {
  const map: Record<string, "correct" | "error" | "default"> = {};
  for (const j of result.joints) {
    if (j.status === "correct") {
      map[j.joint] = "correct";
    } else if (j.status === "too_low" || j.status === "too_high") {
      map[j.joint] = "error";
    } else {
      map[j.joint] = "default";
    }
  }
  console.debug("[PoseComparison] jointColors: %o", map);
  return map;
}
