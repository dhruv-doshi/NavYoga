/**
 * @file lib/feedback.ts
 * @description Generate corrective feedback strings from pose comparison results.
 *
 * Phase 9:
 * - `generateFeedback(result)` — return prioritized list of correction strings
 * - Deduplicate and limit to top N corrections for UI readability
 */

import type { PoseComparisonResult } from "./types";

const MAX_FEEDBACK_ITEMS = 4;

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

/**
 * Generate prioritized corrective feedback items from a comparison result.
 *
 * @param result - Output of comparePose()
 * @returns Array of up to MAX_FEEDBACK_ITEMS FeedbackItem objects
 */
export function generateFeedback(result: PoseComparisonResult): FeedbackItem[] {
  const items: FeedbackItem[] = [];

  for (const joint of result.joints) {
    if (joint.status === "correct" || joint.status === "unknown") continue;
    if (!joint.correctionText) continue;

    items.push({
      joint: formatJointLabel(joint.joint),
      message: joint.correctionText,
      severity: "error",
    });

    if (items.length >= MAX_FEEDBACK_ITEMS) break;
  }

  return items;
}

/**
 * Return a single headline string summarising the pose state.
 */
export function getFeedbackHeadline(score: number): string {
  if (score === 100) return "Perfect alignment!";
  if (score >= 80) return "Great form — minor adjustments needed";
  if (score >= 60) return "Getting there — focus on the corrections below";
  if (score >= 40) return "Keep working — several joints need attention";
  return "Work on your foundational alignment first";
}
