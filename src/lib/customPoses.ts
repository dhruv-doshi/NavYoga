import { calcAngle, CORRECTED_JOINTS } from "./angles";
import type { Landmark, PoseDefinition, PoseAngleConstraint, PoseStep, VideoStep } from "./types";
import {
  loadCustomPosesRemote,
  saveCustomPoseRemote,
  deleteCustomPoseRemote,
  updateCustomPoseStepsRemote,
  updateCustomPoseVideoStepsRemote,
} from "./posesClient";

export const CUSTOM_POSES_KEY = "yoga_custom_poses_v1";

// Re-export remote-backed functions under the original names for source compatibility
export const loadCustomPoses = loadCustomPosesRemote;
export const saveCustomPose = saveCustomPoseRemote;
export const deleteCustomPose = deleteCustomPoseRemote;

export function averageLandmarks(buffer: Landmark[][]): Landmark[] {
  if (buffer.length === 0) return [];
  const n = buffer[0].length;
  const result: Landmark[] = [];

  for (let i = 0; i < n; i++) {
    let x = 0,
      y = 0,
      z = 0,
      vis = 0;
    for (const frame of buffer) {
      x += frame[i].x;
      y += frame[i].y;
      z += frame[i].z;
      vis += frame[i].visibility;
    }
    result.push({
      x: x / buffer.length,
      y: y / buffer.length,
      z: z / buffer.length,
      visibility: vis / buffer.length,
    });
  }
  return result;
}

export function derivePoseAngles(landmarks: Landmark[]): PoseAngleConstraint[] {
  const constraints: PoseAngleConstraint[] = [];
  const TOLERANCE = 15;

  for (const [name, idxA, idxB, idxC] of CORRECTED_JOINTS) {
    const a = landmarks[idxA];
    const b = landmarks[idxB];
    const c = landmarks[idxC];
    if (!a || !b || !c) continue;

    const angleDeg = calcAngle(a, b, c);

    const label = name.replace(/([A-Z])/g, " $1").trim().toLowerCase();
    constraints.push({
      joint: name,
      landmarks: [idxA, idxB, idxC],
      min: Math.max(0, Math.round(angleDeg - TOLERANCE)),
      max: Math.min(180, Math.round(angleDeg + TOLERANCE)),
      correctionLow: `Open your ${label} more — stretch it out a little further`,
      correctionHigh: `Soften your ${label} slightly — bring it in a bit`,
    });
  }

  return constraints;
}

export function generatePoseId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return `custom_${slug}_${Date.now()}`;
}

export const updateCustomPoseSteps = updateCustomPoseStepsRemote;
export const updateCustomPoseVideoSteps = updateCustomPoseVideoStepsRemote;
