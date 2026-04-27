import type { PoseDefinition } from "@/lib/types";

interface MasterPosePanelProps {
  pose: PoseDefinition | null;
}

export function MasterPosePanel({ pose }: MasterPosePanelProps) {
  if (!pose) return null;

  return (
    <div
      className="p-5 flex flex-col gap-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <h2
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
      >
        Master Pose
      </h2>

      <div className="flex flex-col gap-3">
        <div
          className="rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            width: "100%",
            height: 140,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src={pose.imageUrl}
            alt={pose.name}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
          >
            {pose.name}
          </h3>
          {pose.sanskrit && (
            <p
              className="text-xs italic"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
            >
              {pose.sanskrit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
