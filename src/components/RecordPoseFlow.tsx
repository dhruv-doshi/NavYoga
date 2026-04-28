"use client";

import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import { averageLandmarks, derivePoseAngles, saveCustomPose, generatePoseId, updateCustomPoseSteps } from "@/lib/customPoses";
import { generateSteps } from "@/lib/llm";
import { detectPoseFromImage } from "@/lib/mediapipe";
import { drawSkeleton } from "@/lib/drawing";
import { CONFIG } from "@/lib/config";
import type { Landmark, PoseDefinition, VideoStep } from "@/lib/types";

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

interface NamingFormProps {
  capturedLandmarks: Landmark[];
  imageUrl?: string;
  videoSteps?: VideoStep[];
  onSave: (pose: PoseDefinition) => void;
  onCancel: () => void;
  onSaved: () => void;
}

function NamingForm({ capturedLandmarks, imageUrl, videoSteps, onSave, onCancel, onSaved }: NamingFormProps) {
  const [naming, setNaming] = useState<{
    name: string;
    sanskrit: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  }>({ name: "", sanskrit: "", difficulty: "beginner" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!naming.name.trim()) return;
    if (capturedLandmarks.length === 0) {
      alert("No pose data captured. Please try again.");
      return;
    }

    setSaving(true);

    try {
      const angles = derivePoseAngles(capturedLandmarks);
      const newPose: PoseDefinition = {
        id: generatePoseId(naming.name),
        name: naming.name,
        sanskrit: naming.sanskrit || "",
        description: `Custom pose recorded on ${new Date().toLocaleDateString()}`,
        difficulty: naming.difficulty,
        imageUrl: imageUrl || "/images/mountain.svg",
        angles,
        referenceLandmarks: capturedLandmarks,
        isCustom: true,
        recordedAt: new Date().toISOString(),
      };

      if (videoSteps && videoSteps.length > 0) {
        // Video steps already analyzed — skip LLM generation
        newPose.videoSteps = videoSteps;
      } else {
        // Generate text-only steps via LLM
        try {
          const steps = await generateSteps(newPose);
          newPose.cachedSteps = steps;
        } catch (e) {
          console.warn("[NamingForm] Failed to generate steps:", e);
        }
      }

      console.log("[NamingForm] Saving pose: id=%s name=%s videoSteps=%d cachedSteps=%d",
        newPose.id, newPose.name, newPose.videoSteps?.length ?? 0, newPose.cachedSteps?.length ?? 0);
      saveCustomPose(newPose);
      if (newPose.cachedSteps) {
        updateCustomPoseSteps(newPose.id, newPose.cachedSteps);
      }
      console.log("[NamingForm] Pose saved to localStorage, calling onSave");
      onSave(newPose);
      onSaved();
    } finally {
      setSaving(false);
    }
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
            onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
            placeholder="e.g., My Warrior I"
            disabled={saving}
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
            disabled={saving}
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="block mb-5">
          <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Difficulty</span>
          <select
            value={naming.difficulty}
            onChange={(e) =>
              setNaming({ ...naming, difficulty: e.target.value as "beginner" | "intermediate" | "advanced" })
            }
            disabled={saving}
            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!naming.name.trim() || saving}
            className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {saving ? "Saving..." : "Save Pose"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

function poseSlug(name: string): string {
  return name.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "pose";
}

type VideoPhase = "idle" | "loaded" | "naming" | "extracting" | "analyzing" | "uploading" | "done" | "error";

function VideoUploadFlow({ onSave }: { onSave: (pose: PoseDefinition) => void }) {
  const [phase, setPhase] = useState<VideoPhase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [pendingSanskrit, setPendingSanskrit] = useState("");
  const [pendingDifficulty, setPendingDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [progressLabel, setProgressLabel] = useState("");
  const [detectedLandmarks, setDetectedLandmarks] = useState<Landmark[]>([]);
  const [videoSteps, setVideoSteps] = useState<VideoStep[]>([]);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Please select a video file.");
      setPhase("error");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPhase("loaded");
  }, []);

  const processVideo = useCallback(async () => {
    if (!videoUrl) return;

    // Build a fresh off-screen video element — the DOM ref is gone once we leave "loaded" phase
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });

    console.log("[VideoUpload] processVideo started, duration=%ds", Math.round(video.duration));

    if (video.duration > CONFIG.VIDEO_MAX_DURATION_S) {
      setErrorMsg(`Video must be ${CONFIG.VIDEO_MAX_DURATION_S} seconds or shorter. Yours is ${Math.round(video.duration)}s.`);
      setPhase("error");
      return;
    }

    setPhase("extracting");
    setProgressLabel("Extracting frames…");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d")!;

      const totalFrames = CONFIG.VIDEO_ANALYSIS_FRAME_COUNT;
      const interval = video.duration / totalFrames;
      const frameDataUrls: string[] = [];
      const frameBase64: string[] = [];
      let landmarksForAngles: Landmark[] = [];

      for (let i = 0; i < totalFrames; i++) {
        setProgressLabel(`Extracting frames… ${i + 1}/${totalFrames}`);
        await seekTo(video, i * interval);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        frameDataUrls.push(dataUrl);
        frameBase64.push(dataUrl.split(",")[1]);

        // Use first frame for landmark/angle detection
        if (i === 0) {
          const lm = await detectPoseFromImage(canvas);
          if (lm && lm.length > 0) {
            landmarksForAngles = lm;
            drawSkeleton(ctx, lm, canvas.width, canvas.height, undefined, false);
            setFirstFrameUrl(canvas.toDataURL("image/jpeg", 0.85));
          }
        }
      }

      if (landmarksForAngles.length === 0) {
        setErrorMsg("Could not detect a person in the video. Please use a clearer video.");
        setPhase("error");
        return;
      }

      setDetectedLandmarks(landmarksForAngles);

      // Call Claude vision via OpenRouter to analyze transitions
      setPhase("analyzing");
      setProgressLabel("Analyzing pose transitions…");

      const analyzeRes = await fetch("/api/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frames: frameBase64,
          difficulty: pendingDifficulty,
          poseName: pendingName,
        }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Video analysis failed");
      }

      const { steps: rawSteps } = await analyzeRes.json();

      // Upload selected frame images to Vercel Blob
      setPhase("uploading");
      const assembled: VideoStep[] = [];
      // Use canvas data URLs directly — no blob upload needed, avoids private-store auth issues
      const slug = poseSlug(pendingName);
      for (let i = 0; i < rawSteps.length; i++) {
        const s = rawSteps[i];
        setProgressLabel(`Preparing step images… ${i + 1}/${rawSteps.length}`);
        const frameIdx = Math.min(Math.max(0, s.frameIndex), frameDataUrls.length - 1);
        const imageUrl = frameDataUrls[frameIdx];
        console.log(`[VideoUpload] step ${i} (${slug}-step-${i}): frameIdx=${frameIdx} imageUrl length=${imageUrl.length}`);
        assembled.push({
          index: i,
          title: s.title,
          instruction: s.instruction,
          focusJoints: s.focusJoints ?? [],
          imageUrl,
        });
      }

      if (assembled.length === 0) {
        throw new Error("No steps returned from analysis.");
      }

      setVideoSteps(assembled);
      setPhase("done");
    } catch (e) {
      console.error("[VideoUpload] processVideo error:", e);
      setErrorMsg(e instanceof Error ? e.message : "Failed to process video. Please try another.");
      setPhase("error");
    }
  }, [videoUrl, pendingDifficulty, pendingName]);

  // Kick off processing once we have name + difficulty (phase transitions to extracting)
  const handleNamingSubmit = useCallback(() => {
    if (!pendingName.trim()) return;
    processVideo();
  }, [pendingName, processVideo]);

  const reset = useCallback(() => {
    setPhase("idle");
    setVideoUrl(null);
    setPendingName("");
    setPendingSanskrit("");
    setPendingDifficulty("beginner");
    setVideoSteps([]);
    setDetectedLandmarks([]);
    setFirstFrameUrl(null);
    setErrorMsg("");
  }, []);

  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs font-medium rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
        >
          Upload Instructor Video
        </button>
        {phase === "error" && <p className="text-xs text-red-400">{errorMsg}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
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

  if (phase === "loaded") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden max-w-lg w-full shadow-2xl">
          <div className="relative bg-black">
            <video
              src={videoUrl || ""}
              controls
              className="w-full aspect-video"
              style={{ maxHeight: "360px" }}
            />
          </div>
          <div className="p-4 flex gap-3">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => setPhase("naming")}
              className="flex-1 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Use This Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "naming") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
          <h3 className="text-lg font-bold mb-1 text-white">Name This Pose</h3>
          <p className="text-xs text-gray-400 mb-4">Provide details before we analyze the video.</p>

          <label className="block mb-3">
            <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Pose Name *</span>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNamingSubmit()}
              placeholder="e.g., Warrior I"
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Sanskrit (optional)</span>
            <input
              type="text"
              value={pendingSanskrit}
              onChange={(e) => setPendingSanskrit(e.target.value)}
              placeholder="e.g., Virabhadrasana I"
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </label>

          <label className="block mb-5">
            <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Difficulty</span>
            <select
              value={pendingDifficulty}
              onChange={(e) => setPendingDifficulty(e.target.value as "beginner" | "intermediate" | "advanced")}
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase("loaded")}
              className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleNamingSubmit}
              disabled={!pendingName.trim()}
              className="flex-1 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Analyze Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "extracting" || phase === "analyzing" || phase === "uploading") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3 bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-xs w-full mx-4">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-300 text-center">{progressLabel}</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <NamingForm
        capturedLandmarks={detectedLandmarks}
        imageUrl={firstFrameUrl ?? undefined}
        videoSteps={videoSteps}
        onSave={onSave}
        onCancel={reset}
        onSaved={reset}
      />
    );
  }

  return null;
}

export function RecordPoseFlow({ currentLandmarks, onSave }: RecordPoseFlowProps) {
  const [state, dispatch] = useReducer(reducer, { phase: "idle", countdown: 0 });
  const bufferRef = useRef<Landmark[][]>([]);

  useEffect(() => {
    if (state.phase !== "countdown") return;
    const id = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "capturing") return;
    bufferRef.current = [];
    const id = setTimeout(() => dispatch({ type: "finish_capture" }), 2000);
    return () => clearTimeout(id);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "capturing" && currentLandmarks && currentLandmarks.length > 0) {
      bufferRef.current.push([...currentLandmarks]);
    }
  }, [state.phase, currentLandmarks]);

  useEffect(() => {
    if (state.phase !== "saved") return;
    const id = setTimeout(() => dispatch({ type: "reset" }), 1500);
    return () => clearTimeout(id);
  }, [state.phase]);

  const handleSavePose = (pose: PoseDefinition) => {
    onSave(pose);
    dispatch({ type: "save" });
  };

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

  if (state.phase === "saved") {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full z-50 pointer-events-none"
        style={{ background: "rgba(12,15,10,0.85)", border: "1px solid rgba(95,173,91,0.4)", backdropFilter: "blur(8px)" }}
      >
        <span className="text-sm text-green-400">✓ Pose saved!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => dispatch({ type: "start" })}
        className="px-3 py-2 text-xs font-medium rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
      >
        📹 Record Pose
      </button>
      <VideoUploadFlow onSave={(pose) => { onSave(pose); dispatch({ type: "save" }); }} />
    </div>
  );
}
