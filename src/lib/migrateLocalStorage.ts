import type { PoseDefinition } from "./types";
import { getOwnerId } from "./ownerId";

const KEY_OLD = "yoga_custom_poses_v1";
const KEY_DONE = "yoga_custom_poses_v2_migrated";

export async function migrateLocalStorageOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY_DONE)) return;

  const raw = localStorage.getItem(KEY_OLD);
  if (!raw) {
    localStorage.setItem(KEY_DONE, "1");
    return;
  }

  let arr: PoseDefinition[];
  try {
    arr = JSON.parse(raw);
  } catch {
    localStorage.setItem(KEY_DONE, "1");
    return;
  }

  const ownerId = getOwnerId();
  for (const pose of arr) {
    try {
      await fetch("/api/poses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pose, ownerId, legacyMigrated: true }),
      });
    } catch {
      // best-effort; don't block on failures
    }
  }

  localStorage.setItem(KEY_DONE, "1");
}
