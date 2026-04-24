/**
 * @file app/page.tsx
 * @description Landing page — the entry point of the app.
 *
 * Layout sections:
 * 1. Hero — full-screen editorial headline with a strong CTA
 * 2. How It Works — three-step explanation of the pipeline
 * 3. Poses Preview — a teaser showing the 6 supported poses
 * 4. Start CTA — a second call-to-action before the footer
 *
 * This is a Server Component (no "use client" directive) so it renders
 * instantly on Vercel Edge, then hydrates on the client.
 */

import Link from "next/link";

// ---------------------------------------------------------------------------
// Static data — how-it-works steps
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Allow Camera Access",
    description:
      "Grant the browser permission to use your device camera. Video never leaves your device — all processing happens locally.",
  },
  {
    step: "02",
    title: "Choose a Pose",
    description:
      "Select from 6 foundational yoga poses. Each pose has angle constraints defined for every key joint.",
  },
  {
    step: "03",
    title: "Receive Instant Feedback",
    description:
      "A colored skeleton overlay shows which joints are aligned. Text corrections appear in real time for any deviations.",
  },
] as const;

// ---------------------------------------------------------------------------
// Static data — pose teaser cards
// ---------------------------------------------------------------------------

const POSE_TEASERS = [
  { name: "Mountain Pose", sanskrit: "Tadasana", difficulty: "Beginner" },
  { name: "Warrior I", sanskrit: "Virabhadrasana I", difficulty: "Beginner" },
  { name: "Warrior II", sanskrit: "Virabhadrasana II", difficulty: "Beginner" },
  { name: "Tree Pose", sanskrit: "Vrksasana", difficulty: "Intermediate" },
  { name: "Chair Pose", sanskrit: "Utkatasana", difficulty: "Beginner" },
  { name: "Triangle Pose", sanskrit: "Trikonasana", difficulty: "Intermediate" },
] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* ===================================================================
          HERO SECTION
          Full-viewport height. Editorial headline + CTA.
          =================================================================== */}
      <section
        className="relative flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center overflow-hidden"
        aria-label="Hero"
      >
        {/* Decorative radial gradient background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(127,168,124,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Decorative top rule */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 opacity-40"
          style={{ background: "linear-gradient(to bottom, transparent, var(--accent))" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl animate-fade-in">
          {/* Eyebrow tag */}
          <span className="badge mb-6 inline-block">Real-time Pose Analysis</span>

          {/* Primary headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
          >
            Refine your practice,{" "}
            <em
              className="not-italic"
              style={{
                color: "var(--accent)",
                fontStyle: "italic",
                fontFamily: "var(--font-playfair)",
              }}
            >
              one breath
            </em>{" "}
            at a time.
          </h1>

          {/* Sub-headline */}
          <p
            className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 300,
            }}
          >
            Your camera becomes a yoga instructor. Asana uses MediaPipe Pose to
            detect your body landmarks, calculate joint angles, and guide you
            into correct alignment — entirely in your browser.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/practice" className="btn-primary">
              Start Practicing →
            </Link>
            <Link href="/poses" className="btn-ghost">
              Browse Poses
            </Link>
          </div>
        </div>

        {/* Decorative bottom rule */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-16 opacity-40"
          aria-hidden="true"
          style={{ background: "linear-gradient(to top, transparent, var(--accent))" }}
        />
      </section>

      {/* ===================================================================
          DIVIDER
          =================================================================== */}
      <hr className="divider" />

      {/* ===================================================================
          HOW IT WORKS
          =================================================================== */}
      <section
        className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full"
        aria-label="How it works"
      >
        <div className="text-center mb-14">
          <span className="badge mb-4 inline-block">The Process</span>
          <h2
            className="text-3xl sm:text-4xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            How it works
          </h2>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-px"
          style={{ background: "var(--border)" }}
        >
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div
              key={step}
              className="p-8 flex flex-col gap-4"
              style={{ background: "var(--bg-base)" }}
            >
              {/* Step number */}
              <span
                className="text-4xl font-light"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "var(--accent)",
                  opacity: 0.7,
                }}
              >
                {step}
              </span>
              <h3
                className="text-lg font-medium"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 300,
                }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================
          DIVIDER
          =================================================================== */}
      <hr className="divider" />

      {/* ===================================================================
          POSES TEASER
          =================================================================== */}
      <section
        className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full"
        aria-label="Supported poses"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="badge mb-4 inline-block">Pose Library</span>
            <h2
              className="text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Six foundational poses
            </h2>
          </div>
          <Link
            href="/poses"
            className="text-sm transition-colors flex-shrink-0"
            style={{ color: "var(--accent)", fontFamily: "var(--font-dm-sans)" }}
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-stagger">
          {POSE_TEASERS.map(({ name, sanskrit, difficulty }) => (
            <div key={name} className="glass-card p-5 flex flex-col gap-2">
              {/* Difficulty pill */}
              <span
                className="text-xs font-medium self-start px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--bg-raised)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-dm-sans)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {difficulty}
              </span>
              <p
                className="text-sm font-medium mt-1"
                style={{ fontFamily: "var(--font-dm-sans)", color: "var(--text-primary)" }}
              >
                {name}
              </p>
              <p
                className="text-xs italic"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--text-tertiary)" }}
              >
                {sanskrit}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================
          DIVIDER
          =================================================================== */}
      <hr className="divider" />

      {/* ===================================================================
          BOTTOM CTA
          =================================================================== */}
      <section
        className="py-24 px-4 text-center max-w-2xl mx-auto"
        aria-label="Call to action"
      >
        <h2
          className="text-3xl sm:text-4xl mb-5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Ready to begin?
        </h2>
        <p
          className="text-base mb-8"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
          }}
        >
          No installation. No account. Just your camera and a few minutes.
        </p>
        <Link href="/practice" className="btn-primary">
          Open the Studio →
        </Link>
      </section>
    </div>
  );
}
