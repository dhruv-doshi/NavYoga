/**
 * @file components/ErrorBoundary.tsx
 * @description React error boundary — catches render errors in subtrees
 * and shows a user-friendly fallback instead of a blank screen.
 *
 * Phase 11: Wraps the practice page to prevent MediaPipe or canvas errors
 * from crashing the entire app.
 */

"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  override componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center"
          style={{ minHeight: "50vh" }}
          role="alert"
          aria-live="assertive"
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              border: "1px solid rgba(192,97,74,0.3)",
              background: "rgba(192,97,74,0.08)",
            }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--joint-error)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div className="flex flex-col gap-2 max-w-sm">
            <p
              className="text-base font-medium"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
            >
              Something went wrong
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)", fontWeight: 300 }}
            >
              {this.state.message}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: "var(--bg-raised)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
