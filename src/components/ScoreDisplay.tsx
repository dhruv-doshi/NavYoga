/**
 * @file components/ScoreDisplay.tsx
 * @description Visual alignment score — radial gauge + percentage.
 *
 * Phase 10:
 * - Circular SVG arc fills based on score [0–100]
 * - Color transitions from error → warning → correct
 * - Smooth CSS transitions on score changes
 */

"use client";

interface ScoreDisplayProps {
  score: number;
  poseSelected: boolean;
  /** True once comparePose has produced a result */
  analyzed: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--joint-correct)";
  if (score >= 50) return "#c89630";
  return "var(--joint-error)";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Off Pose";
}

export default function ScoreDisplay({ score, poseSelected, analyzed }: ScoreDisplayProps) {
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <div className="flex items-center gap-4">
      {/* Radial gauge */}
      <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke="var(--bg-raised)"
            strokeWidth="7"
          />
          {/* Progress arc */}
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke={poseSelected && analyzed ? color : "var(--bg-subtle)"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={poseSelected && analyzed ? offset : CIRCUMFERENCE}
            style={{ transition: "stroke-dashoffset 500ms ease, stroke 400ms ease" }}
          />
        </svg>

        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-label={`Alignment score: ${clamped}%`}
        >
          {poseSelected && analyzed ? (
            <>
              <span
                className="text-xl font-semibold tabular-nums leading-none"
                style={{ color, fontFamily: "var(--font-dm-sans)", transition: "color 400ms ease" }}
              >
                {clamped}
              </span>
              <span
                className="text-[10px] leading-none mt-0.5"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
              >
                %
              </span>
            </>
          ) : (
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
            >
              —
            </span>
          )}
        </div>
      </div>

      {/* Label & bar */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{
              color: poseSelected && analyzed ? color : "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
              transition: "color 400ms ease",
            }}
          >
            {poseSelected && analyzed ? scoreLabel(clamped) : poseSelected ? "Detecting…" : "No pose"}
          </span>
          {poseSelected && analyzed && (
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
            >
              Mastery
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--bg-raised)" }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Alignment score"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: poseSelected && analyzed ? `${clamped}%` : "0%",
              background: poseSelected && analyzed ? color : "var(--bg-subtle)",
              transition: "width 500ms ease, background 400ms ease",
            }}
          />
        </div>

        {/* Sub-label */}
        {poseSelected && analyzed && (
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            {clamped === 100
              ? "All joints in target range"
              : `${clamped}% of joints in target range`}
          </p>
        )}
      </div>
    </div>
  );
}
