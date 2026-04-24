/**
 * @file app/poses/page.tsx
 * @description Pose library page — browse all supported yoga poses.
 *
 * Phase 2: Placeholder layout with static pose cards.
 * Phase 7 will replace static data with poses.json and add full details,
 *          reference images, and angle specification tables.
 *
 * This is a Server Component (no interactivity needed at this stage).
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pose Library",
  description: "Browse the 6 foundational yoga poses supported by Asana.",
};

// ---------------------------------------------------------------------------
// Static pose data (will be replaced by poses.json in Phase 7)
// ---------------------------------------------------------------------------

const POSES = [
  {
    id: "mountain",
    name: "Mountain Pose",
    sanskrit: "Tadasana",
    difficulty: "Beginner" as const,
    description:
      "The foundation of all standing poses. Feet together, spine elongated, arms at sides. Establishes grounding and body awareness.",
    focus: ["Posture", "Balance", "Alignment"],
  },
  {
    id: "warrior-1",
    name: "Warrior I",
    sanskrit: "Virabhadrasana I",
    difficulty: "Beginner" as const,
    description:
      "A powerful standing pose that builds strength in the legs and opens the chest. Front knee bent at 90°, arms overhead.",
    focus: ["Strength", "Hip Flexors", "Shoulders"],
  },
  {
    id: "warrior-2",
    name: "Warrior II",
    sanskrit: "Virabhadrasana II",
    difficulty: "Beginner" as const,
    description:
      "Arms extended parallel to the floor, gaze over the front hand. Cultivates stamina and opens the hips and chest.",
    focus: ["Endurance", "Hip Opening", "Focus"],
  },
  {
    id: "tree",
    name: "Tree Pose",
    sanskrit: "Vrksasana",
    difficulty: "Intermediate" as const,
    description:
      "Single-leg balance with the raised foot pressed into the inner thigh. Improves concentration and strengthens the standing leg.",
    focus: ["Balance", "Concentration", "Core"],
  },
  {
    id: "chair",
    name: "Chair Pose",
    sanskrit: "Utkatasana",
    difficulty: "Beginner" as const,
    description:
      "A seated squat position with arms raised. Builds heat, strengthens the thighs and glutes, and challenges endurance.",
    focus: ["Strength", "Glutes", "Endurance"],
  },
  {
    id: "triangle",
    name: "Triangle Pose",
    sanskrit: "Trikonasana",
    difficulty: "Intermediate" as const,
    description:
      "Legs wide, one hand reaching to the floor and the other to the sky. Stretches the hamstrings and opens the chest.",
    focus: ["Flexibility", "Hamstrings", "Side Body"],
  },
] as const;

// Difficulty badge color mapping
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Beginner:     { bg: "rgba(95,173,91,0.1)",  text: "var(--joint-correct)" },
  Intermediate: { bg: "rgba(192,97,74,0.1)",  text: "var(--joint-error)" },
  Advanced:     { bg: "rgba(200,150,60,0.1)", text: "#c89630" },
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

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
          const diffColor = DIFFICULTY_COLORS[pose.difficulty];
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
                  textTransform: "uppercase",
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

              {/* Focus areas */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                {pose.focus.map((area) => (
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
