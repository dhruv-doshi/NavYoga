/**
 * @file app/poses/page.tsx
 * @description Pose library page — browse all supported yoga poses.
 *
 * Phase 7: Loaded from poses.json. Shows all 6 poses with descriptions,
 * difficulty, focus areas, and angle constraint counts.
 *
 * This is a Server Component.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { PoseDefinition } from "@/lib/types";
import posesData from "@/data/poses.json";

export const metadata: Metadata = {
  title: "Pose Library",
  description: "Browse the 6 foundational yoga poses supported by Asana.",
};

const POSES = posesData as unknown as PoseDefinition[];

// Difficulty badge color mapping
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: "rgba(95,173,91,0.1)",  text: "var(--joint-correct)" },
  intermediate: { bg: "rgba(200,150,60,0.1)", text: "#c89630" },
  advanced:     { bg: "rgba(192,97,74,0.1)",  text: "var(--joint-error)" },
};

export default function PosesPage() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">

      {/* Page header */}
      <div className="mb-12">
        <span className="badge mb-4 inline-block">Pose Library</span>
        <h1
          className="text-4xl sm:text-5xl mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Supported Poses
        </h1>
        <p
          className="text-base max-w-xl"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
          }}
        >
          Each pose is defined by a set of joint angle constraints. When you
          practice, your live angles are compared against these ranges to
          generate real-time corrections.
        </p>
      </div>

      {/* Pose grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
        {POSES.map((pose) => {
          const diffColor = DIFFICULTY_COLORS[pose.difficulty] ?? DIFFICULTY_COLORS.beginner;
          return (
            <article
              key={pose.id}
              className="glass-card p-6 flex flex-col gap-3"
              aria-label={`${pose.name} — ${pose.difficulty}`}
            >
              {/* Difficulty badge */}
              <span
                className="text-xs font-semibold self-start px-2.5 py-1 rounded-full"
                style={{
                  background: diffColor.bg,
                  color: diffColor.text,
                  fontFamily: "var(--font-dm-sans)",
                  letterSpacing: "0.06em",
                  textTransform: "capitalize",
                }}
              >
                {pose.difficulty}
              </span>

              {/* Pose name */}
              <h2
                className="text-xl font-medium leading-snug"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
              >
                {pose.name}
              </h2>

              {/* Sanskrit name */}
              <p
                className="text-sm italic -mt-1"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--text-tertiary)" }}
              >
                {pose.sanskrit}
              </p>

              {/* Description */}
              <p
                className="text-sm leading-relaxed flex-1"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 300,
                }}
              >
                {pose.description}
              </p>

              {/* Angle constraints count */}
              <div
                className="flex items-center gap-1.5 pt-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
                >
                  {pose.angles.length} joint constraint{pose.angles.length !== 1 ? "s" : ""}
                </span>

                <span
                  className="ml-auto text-xs"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
                >
                  {pose.angles.map((a) => a.joint.replace(/([A-Z])/g, " $1").trim()).slice(0, 2).join(", ")}
                  {pose.angles.length > 2 ? ` +${pose.angles.length - 2}` : ""}
                </span>
              </div>

              {/* Focus areas */}
              {pose.focus && (
                <div className="flex flex-wrap gap-1.5">
                  {pose.focus.map((area: string) => (
                    <span
                      key={area}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "var(--bg-raised)",
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-dm-sans)",
                      }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Link to practice */}
      <div className="mt-12 text-center">
        <Link
          href="/practice"
          className="px-8 py-3.5 rounded-full text-sm font-semibold inline-block"
          style={{
            background: "var(--accent)",
            color: "#0C0F0A",
            fontFamily: "var(--font-dm-sans)",
            letterSpacing: "0.04em",
            boxShadow: "0 4px 20px rgba(127,168,124,0.3)",
          }}
        >
          Practice Now →
        </Link>
      </div>
    </div>
  );
}
