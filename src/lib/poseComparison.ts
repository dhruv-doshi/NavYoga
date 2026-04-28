/**
 * @file lib/poseComparison.ts
 * @description Compare live joint angles against a reference pose definition.
 *
 * Phase 8:
 * - `comparePose(angles, pose)` — returns per-joint status and overall score
 * - Score = (correct joints / total evaluated joints) × 100
 */

import { CONFIG } from "./config";
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
  const tolerance = CONFIG.POSE_MASTERY_TOLERANCE;

  for (const constraint of pose.angles) {
    const { joint, min, max, correctionLow, correctionHigh } = constraint;
    const angleDeg = angles[joint];
    const tolerantMin = min - tolerance;
    const tolerantMax = max + tolerance;

    let status: JointStatus;
    let correctionText: string | null = null;
    let deviation = 0;

    if (angleDeg === undefined) {
      status = "unknown";
      console.debug("[PoseComparison]   %s → unknown (not in angleMap)", joint);
    } else if (angleDeg < tolerantMin) {
      status = "too_low";
      deviation = tolerantMin - angleDeg;
      correctionText = correctionLow;
      corrections.push(correctionText);
      console.debug("[PoseComparison]   %s → too_low  (%.1f° < min %.1f°, deviation %.1f°)", joint, angleDeg, tolerantMin, deviation);
    } else if (angleDeg > tolerantMax) {
      status = "too_high";
      deviation = angleDeg - tolerantMax;
      correctionText = correctionHigh;
      corrections.push(correctionText);
      console.debug("[PoseComparison]   %s → too_high (%.1f° > max %.1f°, deviation %.1f°)", joint, angleDeg, tolerantMax, deviation);
    } else {
      status = "correct";
      console.debug("[PoseComparison]   %s → correct  (%.1f° in [%.1f°, %.1f°])", joint, angleDeg, tolerantMin, tolerantMax);
    }

    const jointScore = status === "unknown" ? 0 : status === "correct" ? 1 : Math.max(0, 1 - deviation / (CONFIG.POSE_MASTERY_TOLERANCE * 6));
    joints.push({ joint, status, angleDeg: angleDeg ?? 0, deviation, correctionText, jointScore });
  }

  // Score: average continuous joint scores (excluding unknowns)
  const evaluated = joints.filter((j) => j.status !== "unknown");
  const scoreSum = evaluated.reduce((acc, j) => acc + j.jointScore, 0);
  const score = evaluated.length > 0 ? Math.round((scoreSum / evaluated.length) * 100) : 0;

  console.log(
    "[PoseComparison] result: score=%d%% (%d evaluated), corrections=%d, unknowns=%d",
    score, evaluated.length, corrections.length, joints.length - evaluated.length
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
