/**
 * @file Header.tsx
 * @description Persistent top navigation bar.
 *
 * Features:
 * - Logo / brand name on the left
 * - Nav links: Home · Poses · Practice
 * - Mobile: hamburger icon collapses into a slide-down menu
 * - Highlights the active route using Next.js `usePathname`
 * - Subtle backdrop blur effect for readability over content below
 *
 * This component is a Client Component because it uses:
 * - `usePathname` (router state)
 * - `useState` (mobile menu open/close toggle)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Navigation links definition
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/poses", label: "Poses" },
  { href: "/practice", label: "Practice" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(12, 15, 10, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* ----------------------------------------------------------------
            Brand / Logo
            ---------------------------------------------------------------- */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="NavYoga — home"
        >
          {/* Decorative leaf mark */}
          <span
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm select-none"
            style={{
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent)",
              transition: "background var(--transition)",
            }}
            aria-hidden="true"
          >
            ॐ
          </span>
          <span
            className="text-lg tracking-wide"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--text-primary)" }}
          >
            NavYoga
          </span>
        </Link>

        {/* ----------------------------------------------------------------
            Desktop nav
            ---------------------------------------------------------------- */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  border: isActive ? "1px solid var(--accent-border)" : "1px solid transparent",
                  fontFamily: "var(--font-dm-sans)",
                  transition: "all var(--transition)",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ----------------------------------------------------------------
            Mobile: hamburger button
            ---------------------------------------------------------------- */}
        <button
          className="sm:hidden flex flex-col gap-1 p-2 rounded-md"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {/* Three-line hamburger that morphs to X */}
          <span
            className="block w-5 h-0.5 transition-all origin-center"
            style={{
              background: "currentColor",
              transform: menuOpen ? "rotate(45deg) translate(3px, 3px)" : "none",
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all"
            style={{
              background: "currentColor",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all origin-center"
            style={{
              background: "currentColor",
              transform: menuOpen ? "rotate(-45deg) translate(3px, -3px)" : "none",
            }}
          />
        </button>
      </div>

      {/* ------------------------------------------------------------------
          Mobile dropdown menu
          ------------------------------------------------------------------ */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="sm:hidden border-t"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col py-2 px-4 gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--text-secondary)",
                      background: isActive ? "var(--accent-muted)" : "transparent",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
