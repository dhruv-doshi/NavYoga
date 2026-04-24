/**
 * @file components/PoseCanvas.tsx
 * @description Canvas overlay for skeleton drawing + angle debug labels.
 *
 * Phase 4/5/6:
 * - Accepts the live video element ref from Camera
 * - Runs the MediaPipe detection loop via requestAnimationFrame
 * - Draws skeleton via drawing.ts
 * - Draws angle debug overlay (Phase 6)
 * - Exposes detected landmarks and angles to parent via callbacks
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { initPoseLandmarker, detectPose, disposePoseLandmarker } from "@/lib/mediapipe";
import { drawSkeleton, drawAngleOverlay, type JointColorMap } from "@/lib/drawing";
import { computeAngles } from "@/lib/angles";
import type { Landmark, AngleMap, VideoDimensions } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PoseCanvasProps {
  /** The live <video> element from Camera component */
  videoElement: HTMLVideoElement | null;
  /** Video intrinsic dimensions for canvas sizing */
  dimensions: VideoDimensions;
  /** Whether to show angle values as debug labels */
  showDebugAngles?: boolean;
  /** Per-joint color override from pose comparison (Phase 8) */
  jointColors?: JointColorMap;
  /** Called each frame with latest landmarks (null if none detected) */
  onLandmarks?: (landmarks: Landmark[] | null) => void;
  /** Called each frame with latest joint angles */
  onAngles?: (angles: AngleMap) => void;
  /** CSS class for the canvas element */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PoseCanvas({
  videoElement,
  dimensions,
  showDebugAngles = false,
  jointColors,
  onLandmarks,
  onAngles,
  className = "",
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [mpReady, setMpReady] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const lastHadLandmarksRef = useRef<boolean | null>(null);

  // Refs for props that change frequently but shouldn't restart the RAF loop
  const jointColorsRef = useRef(jointColors);
  const onLandmarksRef = useRef(onLandmarks);
  const onAnglesRef = useRef(onAngles);
  jointColorsRef.current = jointColors;
  onLandmarksRef.current = onLandmarks;
  onAnglesRef.current = onAngles;

  // -------------------------------------------------------------------------
  // Initialize MediaPipe once
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    console.log("[PoseCanvas] mounting — starting MediaPipe init");
    initPoseLandmarker()
      .then(() => {
        if (!cancelled) {
          console.log("[PoseCanvas] MediaPipe ready — detection loop will start");
          setMpReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[PoseCanvas] MediaPipe init failed:", err);
          setMpError("Pose detection failed to load.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Detection + drawing loop
  // -------------------------------------------------------------------------

  const runLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoElement;

    if (!canvas || !video || !mpReady) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const now = performance.now();
    const landmarks = detectPose(video, now);

    // Log only on landmark detection state changes (appear / disappear)
    const hasLandmarks = landmarks !== null && landmarks.length > 0;
    if (hasLandmarks !== lastHadLandmarksRef.current) {
      if (hasLandmarks) {
        console.log("[PoseCanvas] Pose appeared in frame — %d landmarks", landmarks!.length);
      } else {
        console.log("[PoseCanvas] Pose lost / no landmarks in frame");
      }
      lastHadLandmarksRef.current = hasLandmarks;
    }

    // Draw skeleton (clears canvas first)
    drawSkeleton(ctx, landmarks ?? [], width, height, jointColorsRef.current);

    if (landmarks) {
      const angles = computeAngles(landmarks);

      if (showDebugAngles) {
        drawAngleOverlay(ctx, landmarks, angles, width, height);
      }

      onLandmarksRef.current?.(landmarks);
      onAnglesRef.current?.(angles);
    } else {
      onLandmarksRef.current?.(null);
      onAnglesRef.current?.({});
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [videoElement, dimensions, mpReady, showDebugAngles]);

  // -------------------------------------------------------------------------
  // Start / stop loop when video element or mpReady changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!videoElement || !mpReady) return;

    console.log("[PoseCanvas] Starting detection loop (video: %dx%d)", videoElement.videoWidth, videoElement.videoHeight);
    rafRef.current = requestAnimationFrame(runLoop);

    return () => {
      console.log("[PoseCanvas] Stopping detection loop");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoElement, mpReady, runLoop]);

  // -------------------------------------------------------------------------
  // Cleanup MediaPipe on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      console.log("[PoseCanvas] unmounting — cancelling RAF and disposing PoseLandmarker");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      disposePoseLandmarker();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ mixBlendMode: "normal" }}
        aria-hidden="true"
      />

      {/* Loading indicator while MediaPipe initializes */}
      {!mpReady && !mpError && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "rgba(12,15,10,0.75)",
            color: "rgba(195,255,90,0.8)",
            fontFamily: "var(--font-dm-sans)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(195,255,90,0.2)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(195,255,90,0.8)",
              animation: "pulseGlow 1s ease-in-out infinite",
            }}
          />
          Loading pose model…
        </div>
      )}

      {/* Error state */}
      {mpError && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "rgba(192,97,74,0.15)",
            color: "var(--joint-error)",
            fontFamily: "var(--font-dm-sans)",
            border: "1px solid rgba(192,97,74,0.3)",
          }}
        >
          {mpError}
        </div>
      )}
    </>
  );
}
