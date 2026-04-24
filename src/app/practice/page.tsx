/**
 * @file app/practice/page.tsx
 * @description The main practice view — camera feed + skeleton overlay + real-time feedback.
 *
 * Phases 4–10:
 * - MediaPipe PoseLandmarker integration (mediapipe.ts)
 * - Skeleton canvas overlay with colored joints (PoseCanvas / drawing.ts)
 * - Angle calculation (angles.ts)
 * - Pose selection (PoseSelector)
 * - Pose comparison (poseComparison.ts)
 * - Corrective feedback panel (FeedbackPanel / feedback.ts)
 * - Alignment score display (ScoreDisplay)
 */

"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import Camera from "@/components/Camera";
import PoseCanvas from "@/components/PoseCanvas";
import PoseSelector from "@/components/PoseSelector";
import FeedbackPanel from "@/components/FeedbackPanel";
import ScoreDisplay from "@/components/ScoreDisplay";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoDimensions, Landmark, AngleMap, PoseDefinition, PoseComparisonResult } from "@/lib/types";
import { comparePose, comparisonToJointColors } from "@/lib/poseComparison";
import { generateFeedback, getFeedbackHeadline, type FeedbackItem } from "@/lib/feedback";
import type { JointColorMap } from "@/lib/drawing";
import posesData from "@/data/poses.json";

const POSES = posesData as unknown as PoseDefinition[];
const DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PracticePage() {
  const [cameraActive, setCameraActive] = useState(true);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [videoDims, setVideoDims] = useState<VideoDimensions>({ width: 1280, height: 720 });
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [angles, setAngles] = useState<AngleMap>({});
  const [showDebug, setShowDebug] = useState(false);

  // Phase 7–10 state
  const [selectedPose, setSelectedPose] = useState<PoseDefinition | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PoseComparisonResult | null>(null);
  const [jointColors, setJointColors] = useState<JointColorMap | undefined>(undefined);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackHeadline, setFeedbackHeadline] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called by Camera when stream is live
  const handleVideoReady = useCallback(
    (el: HTMLVideoElement, dims: VideoDimensions) => {
      setVideoEl(el);
      setVideoDims(dims);
    },
    []
  );

  // Toggle camera on/off
  const toggleCamera = useCallback(() => {
    setCameraActive((prev) => {
      if (prev) {
        setVideoEl(null);
        setLandmarks(null);
        setAngles({});
        setComparisonResult(null);
        setJointColors(undefined);
        setFeedbackItems([]);
        setFeedbackHeadline("");
      }
      return !prev;
    });
  }, []);

  // Run pose comparison whenever angles or selectedPose change (debounced)
  useEffect(() => {
    if (!selectedPose || Object.keys(angles).length === 0) {
      setComparisonResult(null);
      setJointColors(undefined);
      setFeedbackItems([]);
      setFeedbackHeadline("");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = comparePose(angles, selectedPose);
      setComparisonResult(result);
      setJointColors(comparisonToJointColors(result));
      setFeedbackItems(generateFeedback(result));
      setFeedbackHeadline(getFeedbackHeadline(result.score));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [angles, selectedPose]);

  const poseDetected = landmarks !== null && landmarks.length > 0;
  const score = comparisonResult?.score ?? 0;

  return (
    <ErrorBoundary>
    <div
      className="flex flex-col lg:flex-row flex-1 h-full"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* =======================================================================
          LEFT PANEL — Camera feed + skeleton overlay
          ======================================================================= */}
      <div
        className="relative flex-1 min-h-[50vh] lg:min-h-0"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Camera (only rendered when active) */}
        {cameraActive && (
          <Camera
            onVideoReady={handleVideoReady}
            className="absolute inset-0"
          />
        )}

        {/* Placeholder when camera is off */}
        {!cameraActive && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "var(--bg-surface)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ border: "1px solid var(--border)", background: "var(--bg-raised)" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}>
              Camera is off
            </p>
          </div>
        )}

        {/* Skeleton overlay */}
        {cameraActive && videoEl && (
          <PoseCanvas
            videoElement={videoEl}
            dimensions={videoDims}
            showDebugAngles={showDebug}
            jointColors={jointColors}
            onLandmarks={setLandmarks}
            onAngles={setAngles}
          />
        )}

        {/* ── Top-left status badges ── */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {cameraActive && videoEl && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(12,15,10,0.75)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(8px)",
              }}
              aria-live="polite"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: poseDetected ? "var(--joint-correct)" : "var(--accent)",
                  animation: "pulseGlow 1.5s ease-in-out infinite",
                }}
              />
              {poseDetected ? "Pose detected" : "Live"}
            </div>
          )}

          {/* Score badge when a pose is selected */}
          {selectedPose && comparisonResult && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(12,15,10,0.75)",
                border: "1px solid var(--border)",
                color: score >= 80 ? "var(--joint-correct)" : score >= 50 ? "#c89630" : "var(--joint-error)",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(8px)",
                transition: "color 400ms ease",
              }}
            >
              {score}% aligned
            </div>
          )}
        </div>

        {/* ── Top-right controls ── */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {cameraActive && videoEl && (
            <button
              onClick={() => setShowDebug((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: showDebug ? "rgba(195,255,90,0.15)" : "rgba(12,15,10,0.75)",
                border: showDebug ? "1px solid rgba(195,255,90,0.4)" : "1px solid var(--border)",
                color: showDebug ? "rgba(195,255,90,0.9)" : "var(--text-secondary)",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(8px)",
              }}
              aria-pressed={showDebug}
              title="Toggle angle debug overlay"
            >
              Angles
            </button>
          )}
          <button
            onClick={toggleCamera}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: cameraActive ? "rgba(192,97,74,0.15)" : "rgba(12,15,10,0.75)",
              border: cameraActive ? "1px solid rgba(192,97,74,0.4)" : "1px solid var(--border)",
              color: cameraActive ? "var(--joint-error)" : "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
              backdropFilter: "blur(8px)",
            }}
            aria-label={cameraActive ? "Turn off camera" : "Turn on camera"}
          >
            {cameraActive ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Camera Off
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Camera On
              </>
            )}
          </button>
        </div>

        {/* Privacy notice */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "rgba(12,15,10,0.6)",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-dm-sans)",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
          }}
        >
          Video processed locally · never uploaded
        </div>
      </div>

      {/* =======================================================================
          RIGHT PANEL — Controls, feedback, score
          ======================================================================= */}
      <aside
        className="practice-sidebar w-full lg:w-80 xl:w-96 flex flex-col gap-px"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-surface)" }}
        aria-label="Practice controls and feedback"
      >

        {/* ----------------------------------------------------------------
            Section: Pose Selection (Phase 7/8)
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
          <PoseSelector
            poses={POSES}
            selectedId={selectedPose?.id ?? null}
            onSelect={setSelectedPose}
          />
          {selectedPose && (
            <p
              className="text-xs leading-relaxed"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-dm-sans)",
                fontStyle: "italic",
              }}
            >
              {selectedPose.description}
            </p>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Section: Alignment Score (Phase 10)
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
          <ScoreDisplay score={score} poseSelected={!!selectedPose} />
        </div>

        {/* ----------------------------------------------------------------
            Section: Corrective Feedback (Phase 9)
            ---------------------------------------------------------------- */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Feedback
          </h2>
          <FeedbackPanel
            items={feedbackItems}
            headline={feedbackHeadline}
            poseSelected={!!selectedPose}
            poseDetected={poseDetected}
          />
        </div>

        {/* ----------------------------------------------------------------
            Section: Detected Joint Angles (Phase 6 debug output)
            ---------------------------------------------------------------- */}
        {showDebug && Object.keys(angles).length > 0 && (
          <div
            className="p-5 flex flex-col gap-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
            >
              Joint Angles (debug)
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(angles).map(([joint, deg]) => {
                const status = jointColors?.[joint];
                const color =
                  status === "correct" ? "var(--joint-correct)"
                  : status === "error" ? "var(--joint-error)"
                  : "var(--accent)";
                return (
                  <div
                    key={joint}
                    className="flex flex-col px-2.5 py-2 rounded-lg"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
                  >
                    <span
                      className="text-[10px] uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
                    >
                      {joint.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span
                      className="text-base font-semibold tabular-nums"
                      style={{ color, fontFamily: "var(--font-dm-sans)", transition: "color 300ms ease" }}
                    >
                      {deg}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
    </ErrorBoundary>
  );
}
