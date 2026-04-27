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
import { RecordPoseFlow } from "@/components/RecordPoseFlow";
import { MasterPosePanel } from "@/components/MasterPosePanel";
import { StepInstructionPanel } from "@/components/StepInstructionPanel";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStepFlow } from "@/hooks/useStepFlow";
import { CONFIG } from "@/lib/config";
import { cancelSpeech } from "@/lib/tts";
import type { VideoDimensions, Landmark, AngleMap, PoseDefinition, PoseComparisonResult } from "@/lib/types";
import { comparePose, comparisonToJointColors } from "@/lib/poseComparison";
import { generateFeedback, getFeedbackHeadline, type FeedbackItem } from "@/lib/feedback";
import type { JointColorMap } from "@/lib/drawing";
import { loadCustomPoses, deleteCustomPose } from "@/lib/customPoses";
import posesData from "@/data/poses.json";

const POSES = posesData as unknown as PoseDefinition[];

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

  const [customPoses, setCustomPoses] = useState<PoseDefinition[]>([]);
  const [showReference, setShowReference] = useState(true);

  const [selectedPose, setSelectedPose] = useState<PoseDefinition | null>(null);
  const selectedPoseRef = useRef<PoseDefinition | null>(null);
  selectedPoseRef.current = selectedPose;
  const lastDisplayedScoreRef = useRef<number>(-1);
  const [comparisonResult, setComparisonResult] = useState<PoseComparisonResult | null>(null);
  const [jointColors, setJointColors] = useState<JointColorMap | undefined>(undefined);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackHeadline, setFeedbackHeadline] = useState("");

  const { stepFlow, advanceIfReady } = useStepFlow(selectedPose);

  // Load custom poses on mount
  useEffect(() => {
    setCustomPoses(loadCustomPoses());
  }, []);

  // Called by Camera when stream is live
  const handleVideoReady = useCallback(
    (el: HTMLVideoElement, dims: VideoDimensions) => {
      console.log("[Practice] handleVideoReady: video element ready, dims=%dx%d", dims.width, dims.height);
      setVideoEl(el);
      setVideoDims(dims);
    },
    []
  );

  // Toggle camera on/off
  const toggleCamera = useCallback(() => {
    setCameraActive((prev) => {
      const next = !prev;
      console.log("[Practice] toggleCamera: %s → %s", prev ? "on" : "off", next ? "on" : "off");
      if (prev) {
        setVideoEl(null);
        setLandmarks(null);
        setAngles({});
        setComparisonResult(null);
        setJointColors(undefined);
        setFeedbackItems([]);
        setFeedbackHeadline("");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    lastDisplayedScoreRef.current = -1;
    setComparisonResult(null);
    setJointColors(undefined);
    setFeedbackItems([]);
    setFeedbackHeadline("");
    cancelSpeech();
  }, [selectedPose]);

  // Stable callback: runs comparePose on every angles update from PoseCanvas.
  // Reads selectedPose via ref so it never needs to be in the dep array,
  // which would recreate the callback and restart the RAF loop.
  const handleAngles = useCallback((newAngles: AngleMap) => {
    setAngles(newAngles);
    const pose = selectedPoseRef.current;
    if (!pose || Object.keys(newAngles).length === 0) return;
    const result = comparePose(newAngles, pose);
    if (Math.abs(result.score - lastDisplayedScoreRef.current) >= CONFIG.SCORE_UPDATE_THROTTLE) {
      lastDisplayedScoreRef.current = result.score;
      setComparisonResult(result);
      setJointColors(comparisonToJointColors(result));
      setFeedbackItems(generateFeedback(result));
      setFeedbackHeadline(getFeedbackHeadline(result.score));
    }
    advanceIfReady(result);
  }, [advanceIfReady]);

  const poseDetected = landmarks !== null && landmarks.length > 0;
  const score = comparisonResult?.score ?? 0;
  const allPoses = [...POSES, ...customPoses];

  const handleDeletePose = (id: string) => {
    deleteCustomPose(id);
    setCustomPoses(loadCustomPoses());
    if (selectedPose?.id === id) {
      setSelectedPose(null);
    }
  };

  const handlePoseSaved = () => {
    setCustomPoses(loadCustomPoses());
  };

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
            onAngles={handleAngles}
            referenceLandmarks={selectedPose?.referenceLandmarks ?? null}
            showReferenceOverlay={showReference && !!selectedPose?.referenceLandmarks}
          />
        )}

        {/* ── Top-left status badges ── */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {cameraActive && videoEl && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(12,15,10,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(10px)",
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
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
                background: "rgba(12,15,10,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: score >= 80 ? "var(--joint-correct)" : score >= 50 ? "#c89630" : "var(--joint-error)",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(10px)",
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                transition: "color 400ms ease",
              }}
            >
              {score}% mastery
            </div>
          )}
        </div>

        {/* ── Top-right controls ── */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {cameraActive && videoEl && selectedPose?.referenceLandmarks && (
            <button
              onClick={() => setShowReference((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: showReference ? "rgba(120,180,255,0.15)" : "rgba(12,15,10,0.85)",
                border: showReference ? "1px solid rgba(120,180,255,0.4)" : "1px solid rgba(255,255,255,0.15)",
                color: showReference ? "rgba(120,180,255,0.9)" : "#ffffff",
                fontFamily: "var(--font-dm-sans)",
                backdropFilter: "blur(8px)",
              }}
              aria-pressed={showReference}
              title="Toggle reference skeleton overlay"
            >
              Ghost
            </button>
          )}
          {cameraActive && videoEl && (
            <button
              onClick={() => setShowDebug((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: showDebug ? "rgba(195,255,90,0.15)" : "rgba(12,15,10,0.85)",
                border: showDebug ? "1px solid rgba(195,255,90,0.4)" : "1px solid rgba(255,255,255,0.15)",
                color: showDebug ? "rgba(195,255,90,0.9)" : "#ffffff",
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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(12,15,10,0.9)",
            color: "#ffffff",
            fontFamily: "var(--font-dm-sans)",
            backdropFilter: "blur(12px)",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          Video processed locally · NEVER UPLOADED
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
            poses={allPoses}
            selectedId={selectedPose?.id ?? null}
            onSelect={(pose) => {
              console.log("[Practice] pose selected: %s (%s), %d angle constraints", pose?.id ?? "none", pose?.name ?? "", pose?.angles.length ?? 0);
              setSelectedPose(pose);
            }}
            onDelete={handleDeletePose}
          />
          {selectedPose && (
            <div className="flex items-start gap-3">
              {/* Pose illustration */}
              <div
                className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPose.imageUrl}
                  alt={selectedPose.name}
                  style={{ width: 60, height: 60, objectFit: "contain" }}
                />
              </div>
              <p
                className="text-xs leading-relaxed flex-1"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-dm-sans)",
                  fontStyle: "italic",
                }}
              >
                {selectedPose.description}
              </p>
            </div>
          )}

          {cameraActive && (
            <div className="pt-2">
              <RecordPoseFlow
                currentLandmarks={landmarks}
                onSave={handlePoseSaved}
              />
            </div>
          )}
        </div>

        {/* Master pose reference */}
        {selectedPose && <MasterPosePanel pose={selectedPose} />}

        {/* Step-by-step instructions or feedback */}
        {selectedPose && stepFlow.steps.length > 0 && (
          <StepInstructionPanel stepFlow={stepFlow} />
        )}

        {/* Score section */}
        <div
          className="p-5 flex flex-col gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Pose Mastery Score
          </h2>
          <ScoreDisplay score={score} poseSelected={!!selectedPose} analyzed={comparisonResult !== null} />
        </div>

        {/* Feedback panel (shown when step flow not available or in fallback mode) */}
        {!stepFlow.steps.length && (
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
              analyzed={comparisonResult !== null}
            />
          </div>
        )}

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
