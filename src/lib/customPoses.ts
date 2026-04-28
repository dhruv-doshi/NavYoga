import { calcAngle, CORRECTED_JOINTS } from "./angles";
import type { Landmark, PoseDefinition, PoseAngleConstraint, PoseStep, VideoStep } from "./types";

export const CUSTOM_POSES_KEY = "yoga_custom_poses_v1";

export function loadCustomPoses(): PoseDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POSES_KEY);
    return raw ? (JSON.parse(raw) as PoseDefinition[]) : [];
  } catch (e) {
    console.error("[customPoses] Failed to load custom poses:", e);
    return [];
  }
}

export function saveCustomPose(pose: PoseDefinition): void {
  try {
    const existing = loadCustomPoses();
    const updated = [...existing.filter((p) => p.id !== pose.id), pose];
    localStorage.setItem(CUSTOM_POSES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("[customPoses] Failed to save custom pose:", e);
  }
}

export function deleteCustomPose(id: string): void {
  try {
    const existing = loadCustomPoses();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_POSES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("[customPoses] Failed to delete custom pose:", e);
  }
}

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

    constraints.push({
      joint: name,
      landmarks: [idxA, idxB, idxC],
      min: Math.max(0, Math.round(angleDeg - TOLERANCE)),
      max: Math.min(180, Math.round(angleDeg + TOLERANCE)),
      correctionLow: `Increase your ${name.replace(/([A-Z])/g, " $1").trim().toLowerCase()} angle`,
      correctionHigh: `Decrease your ${name.replace(/([A-Z])/g, " $1").trim().toLowerCase()} angle`,
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

export function updateCustomPoseSteps(id: string, steps: PoseStep[]): void {
  try {
    const existing = loadCustomPoses();
    const pose = existing.find((p) => p.id === id);
    if (pose) {
      pose.cachedSteps = steps;
      localStorage.setItem(CUSTOM_POSES_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    console.error("[customPoses] Failed to update pose steps:", e);
  }
}

export function updateCustomPoseVideoSteps(id: string, videoSteps: VideoStep[]): void {
  try {
    const existing = loadCustomPoses();
    const pose = existing.find((p) => p.id === id);
    if (pose) {
      pose.videoSteps = videoSteps;
      localStorage.setItem(CUSTOM_POSES_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    console.error("[customPoses] Failed to update pose video steps:", e);
  }
}
