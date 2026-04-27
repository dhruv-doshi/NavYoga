/**
 * @file lib/feedback.ts
 * @description Generate corrective feedback strings from pose comparison results.
 *
 * Phase 9:
 * - `generateFeedback(result)` — return prioritized list of correction strings
 * - Deduplicate and limit to top N corrections for UI readability
 */

import { CONFIG } from "./config";
import type { PoseComparisonResult } from "./types";

export interface FeedbackItem {
  joint: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Derive a human-readable joint label from camelCase joint name.
 * e.g. "leftKnee" → "Left Knee"
 */
function formatJointLabel(joint: string): string {
  return joint
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function generateFeedback(result: PoseComparisonResult): FeedbackItem[] {
  const incorrectJoints = result.joints
    .filter((j) => (j.status === "too_low" || j.status === "too_high") && j.correctionText)
    .sort((a, b) => b.deviation - a.deviation); // worst first

  console.log(
    "[Feedback] generateFeedback: %d incorrect joints total, showing top %d. Sorted by deviation: %s",
    incorrectJoints.length,
    CONFIG.MAX_FEEDBACK_ITEMS,
    incorrectJoints.map((j) => `${j.joint}(${j.deviation.toFixed(1)}°)`).join(", ") || "none"
  );

  const items = incorrectJoints.slice(0, CONFIG.MAX_FEEDBACK_ITEMS).map((joint) => ({
    joint: formatJointLabel(joint.joint),
    message: joint.correctionText!,
    severity: (joint.deviation > CONFIG.FEEDBACK_WARNING_THRESHOLD ? "error" : "warning") as "error" | "warning",
  }));

  console.debug("[Feedback] feedbackItems: %o", items);
  return items;
}

/**
 * Return a single headline string summarising the pose state.
 */
export function getFeedbackHeadline(score: number): string {
  const headline =
    score === 100 ? "Perfect alignment!" :
    score >= 80 ? "Great form — minor adjustments needed" :
    score >= 60 ? "Getting there — focus on the corrections below" :
    score >= 40 ? "Keep working — several joints need attention" :
    "Work on your foundational alignment first";

  console.log("[Feedback] getFeedbackHeadline: score=%d → '%s'", score, headline);
  return headline;
}
