"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { derivePoseAngles, saveCustomPose, generatePoseId } from "@/lib/customPoses";
import { generateSteps } from "@/lib/llm";
import { detectPoseFromImage } from "@/lib/mediapipe";
import { drawSkeleton } from "@/lib/drawing";
import { CONFIG } from "@/lib/config";
import { computeFrameSampleTimes } from "@/lib/videoSampling";
import type { Landmark, PoseDefinition, VideoStep } from "@/lib/types";

interface RecordPoseFlowProps {
  onSave: (pose: PoseDefinition) => void;
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
  const [pendingMasterName, setPendingMasterName] = useState("");
  const [pendingIsPublic, setPendingIsPublic] = useState(false);
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
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > CONFIG.VIDEO_MAX_FILE_SIZE_MB) {
      setErrorMsg(`Video must be under ${CONFIG.VIDEO_MAX_FILE_SIZE_MB}MB. Yours is ${Math.round(sizeMB)}MB.`);
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
      const { times, trimStart } = computeFrameSampleTimes(video.duration, totalFrames, 0.05, 0.95);
      const frameDataUrls: string[] = [];
      const frameBase64: string[] = [];
      let landmarksForAngles: Landmark[] = [];

      for (let i = 0; i < totalFrames; i++) {
        setProgressLabel(`Extracting frames… ${i + 1}/${totalFrames}`);
        await seekTo(video, times[i]);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        frameDataUrls.push(dataUrl);
        frameBase64.push(dataUrl.split(",")[1]);

        // Try up to the first 3 frames for landmark/angle detection
        if (landmarksForAngles.length === 0 && i < 3) {
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

      // Extract per-step reference landmarks and upload images to Vercel Blob
      setPhase("uploading");
      const assembled: VideoStep[] = [];
      const slug = poseSlug(pendingName);
      let prevLandmarks: Landmark[] = landmarksForAngles;
      for (let i = 0; i < rawSteps.length; i++) {
        const s = rawSteps[i];
        setProgressLabel(`Preparing step ${i + 1}/${rawSteps.length}…`);
        const frameIdx = Math.min(Math.max(0, s.frameIndex), frameDataUrls.length - 1);
        const t = times[frameIdx] ?? trimStart;
        let stepLandmarks: Landmark[] = prevLandmarks;
        let stepConfidence = 0;
        try {
          await seekTo(video, t);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const lm = await detectPoseFromImage(canvas);
          if (lm && lm.length > 0) {
            stepLandmarks = lm;
            stepConfidence = lm.reduce((a, b) => a + (b.visibility ?? 0), 0) / lm.length;
            prevLandmarks = lm;
          }
        } catch (e) {
          console.warn(`[VideoUpload] per-step landmark extraction failed at step ${i}:`, e);
        }

        // Upload keyframe image to Vercel Blob
        let imageUrl = frameDataUrls[frameIdx];
        try {
          const blob = await fetch(frameDataUrls[frameIdx]).then((r) => r.blob());
          const form = new FormData();
          form.append("file", new File([blob], `${slug}-step-${i}.jpg`, { type: "image/jpeg" }));
          form.append("poseName", slug);
          form.append("stepIndex", String(i));
          const uploadRes = await fetch("/api/upload-image", { method: "POST", body: form });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            imageUrl = url;
          }
        } catch (e) {
          console.warn(`[VideoUpload] blob upload failed for step ${i}, using data URL:`, e);
        }

        assembled.push({
          index: i,
          title: s.title,
          instruction: s.instruction,
          focusJoints: s.focusJoints ?? [],
          imageUrl,
          referenceLandmarks: stepLandmarks,
          referenceLandmarksConfidence: stepConfidence,
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
    setPendingMasterName("");
    setPendingIsPublic(false);
    setVideoSteps([]);
    setDetectedLandmarks([]);
    setFirstFrameUrl(null);
    setErrorMsg("");
  }, []);

  useEffect(() => {
    if (phase !== "done") return;

    const autoSave = async () => {
      setProgressLabel("Saving pose…");
      try {
        const angles = derivePoseAngles(detectedLandmarks);
        const newPose: PoseDefinition = {
          id: generatePoseId(pendingName),
          name: pendingName,
          sanskrit: pendingSanskrit || "",
          description: `Custom pose recorded on ${new Date().toLocaleDateString()}`,
          difficulty: pendingDifficulty,
          imageUrl: firstFrameUrl || "/images/mountain.svg",
          angles,
          referenceLandmarks: detectedLandmarks,
          isCustom: true,
          recordedAt: new Date().toISOString(),
          masterName: pendingMasterName || undefined,
          isPublic: pendingIsPublic,
          videoSteps: videoSteps && videoSteps.length > 0 ? videoSteps : undefined,
        };

        if (!videoSteps || videoSteps.length === 0) {
          try {
            const steps = await generateSteps(newPose);
            newPose.cachedSteps = steps;
          } catch (e) {
            console.warn("[VideoUpload] Failed to generate steps:", e);
          }
        }

        console.log("[VideoUpload] Auto-saving pose: id=%s name=%s videoSteps=%d cachedSteps=%d",
          newPose.id, newPose.name, newPose.videoSteps?.length ?? 0, newPose.cachedSteps?.length ?? 0);
        await saveCustomPose(newPose);
        onSave(newPose);
        reset();
      } catch (e) {
        console.error("[VideoUpload] Auto-save failed:", e);
        setErrorMsg("Failed to save pose. Please try again.");
        setPhase("error");
      }
    };

    autoSave();
  }, [phase, detectedLandmarks, pendingName, pendingSanskrit, pendingDifficulty, pendingMasterName, pendingIsPublic, firstFrameUrl, videoSteps]);

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

          <label className="block mb-3">
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

          <label className="block mb-3">
            <span className="text-xs text-gray-400 mb-1 block uppercase tracking-wide">Master Name (optional)</span>
            <input
              type="text"
              value={pendingMasterName}
              onChange={(e) => setPendingMasterName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </label>

          <label className="block mb-5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pendingIsPublic}
              onChange={(e) => setPendingIsPublic(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border border-gray-700 cursor-pointer"
            />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Make Public</span>
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
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3 bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-xs w-full mx-4">
          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-300 text-center">{progressLabel}</p>
        </div>
      </div>
    );
  }

  return null;
}

export function RecordPoseFlow({ onSave }: RecordPoseFlowProps) {
  return <VideoUploadFlow onSave={onSave} />;
}
