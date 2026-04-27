"use client";

import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import { averageLandmarks, derivePoseAngles, saveCustomPose, generatePoseId } from "@/lib/customPoses";
import { detectPoseFromImage } from "@/lib/mediapipe";
import { drawSkeleton } from "@/lib/drawing";
import type { Landmark, PoseDefinition } from "@/lib/types";

interface RecordPoseFlowProps {
  currentLandmarks: Landmark[] | null;
  onSave: (pose: PoseDefinition) => void;
}

type Phase = "idle" | "countdown" | "capturing" | "naming" | "saved";

interface RecordingState {
  phase: Phase;
  countdown: number;
}

type Action =
  | { type: "start" }
  | { type: "tick" }
  | { type: "finish_capture" }
  | { type: "save" }
  | { type: "reset" };

function reducer(state: RecordingState, action: Action): RecordingState {
  switch (action.type) {
    case "start":
      return { phase: "countdown", countdown: 3 };
    case "tick":
      if (state.countdown <= 1) return { phase: "capturing", countdown: 0 };
      return { ...state, countdown: state.countdown - 1 };
    case "finish_capture":
      return { ...state, phase: "naming" };
    case "save":
      return { phase: "saved", countdown: 0 };
    case "reset":
      return { phase: "idle", countdown: 0 };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Naming form shared by both record and upload paths
// ---------------------------------------------------------------------------

interface NamingFormProps {
  capturedLandmarks: Landmark[];
  onSave: (pose: PoseDefinition) => void;
  onCancel: () => void;
  onSaved: () => void;
}

function NamingForm({ capturedLandmarks, onSave, onCancel, onSaved }: NamingFormProps) {
  const [naming, setNaming] = useState<{
    name: string;
    sanskrit: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  }>({ name: "", sanskrit: "", difficulty: "beginner" });

  const handleSave = () => {
    if (!naming.name.trim()) return;
    if (capturedLandmarks.length === 0) {
      alert("No pose data captured. Please try again.");
      return;
    }

    const angles = derivePoseAngles(capturedLandmarks);
    const newPose: PoseDefinition = {
      id: generatePoseId(naming.name),
      name: naming.name,
      sanskrit: naming.sanskrit || "",
      description: `Custom pose recorded on ${new Date().toLocaleDateString()}`,
      difficulty: naming.difficulty,
      imageUrl: "/images/mountain.svg",
      angles,
      referenceLandmarks: capturedLandmarks,
      isCustom: true,
      recordedAt: new Date().toISOString(),
    };

    saveCustomPose(newPose);
    onSave(newPose);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-bold mb-4 text-white">Name Your Pose</h3>

        <label className="block mb-3">
          <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Pose Name *</span>
          <input
            type="text"
            value={naming.name}
            onChange={(e) => setNaming({ ...naming, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="e.g., My Warrior I"
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Sanskrit (optional)</span>
          <input
            type="text"
            value={naming.sanskrit}
            onChange={(e) => setNaming({ ...naming, sanskrit: e.target.value })}
            placeholder="e.g., Virabhadrasana I"
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="block mb-5">
          <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Difficulty</span>
          <select
            value={naming.difficulty}
            onChange={(e) =>
              setNaming({ ...naming, difficulty: e.target.value as "beginner" | "intermediate" | "advanced" })
            }
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!naming.name.trim()}
            className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Save Pose
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photo upload sub-flow
// ---------------------------------------------------------------------------

function UploadFlow({ onSave }: { onSave: (pose: PoseDefinition) => void }) {
  const [phase, setPhase] = useState<"idle" | "detecting" | "preview" | "naming" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedLandmarks, setDetectedLandmarks] = useState<Landmark[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      setPhase("error");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPhase("detecting");

    const img = new Image();
    img.onload = async () => {
      const landmarks = await detectPoseFromImage(img);
      if (!landmarks || landmarks.length === 0) {
        setErrorMsg("No person detected in the photo. Please try a clearer full-body image.");
        setPhase("error");
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
        return;
      }
      setDetectedLandmarks(landmarks);
      setPhase("preview");

      // Draw skeleton on canvas after a short delay for canvas to mount
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const imgEl = new Image();
        imgEl.src = url;
        imgEl.onload = () => {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(imgEl, 0, 0, w, h);
          drawSkeleton(ctx, landmarks, w, h, undefined, false);
        };
      });
    };
    img.onerror = () => {
      setErrorMsg("Failed to load the image.");
      setPhase("error");
    };
    img.src = url;
  }, []);

  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs font-medium rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
        >
          🖼 Upload Photo
        </button>
        {phase === "error" && (
          <p className="text-xs text-red-400">{errorMsg}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  if (phase === "detecting") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300">
        <span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
        Detecting pose...
      </div>
    );
  }

  if (phase === "preview" && previewUrl) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="relative">
              {/* Composite: image + skeleton drawn on canvas */}
              <canvas
                ref={canvasRef}
                width={480}
                height={360}
                className="w-full block"
              />
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => { setPhase("idle"); setPreviewUrl(null); }}
                className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                Retake
              </button>
              <button
                onClick={() => setPhase("naming")}
                className="flex-1 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Use This Pose
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (phase === "naming") {
    return (
      <NamingForm
        capturedLandmarks={detectedLandmarks}
        onSave={onSave}
        onCancel={() => setPhase("idle")}
        onSaved={() => setPhase("idle")}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RecordPoseFlow({ currentLandmarks, onSave }: RecordPoseFlowProps) {
  const [state, dispatch] = useReducer(reducer, { phase: "idle", countdown: 0 });
  // Buffer lives in a ref — never in reducer state — so frame collection
  // doesn't re-render and the capture timer effect stays stable.
  const bufferRef = useRef<Landmark[][]>([]);

  // ── Countdown tick (runs only once per second, stable)
  useEffect(() => {
    if (state.phase !== "countdown") return;
    const id = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // ── Capture timer (2 s, only depends on phase — never cancelled by frames)
  useEffect(() => {
    if (state.phase !== "capturing") return;
    bufferRef.current = []; // fresh buffer each capture session
    const id = setTimeout(() => dispatch({ type: "finish_capture" }), 2000);
    return () => clearTimeout(id);
  }, [state.phase]);

  // ── Frame collection (no cleanup — just pushes into the ref)
  useEffect(() => {
    if (state.phase === "capturing" && currentLandmarks && currentLandmarks.length > 0) {
      bufferRef.current.push([...currentLandmarks]);
    }
  }, [state.phase, currentLandmarks]);

  // ── Auto-reset after "saved" flash
  useEffect(() => {
    if (state.phase !== "saved") return;
    const id = setTimeout(() => dispatch({ type: "reset" }), 1500);
    return () => clearTimeout(id);
  }, [state.phase]);

  const handleSavePose = (pose: PoseDefinition) => {
    onSave(pose);
    dispatch({ type: "save" });
  };

  // ── Countdown overlay
  if (state.phase === "countdown") {
    return (
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          <div
            className="text-8xl font-bold animate-pulse"
            style={{ color: "rgba(120,180,255,0.9)", textShadow: "0 0 40px rgba(120,180,255,0.5)" }}
          >
            {state.countdown}
          </div>
          <p className="text-sm text-blue-200 opacity-70">Hold your pose…</p>
        </div>
      </div>
    );
  }

  // ── Capturing overlay
  if (state.phase === "capturing") {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full z-50 pointer-events-none"
        style={{ background: "rgba(12,15,10,0.85)", border: "1px solid rgba(120,180,255,0.3)", backdropFilter: "blur(8px)" }}
      >
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-sm text-blue-200">Capturing pose…</span>
      </div>
    );
  }

  // ── Naming modal (after camera capture)
  if (state.phase === "naming") {
    const averaged = averageLandmarks(bufferRef.current);
    return (
      <NamingForm
        capturedLandmarks={averaged}
        onSave={handleSavePose}
        onCancel={() => dispatch({ type: "reset" })}
        onSaved={() => dispatch({ type: "save" })}
      />
    );
  }

  // ── Saved confirmation
  if (state.phase === "saved") {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full z-50 pointer-events-none"
        style={{ background: "rgba(12,15,10,0.85)", border: "1px solid rgba(95,173,91,0.4)", backdropFilter: "blur(8px)" }}
      >
        <span className="text-sm text-green-400">✓ Pose saved!</span>
      </div>
    );
  }

  // ── Idle: show both buttons
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => dispatch({ type: "start" })}
        className="px-3 py-2 text-xs font-medium rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
      >
        📹 Record Pose
      </button>
      <UploadFlow onSave={(pose) => { onSave(pose); dispatch({ type: "save" }); }} />
    </div>
  );
}
