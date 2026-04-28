import type { PoseDefinition, PoseStep, VideoStep } from "./types";
import { getOwnerId } from "./ownerId";

const BASE = "/api/poses";

export async function loadCustomPosesRemote(): Promise<PoseDefinition[]> {
  const ownerId = getOwnerId();
  try {
    const r = await fetch(`${BASE}?ownerId=${encodeURIComponent(ownerId)}`, { cache: "no-store" });
    if (!r.ok) return [];
    const { poses } = await r.json();
    return poses as PoseDefinition[];
  } catch {
    return [];
  }
}

export async function loadPublicPoses(): Promise<PoseDefinition[]> {
  try {
    const r = await fetch(`${BASE}?public=1`, { cache: "no-store" });
    if (!r.ok) return [];
    const { poses } = await r.json();
    return poses as PoseDefinition[];
  } catch {
    return [];
  }
}

export async function saveCustomPoseRemote(pose: PoseDefinition): Promise<void> {
  const ownerId = getOwnerId();
  await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...pose, ownerId }),
  });
}

export async function deleteCustomPoseRemote(id: string): Promise<void> {
  await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateCustomPoseStepsRemote(id: string, steps: PoseStep[]): Promise<void> {
  await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cachedSteps: steps }),
  });
}

export async function updateCustomPoseVideoStepsRemote(id: string, videoSteps: VideoStep[]): Promise<void> {
  await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoSteps }),
  });
}
