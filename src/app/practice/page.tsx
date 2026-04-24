/**
 * @file app/practice/page.tsx
 * @description The main practice view — camera feed + pose feedback.
 *
 * Phase 3: Camera feed and layout scaffolding.
 * Later phases will add:
 *   - Phase 4: MediaPipe skeleton detection
 *   - Phase 5: PoseCanvas skeleton overlay
 *   - Phase 8: PoseSelector + pose comparison
 *   - Phase 9: FeedbackPanel with corrections
 *   - Phase 10: ScoreDisplay alignment percentage
 *
 * Layout:
 * - Left/main area: camera feed with canvas overlay (takes most of the space)
 * - Right sidebar (desktop) / bottom drawer (mobile): controls + feedback
 *
 * This is a Client Component because it renders Camera (which uses browser APIs).
 */

"use client";

import type { Metadata } from "next";
import Camera from "@/components/Camera";
import type { VideoDimensions } from "@/lib/types";
import { useCallback, useState } from "react";

// Note: `metadata` exports are only valid in Server Components.
// Since this is a Client Component, title is set in layout.tsx's template.

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PracticePage() {
  // Track whether the camera is active (controls placeholder visibility)
  const [cameraReady, setCameraReady] = useState(false);
  // Track video dimensions (will be used to size the canvas in Phase 5)
  const [, setVideoDimensions] = useState<VideoDimensions | null>(null);

  // Called by Camera component when the stream is live
  const handleVideoReady = useCallback(
    (videoEl: HTMLVideoElement, dims: VideoDimensions) => {
      setCameraReady(true);
      setVideoDimensions(dims);
      // Phase 4: Pass videoEl to mediapipe.ts to start landmark detection
    },
    []
  );

  return (
    <div
      className="flex flex-col lg:flex-row flex-1 h-full"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* ===================================================================
          LEFT PANEL — Camera feed
          On mobile: full width, top portion of the page
          On desktop: takes up the remaining width after the sidebar
          =================================================================== */}
      <div
        className="relative flex-1 min-h-[50vh] lg:min-h-0"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Camera component fills this container */}
        <Camera
          onVideoReady={handleVideoReady}
          className="absolute inset-0"
        />

        {/* Phase 5: PoseCanvas will be added here as an absolute overlay */}

        {/* "Live" indicator badge — shown when camera is active */}
        {cameraReady && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(12,15,10,0.75)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
              backdropFilter: "blur(8px)",
            }}
            aria-live="polite"
            aria-label="Camera is active"
          >
            {/* Pulsing green dot */}
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "var(--joint-correct)",
                animation: "pulseGlow 1.5s ease-in-out infinite",
                boxShadow: "0 0 0 0 rgba(95,173,91,0.4)",
              }}
              aria-hidden="true"
            />
            Live
          </div>
        )}

        {/* Privacy notice — reassures user that video stays local */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "rgba(12,15,10,0.6)",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-dm-sans)",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
          }}
          aria-label="Privacy notice"
        >
          Video processed locally · never uploaded
        </div>
      </div>

      {/* ===================================================================
          RIGHT PANEL — Controls, feedback, score
          On mobile: appears below the camera feed
          On desktop: fixed-width sidebar on the right
          =================================================================== */}
      <aside
        className="w-full lg:w-80 xl:w-96 flex flex-col gap-px"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-surface)" }}
        aria-label="Practice controls and feedback"
      >

        {/* ----------------------------------------------------------------
            Section: Pose Selection (placeholder — Phase 8)
            ---------------------------------------------------------------- */}
        <div
          className="p-5 flex flex-col gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Target Pose
          </h2>
          {/* Phase 8 will replace this with the PoseSelector component */}
          <div
            className="rounded-lg p-4 text-sm"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
              fontStyle: "italic",
            }}
          >
            Pose selection coming in a later phase…
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Section: Alignment Score (placeholder — Phase 10)
            ---------------------------------------------------------------- */}
        <div
          className="p-5 flex flex-col gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Alignment Score
          </h2>
          {/* Phase 10 will replace this with the ScoreDisplay component */}
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--bg-raised)" }}
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Alignment score"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: "0%", background: "var(--accent)" }}
            />
          </div>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Select a pose to start analysis
          </p>
        </div>

        {/* ----------------------------------------------------------------
            Section: Corrective Feedback (placeholder — Phase 9)
            ---------------------------------------------------------------- */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Feedback
          </h2>
          {/* Phase 9 will replace this with the FeedbackPanel component */}
          <div
            className="flex-1 rounded-lg p-4 text-sm"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
              fontStyle: "italic",
              minHeight: "8rem",
            }}
          >
            Corrective feedback will appear here once pose detection is active…
          </div>
        </div>
      </aside>
    </div>
  );
}
