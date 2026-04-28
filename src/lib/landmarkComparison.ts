import type { Landmark, PoseDefinition, PoseComparisonResult, JointComparisonResult, JointStatus } from "./types";

// Body landmarks used for pose comparison (ignores face/hands noise)
const BODY_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

const LANDMARK_JOINT_NAMES: Record<number, string> = {
  11: "leftShoulder",
  12: "rightShoulder",
  13: "leftElbow",
  14: "rightElbow",
  15: "leftWrist",
  16: "rightWrist",
  23: "leftHip",
  24: "rightHip",
  25: "leftKnee",
  26: "rightKnee",
  27: "leftAnkle",
  28: "rightAnkle",
};

const VISIBILITY_THRESHOLD = 0.3;

// Tolerance: normalized distance below this = "correct" (~15% of torso height)
const CORRECT_THRESHOLD = 0.15;
// Beyond this = clearly wrong (~35% of torso height)
const ERROR_THRESHOLD = 0.35;

interface NormalizedLandmarks {
  points: Array<{ x: number; y: number; z: number } | null>;
  valid: boolean;
}

/**
 * Normalize landmarks: translate hip-midpoint to origin, scale by torso height.
 * Returns null for landmarks below visibility threshold.
 */
function normalizeLandmarks(landmarks: Landmark[]): NormalizedLandmarks {
  const hipMid = {
    x: ((landmarks[23]?.x ?? 0) + (landmarks[24]?.x ?? 0)) / 2,
    y: ((landmarks[23]?.y ?? 0) + (landmarks[24]?.y ?? 0)) / 2,
    z: ((landmarks[23]?.z ?? 0) + (landmarks[24]?.z ?? 0)) / 2,
  };
  const shoulderMid = {
    x: ((landmarks[11]?.x ?? 0) + (landmarks[12]?.x ?? 0)) / 2,
    y: ((landmarks[11]?.y ?? 0) + (landmarks[12]?.y ?? 0)) / 2,
    z: ((landmarks[11]?.z ?? 0) + (landmarks[12]?.z ?? 0)) / 2,
  };

  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  const dz = shoulderMid.z - hipMid.z;
  const torsoHeight = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (torsoHeight < 0.01) {
    return { points: [], valid: false };
  }

  const points = landmarks.map((lm) => {
    if (!lm || (lm.visibility ?? 1) < VISIBILITY_THRESHOLD) return null;
    return {
      x: (lm.x - hipMid.x) / torsoHeight,
      y: (lm.y - hipMid.y) / torsoHeight,
      z: (lm.z - hipMid.z) / torsoHeight,
    };
  });

  return { points, valid: true };
}

function compareLandmarks(
  liveLandmarks: Landmark[],
  ref: Landmark[],
  poseId: string,
): PoseComparisonResult {
  const liveNorm = normalizeLandmarks(liveLandmarks);
  const refNorm = normalizeLandmarks(ref);

  if (!liveNorm.valid || !refNorm.valid) {
    return { poseId, joints: [], score: 0, corrections: [] };
  }

  const joints: JointComparisonResult[] = [];
  const corrections: string[] = [];
  let totalScore = 0;
  let evaluated = 0;

  for (const idx of BODY_LANDMARK_INDICES) {
    const jointName = LANDMARK_JOINT_NAMES[idx];
    const lp = liveNorm.points[idx];
    const rp = refNorm.points[idx];

    if (!lp || !rp) {
      joints.push({ joint: jointName, status: "unknown", angleDeg: 0, deviation: 0, correctionText: null, jointScore: 0 });
      continue;
    }

    const dist = Math.sqrt((lp.x - rp.x) ** 2 + (lp.y - rp.y) ** 2 + (lp.z - rp.z) ** 2);

    let status: JointStatus;
    let correctionText: string | null = null;

    if (dist <= CORRECT_THRESHOLD) {
      status = "correct";
    } else {
      const dy = lp.y - rp.y;
      const label = jointName.replace(/([A-Z])/g, " $1").trim().toLowerCase();
      if (dist > ERROR_THRESHOLD) {
        status = "too_high";
        correctionText = dy > 0 ? `Raise your ${label}` : dy < 0 ? `Lower your ${label}` : `Adjust your ${label} position`;
        corrections.push(correctionText);
      } else {
        status = "too_low";
        correctionText = `Fine-tune your ${label}`;
      }
    }

    const range = ERROR_THRESHOLD - CORRECT_THRESHOLD;
    const excess = Math.max(0, dist - CORRECT_THRESHOLD);
    const jointScore = Math.max(0, 1 - excess / range);
    totalScore += jointScore;
    evaluated++;

    joints.push({ joint: jointName, status, angleDeg: Math.round(dist * 100), deviation: Math.round(dist * 100), correctionText, jointScore });
  }

  const score = evaluated > 0 ? Math.round((totalScore / evaluated) * 100) : 0;
  return { poseId, joints, score, corrections };
}

/**
 * Compare live landmarks against a specific reference landmark array.
 * Use this when per-step reference landmarks are available.
 */
export function comparePoseLandmarksAgainst(
  liveLandmarks: Landmark[],
  reference: Landmark[],
  poseId: string,
): PoseComparisonResult {
  if (!reference || reference.length === 0) {
    return { poseId, joints: [], score: 0, corrections: [] };
  }
  const result = compareLandmarks(liveLandmarks, reference, poseId);
  console.log("[LandmarkComparison] pose=%s score=%d%% (%d corrections)", poseId, result.score, result.corrections.length);
  return result;
}

/**
 * Compare live landmarks against a reference pose using normalized landmark positions.
 * Falls back to a zero-score result if the pose has no referenceLandmarks.
 */
export function comparePoseLandmarks(
  liveLandmarks: Landmark[],
  pose: PoseDefinition
): PoseComparisonResult {
  const ref = pose.referenceLandmarks;
  if (!ref || ref.length === 0) {
    return { poseId: pose.id, joints: [], score: 0, corrections: [] };
  }
  return comparePoseLandmarksAgainst(liveLandmarks, ref, pose.id);
}
