/**
 * @file lib/drawing.ts
 * @description Canvas drawing utilities for the skeleton overlay.
 *
 * Phase 5:
 * - `drawSkeleton(ctx, landmarks, dims)` — draw connected bones and joint circles
 * - Color joints green (correct) or red (incorrect) based on comparison results
 * - Mirror the skeleton horizontally to match the mirrored video element
 *
 * Phase 8+ will pass joint status colors; for now everything draws in accent color.
 */

import type { Landmark } from "./types";

// ---------------------------------------------------------------------------
// BlazePose 33-landmark connection topology
// Each pair is [landmarkA, landmarkB] forming a bone segment
// ---------------------------------------------------------------------------

export const POSE_CONNECTIONS: Array<[number, number]> = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export const COLORS = {
  bone: "rgba(195, 255, 90, 0.75)",     // Lime-green bone line
  joint: "rgba(195, 255, 90, 1)",       // Bright joint circle
  jointCorrect: "rgba(95, 173, 91, 1)", // Green for correct joints
  jointError: "rgba(192, 97, 74, 1)",   // Red for incorrect joints
  boneError: "rgba(192, 97, 74, 0.6)",  // Red bone
} as const;

// ---------------------------------------------------------------------------
// Types for colored joints (Phase 8+)
// ---------------------------------------------------------------------------

export type JointColorMap = Record<string, "correct" | "error" | "default">;

// ---------------------------------------------------------------------------
// Main drawing function
// ---------------------------------------------------------------------------

/**
 * Clear the canvas and draw the full pose skeleton.
 *
 * @param ctx - 2D canvas rendering context
 * @param landmarks - Array of 33 normalized landmarks from MediaPipe
 * @param width - Canvas/video pixel width
 * @param height - Canvas/video pixel height
 * @param jointColors - Optional per-joint color override map (Phase 8)
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  jointColors?: JointColorMap,
  clearFirst = true
): void {
  if (clearFirst) ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length === 0) return;

  // -------------------------------------------------------------------------
  // Helper: convert normalized landmark to pixel coords.
  // Mirror horizontally (scaleX(-1) on the video is matched by flipping x here).
  // -------------------------------------------------------------------------
  const px = (lm: Landmark) => ({
    x: (1 - lm.x) * width,   // mirror
    y: lm.y * height,
  });

  const VISIBILITY_THRESHOLD = 0.5;

  // -------------------------------------------------------------------------
  // Draw bone connections
  // -------------------------------------------------------------------------
  ctx.lineCap = "round";
  ctx.lineWidth = 2.5;

  for (const [idxA, idxB] of POSE_CONNECTIONS) {
    const a = landmarks[idxA];
    const b = landmarks[idxB];

    if (!a || !b) continue;
    if (
      (a.visibility ?? 1) < VISIBILITY_THRESHOLD ||
      (b.visibility ?? 1) < VISIBILITY_THRESHOLD
    ) continue;

    const pA = px(a);
    const pB = px(b);

    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.strokeStyle = COLORS.bone;
    ctx.stroke();
  }

  // -------------------------------------------------------------------------
  // Draw joint circles
  // -------------------------------------------------------------------------

  // Map from landmark index → joint name (vertex landmark for each named joint)
  const LANDMARK_TO_JOINT: Record<number, string> = {
    11: "leftShoulder",
    12: "rightShoulder",
    13: "leftElbow",
    14: "rightElbow",
    23: "leftHip",
    24: "rightHip",
    25: "leftKnee",
    26: "rightKnee",
    27: "leftAnkle",
    28: "rightAnkle",
  };

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if ((lm.visibility ?? 1) < VISIBILITY_THRESHOLD) continue;

    const { x, y } = px(lm);

    // Determine color from jointColors override (Phase 8)
    let fillColor: string = COLORS.joint;
    if (jointColors) {
      const jointName = LANDMARK_TO_JOINT[i];
      if (jointName) {
        const status = jointColors[jointName];
        if (status === "correct") fillColor = COLORS.jointCorrect;
        else if (status === "error") fillColor = COLORS.jointError;
      }
    }

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Small inner dot for definition
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(12,15,10,0.8)";
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Reference skeleton overlay (ghost)
// ---------------------------------------------------------------------------

/**
 * Draw a reference/ghost skeleton overlay on the canvas.
 * This is drawn BEFORE the live skeleton so it appears underneath.
 * Does not clear the canvas.
 *
 * @param ctx - 2D canvas rendering context
 * @param landmarks - Array of 33 normalized landmarks
 * @param width - Canvas/video pixel width
 * @param height - Canvas/video pixel height
 * @param opacity - Ghost opacity (default 0.35)
 */
export function drawReferenceSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  opacity = 0.35
): void {
  if (!landmarks || landmarks.length === 0) return;

  const px = (lm: Landmark) => ({
    x: (1 - lm.x) * width,
    y: lm.y * height,
  });

  const VISIBILITY_THRESHOLD = 0.1;

  // Draw bones
  ctx.lineCap = "round";
  ctx.lineWidth = 2.5;

  for (const [idxA, idxB] of POSE_CONNECTIONS) {
    const a = landmarks[idxA];
    const b = landmarks[idxB];

    if (!a || !b) continue;
    if ((a.visibility ?? 1) < VISIBILITY_THRESHOLD || (b.visibility ?? 1) < VISIBILITY_THRESHOLD)
      continue;

    const pA = px(a);
    const pB = px(b);

    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.strokeStyle = `rgba(120, 180, 255, ${opacity})`;
    ctx.stroke();
  }

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if ((lm.visibility ?? 1) < VISIBILITY_THRESHOLD) continue;

    const { x, y } = px(lm);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(120, 180, 255, ${opacity})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(12, 15, 10, ${opacity * 0.8})`;
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Angle debug overlay (Phase 6)
// ---------------------------------------------------------------------------

/**
 * Draw joint angle values as text labels on the canvas for debug verification.
 *
 * @param ctx - 2D canvas rendering context
 * @param landmarks - Array of 33 normalized landmarks
 * @param angles - Map of joint name → angle in degrees
 * @param width - Canvas pixel width
 * @param height - Canvas pixel height
 */
export function drawAngleOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  angles: Record<string, number>,
  width: number,
  height: number
): void {
  // Landmark index at which to place each angle label (the vertex landmark)
  const JOINT_VERTEX: Record<string, number> = {
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28,
  };

  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";

  for (const [joint, angleDeg] of Object.entries(angles)) {
    const vertexIdx = JOINT_VERTEX[joint];
    if (vertexIdx === undefined) continue;

    const lm = landmarks[vertexIdx];
    if (!lm || (lm.visibility ?? 1) < 0.5) continue;

    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    // Background pill
    const label = `${Math.round(angleDeg)}°`;
    const metrics = ctx.measureText(label);
    const pad = 4;
    const bw = metrics.width + pad * 2;
    const bh = 16;

    ctx.fillStyle = "rgba(12,15,10,0.75)";
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh - 6, bw, bh, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(195,255,90,0.9)";
    ctx.fillText(label, x, y - 10);
  }
}
