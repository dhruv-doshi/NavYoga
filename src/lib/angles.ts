/**
 * @file lib/angles.ts
 * @description Joint angle calculation from MediaPipe landmark triplets.
 *
 * Phase 6:
 * - `calcAngle(a, b, c)` — angle at vertex b using dot-product formula
 * - `computeAngles(landmarks)` — compute all named joint angles at once
 *
 * The angle is always measured at the MIDDLE landmark (b / vertex).
 * Result is in degrees [0, 180].
 */

import type { Landmark, AngleMap } from "./types";

// ---------------------------------------------------------------------------
// Core geometry
// ---------------------------------------------------------------------------

/**
 * Compute the angle (in degrees) at vertex `b` formed by points a → b → c.
 * Uses the dot-product of vectors (a-b) and (c-b).
 *
 * Returns 0 if either vector has zero length (degenerate triplet).
 */
export function calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const az = a.z - b.z;

  const cx = c.x - b.x;
  const cy = c.y - b.y;
  const cz = c.z - b.z;

  const dot = ax * cx + ay * cy + az * cz;
  const magA = Math.sqrt(ax * ax + ay * ay + az * az);
  const magC = Math.sqrt(cx * cx + cy * cy + cz * cz);

  if (magA === 0 || magC === 0) return 0;

  // Clamp to [-1, 1] to guard against floating-point drift before acos
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Named joint definitions
// Each entry: [jointName, landmarkA, landmarkB (vertex), landmarkC]
// Landmark indices from MediaPipe BlazePose 33-landmark topology:
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------

const JOINT_DEFINITIONS: Array<[string, number, number, number]> = [
  // Arms
  ["leftShoulder",  11, 13, 15], // left shoulder (elbow as vertex)
  ["rightShoulder", 12, 14, 16], // right shoulder
  ["leftElbow",     11, 13, 15], // elbow: shoulder→elbow→wrist (same indices, vertex=13)
  ["rightElbow",    12, 14, 16],
  // Hips
  ["leftHip",       11, 23, 25], // left hip: shoulder→hip→knee
  ["rightHip",      12, 24, 26],
  // Knees
  ["leftKnee",      23, 25, 27], // left knee: hip→knee→ankle
  ["rightKnee",     24, 26, 28],
  // Ankles
  ["leftAnkle",     25, 27, 31], // left ankle: knee→ankle→heel
  ["rightAnkle",    26, 28, 32],
  // Torso (spine-ish)
  ["spine",         23, 11, 12], // midpoint approximation: left hip → left shoulder → right shoulder
];

// Correct the shoulder and elbow definitions — they use different vertex landmarks:
// leftShoulder:  13 → 11 → 23  (elbow → shoulder → hip)
// leftElbow:     11 → 13 → 15  (shoulder → elbow → wrist)
const CORRECTED_JOINTS: Array<[string, number, number, number]> = [
  ["leftShoulder",  13, 11, 23],
  ["rightShoulder", 14, 12, 24],
  ["leftElbow",     11, 13, 15],
  ["rightElbow",    12, 14, 16],
  ["leftHip",       11, 23, 25],
  ["rightHip",      12, 24, 26],
  ["leftKnee",      23, 25, 27],
  ["rightKnee",     24, 26, 28],
  ["leftAnkle",     25, 27, 31],
  ["rightAnkle",    26, 28, 32],
];

// ---------------------------------------------------------------------------
// Visibility threshold — skip landmarks that MediaPipe is not confident about
// ---------------------------------------------------------------------------

const VISIBILITY_THRESHOLD = 0.3;

/**
 * Compute all named joint angles from a set of 33 MediaPipe landmarks.
 *
 * @param landmarks - Array of 33 Landmark objects (from MediaPipe)
 * @returns AngleMap — e.g. { leftElbow: 165.2, rightKnee: 92.4, ... }
 *          Joints where any landmark has low visibility are omitted.
 */
export function computeAngles(landmarks: Landmark[]): AngleMap {
  const angles: AngleMap = {};
  const skipped: string[] = [];

  for (const [name, idxA, idxB, idxC] of CORRECTED_JOINTS) {
    const a = landmarks[idxA];
    const b = landmarks[idxB];
    const c = landmarks[idxC];

    if (!a || !b || !c) {
      skipped.push(`${name}(missing landmark)`);
      continue;
    }

    // Skip if any landmark has low confidence
    if (
      (a.visibility ?? 1) < VISIBILITY_THRESHOLD ||
      (b.visibility ?? 1) < VISIBILITY_THRESHOLD ||
      (c.visibility ?? 1) < VISIBILITY_THRESHOLD
    ) {
      skipped.push(`${name}(low-visibility: ${[a.visibility?.toFixed(2), b.visibility?.toFixed(2), c.visibility?.toFixed(2)].join(",")})`);
      continue;
    }

    angles[name] = Math.round(calcAngle(a, b, c) * 10) / 10;
  }

  console.debug(
    "[Angles] computeAngles: %d/%d joints computed. Angles: %o | Skipped: %s",
    Object.keys(angles).length,
    CORRECTED_JOINTS.length,
    angles,
    skipped.length > 0 ? skipped.join(", ") : "none"
  );

  return angles;
}
