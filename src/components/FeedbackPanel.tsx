/**
 * @file components/FeedbackPanel.tsx
 * @description Displays corrective feedback from pose comparison results.
 *
 * Phase 9:
 * - Shows a list of FeedbackItem corrections
 * - Displays a headline based on the current score
 * - Updates are debounced (500ms) by the parent to prevent flicker
 */

"use client";

import type { FeedbackItem } from "@/lib/feedback";

interface FeedbackPanelProps {
  items: FeedbackItem[];
  headline: string;
  poseSelected: boolean;
  poseDetected: boolean;
  /** True once comparePose has produced a result for the current frame */
  analyzed: boolean;
}

export default function FeedbackPanel({
  items,
  headline,
  poseSelected,
  poseDetected,
  analyzed,
}: FeedbackPanelProps) {
  // No pose selected
  if (!poseSelected) {
    return (
      <div
        className="flex-1 rounded-lg flex flex-col items-center justify-center gap-2 p-4 text-center"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          minHeight: "8rem",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)", fontStyle: "italic" }}>
          Select a target pose above to start getting feedback
        </p>
      </div>
    );
  }

  // Pose selected, body detected, but angles not yet computed (low visibility)
  if (poseDetected && !analyzed) {
    return (
      <div
        className="flex-1 rounded-lg flex flex-col items-center justify-center gap-2 p-4 text-center"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          minHeight: "8rem",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)", fontStyle: "italic" }}>
          Analyzing pose… ensure you are well-lit and fully in frame
        </p>
      </div>
    );
  }

  // Pose selected but no body detected
  if (!poseDetected) {
    return (
      <div
        className="flex-1 rounded-lg flex flex-col items-center justify-center gap-2 p-4 text-center"
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          minHeight: "8rem",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)", fontStyle: "italic" }}>
          Stand in the camera frame to begin…
        </p>
      </div>
    );
  }

  // Perfect alignment
  if (items.length === 0) {
    return (
      <div
        className="flex-1 rounded-lg flex flex-col items-center justify-center gap-3 p-5"
        style={{
          background: "rgba(95,173,91,0.06)",
          border: "1px solid rgba(95,173,91,0.2)",
          minHeight: "8rem",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="var(--joint-correct)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm font-medium" style={{ color: "var(--joint-correct)", fontFamily: "var(--font-dm-sans)" }}>
          {headline}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2" style={{ minHeight: "8rem" }}>
      {/* Headline */}
      <p
        className="text-xs"
        style={{
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-dm-sans)",
          fontStyle: "italic",
        }}
      >
        {headline}
      </p>

      {/* Correction items */}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={`${item.joint}-${i}`}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
            style={
              item.severity === "error"
                ? { background: "rgba(192,97,74,0.07)", border: "1px solid rgba(192,97,74,0.18)" }
                : { background: "rgba(200,150,48,0.07)", border: "1px solid rgba(200,150,48,0.2)" }
            }
          >
            {/* Severity dot + joint label */}
            <div className="flex flex-col gap-0.5 flex-shrink-0" style={{ minWidth: "5rem" }}>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: item.severity === "error" ? "var(--joint-error)" : "#c89630",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {item.joint}
              </span>
            </div>

            {/* Correction message */}
            <p
              className="text-xs leading-relaxed flex-1"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)" }}
            >
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
