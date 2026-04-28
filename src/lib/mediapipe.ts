/**
 * @file lib/mediapipe.ts
 * @description MediaPipe PoseLandmarker initialization and per-frame detection.
 *
 * Phase 4:
 * - Load the PoseLandmarker WASM/model from CDN via FilesetResolver
 * - Expose `initPoseLandmarker()` to create the detector once
 * - Expose `detectPose()` to run inference on a single video frame
 *
 * The model runs fully client-side via WebAssembly — no network calls during
 * practice. The initial model download (~6 MB) is cached by the browser.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Landmark } from "./types";

// ---------------------------------------------------------------------------
// Singleton — reuse the same PoseLandmarker instance across frames
// ---------------------------------------------------------------------------

let poseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Initialize the MediaPipe PoseLandmarker (idempotent — safe to call multiple times).
 * Returns the shared instance after the WASM runtime and model are loaded.
 */
export async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) {
    console.log("[MediaPipe] initPoseLandmarker: already initialized, reusing instance");
    return poseLandmarker;
  }
  if (initPromise) {
    console.log("[MediaPipe] initPoseLandmarker: init already in progress, awaiting...");
    return initPromise;
  }

  console.log("[MediaPipe] initPoseLandmarker: starting initialization");

  initPromise = (async () => {
    console.log("[MediaPipe] Loading WASM runtime from CDN...");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
    );
    console.log("[MediaPipe] WASM runtime loaded. Creating PoseLandmarker...");

    try {
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch {
      console.warn("[MediaPipe] GPU delegate failed for VIDEO mode, retrying with CPU");
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    console.log("[MediaPipe] PoseLandmarker ready. Model: pose_landmarker_lite, delegate: GPU");
    return poseLandmarker;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Per-frame detection
// ---------------------------------------------------------------------------

/**
 * Run pose detection on the current video frame.
 * Must be called after `initPoseLandmarker()` resolves.
 *
 * @param videoEl - The live <video> element
 * @param timestampMs - Current timestamp in milliseconds (from performance.now())
 * @returns Array of 33 landmarks for the first detected person, or null if none.
 */
let _lastDetectionHadLandmarks: boolean | null = null;

export function detectPose(
  videoEl: HTMLVideoElement,
  timestampMs: number
): Landmark[] | null {
  if (!poseLandmarker) {
    console.warn("[MediaPipe] detectPose called before PoseLandmarker was initialized");
    return null;
  }
  if (videoEl.readyState < 2) {
    console.debug("[MediaPipe] detectPose: video not ready (readyState=%d)", videoEl.readyState);
    return null;
  }

  let result: PoseLandmarkerResult;
  try {
    result = poseLandmarker.detectForVideo(videoEl, timestampMs);
  } catch (err) {
    console.error("[MediaPipe] detectForVideo threw:", err);
    return null;
  }

  const hasLandmarks = !!(result.landmarks && result.landmarks.length > 0);

  // Only log on state transitions (pose appears / disappears) to avoid flooding
  if (hasLandmarks !== _lastDetectionHadLandmarks) {
    if (hasLandmarks) {
      console.log("[MediaPipe] Pose detected — %d landmarks on first person", result.landmarks[0].length);
    } else {
      console.log("[MediaPipe] No pose detected in frame");
    }
    _lastDetectionHadLandmarks = hasLandmarks;
  }

  if (!hasLandmarks) return null;

  return result.landmarks[0] as Landmark[];
}

/**
 * Release resources. Call when the practice page unmounts.
 */
export function disposePoseLandmarker(): void {
  console.log("[MediaPipe] disposePoseLandmarker: releasing resources");
  poseLandmarker?.close();
  poseLandmarker = null;
  initPromise = null;
  _lastDetectionHadLandmarks = null;
}

// ---------------------------------------------------------------------------
// Image mode detection (separate instance — IMAGE runningMode)
// ---------------------------------------------------------------------------

let imageLandmarker: PoseLandmarker | null = null;
let imageInitPromise: Promise<PoseLandmarker> | null = null;

async function getImageLandmarker(): Promise<PoseLandmarker> {
  if (imageLandmarker) return imageLandmarker;
  if (imageInitPromise) return imageInitPromise;

  imageInitPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
    );
    try {
      imageLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
      });
    } catch {
      console.warn("[MediaPipe] GPU delegate failed for IMAGE mode, retrying with CPU");
      imageLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
      });
    }
    return imageLandmarker;
  })();

  return imageInitPromise;
}

/**
 * Detect pose landmarks from a static image element.
 * Returns 33 landmarks or null if no person detected.
 */
export async function detectPoseFromImage(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<Landmark[] | null> {
  const lm = await getImageLandmarker();
  let result: PoseLandmarkerResult;
  try {
    result = lm.detect(source);
  } catch (err) {
    console.error("[MediaPipe] detectPoseFromImage threw:", err);
    return null;
  }
  if (!result.landmarks || result.landmarks.length === 0) return null;
  return result.landmarks[0] as Landmark[];
}
