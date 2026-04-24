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
  if (poseLandmarker) return poseLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
    );

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
export function detectPose(
  videoEl: HTMLVideoElement,
  timestampMs: number
): Landmark[] | null {
  if (!poseLandmarker) return null;
  if (videoEl.readyState < 2) return null;

  let result: PoseLandmarkerResult;
  try {
    result = poseLandmarker.detectForVideo(videoEl, timestampMs);
  } catch {
    return null;
  }

  if (!result.landmarks || result.landmarks.length === 0) return null;

  // Return the 33 landmarks for the first person as our Landmark type
  return result.landmarks[0] as Landmark[];
}

/**
 * Release resources. Call when the practice page unmounts.
 */
export function disposePoseLandmarker(): void {
  poseLandmarker?.close();
  poseLandmarker = null;
  initPromise = null;
}
