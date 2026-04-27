/**
 * @file components/PoseSelector.tsx
 * @description Dropdown selector for choosing the target yoga pose.
 *
 * Phase 7/8: Loads pose list from poses.json and exposes the selected
 * PoseDefinition to the parent via onSelect callback.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { PoseDefinition } from "@/lib/types";

interface PoseSelectorProps {
  poses: PoseDefinition[];
  selectedId: string | null;
  onSelect: (pose: PoseDefinition | null) => void;
  onDelete?: (id: string) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "var(--joint-correct)",
  intermediate: "#c89630",
  advanced:     "var(--joint-error)",
};

export default function PoseSelector({ poses, selectedId, onSelect, onDelete }: PoseSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = poses.find((p) => p.id === selectedId) ?? null;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors"
        style={{
          background: "var(--bg-raised)",
          border: `1px solid ${open ? "var(--accent-border)" : "var(--border)"}`,
          color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
          fontFamily: "var(--font-dm-sans)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              <span style={{ color: "var(--accent)" }}>◆</span>
              <span>{selected.name}</span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                {selected.sanskrit}
              </span>
            </>
          ) : (
            "Select a pose to begin…"
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
          role="listbox"
          aria-label="Select pose"
        >
          {/* Clear option */}
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm transition-colors"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
              borderBottom: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            role="option"
            aria-selected={selectedId === null}
          >
            — No pose selected
          </button>

          {poses.map((pose) => {
            const isActive = pose.id === selectedId;
            const isCustom = pose.isCustom;
            return (
              <div
                key={pose.id}
                className="group flex items-center transition-colors cursor-pointer"
                style={{
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  fontFamily: "var(--font-dm-sans)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--bg-raised)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
                role="option"
                aria-selected={isActive}
                onClick={() => { onSelect(pose); setOpen(false); }}
              >
                <div className="flex-1 px-4 py-3 flex items-center justify-between gap-2 min-w-0">
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {pose.name}
                    </span>
                    <span className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>
                      {pose.sanskrit}
                    </span>
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: "var(--bg-subtle)",
                      color: isCustom ? "#90caf9" : (DIFFICULTY_COLORS[pose.difficulty] ?? "var(--text-tertiary)"),
                      letterSpacing: "0.05em",
                      textTransform: "capitalize",
                    }}
                  >
                    {isCustom ? "recorded" : pose.difficulty}
                  </span>
                </div>
                {isCustom && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${pose.name}"?`)) {
                        onDelete(pose.id);
                      }
                    }}
                    className="flex-shrink-0 pr-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    aria-label={`Delete ${pose.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
