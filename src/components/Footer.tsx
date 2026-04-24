/**
 * @file components/Footer.tsx
 * @description Site footer — branding, quick nav, and privacy note.
 *
 * Server Component (no client-side interactivity needed).
 */

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}
      aria-label="Site footer"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs select-none"
                style={{
                  background: "var(--accent-muted)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent)",
                }}
                aria-hidden="true"
              >
                ॐ
              </span>
              <span
                className="text-base tracking-wide"
                style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
              >
                NavYoga
              </span>
            </div>
            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)", maxWidth: "22rem" }}
            >
              Real-time yoga pose analysis running entirely in your browser.
              No data is ever uploaded or stored.
            </p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col sm:flex-row gap-x-6 gap-y-2" aria-label="Footer navigation">
            {[
              { href: "/", label: "Home" },
              { href: "/poses", label: "Pose Library" },
              { href: "/practice", label: "Practice" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm transition-colors"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Built with{" "}
            <span style={{ color: "var(--accent)" }}>MediaPipe</span> &amp; Next.js
            · All processing is local &amp; private
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
          >
            © {new Date().getFullYear()} NavYoga
          </p>
        </div>
      </div>
    </footer>
  );
}
