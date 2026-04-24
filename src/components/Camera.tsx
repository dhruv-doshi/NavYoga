/**
 * @file components/Camera.tsx
 * @description Webcam access and video display component.
 *
 * Responsibilities (Phase 3):
 * - Request camera access via `navigator.mediaDevices.getUserMedia`
 * - Render the live video stream into a <video> element
 * - Handle and display camera permission denied errors gracefully
 * - Expose the video element ref so parent components (PoseCanvas) can
 *   read frames from it in later phases
 * - Report video dimensions once the stream is ready (used to size the canvas)
 *
 * This is a Client Component because it accesses browser APIs (getUserMedia).
 *
 * Usage:
 *   <Camera onVideoReady={(videoEl, dims) => { ... }} />
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { VideoDimensions } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CameraProps {
  /**
   * Called once the webcam stream is active and the video element is ready.
   * Passes the video element ref and the video's intrinsic dimensions.
   * Parent components use this to position the canvas overlay and start
   * MediaPipe detection (Phase 4+).
   */
  onVideoReady?: (
    videoElement: HTMLVideoElement,
    dimensions: VideoDimensions
  ) => void;

  /**
   * CSS class applied to the outer container div.
   * Allows the parent to control sizing/layout.
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Camera state type
// ---------------------------------------------------------------------------

type CameraState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "active" }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Human-readable messages for each getUserMedia error type
// ---------------------------------------------------------------------------

function describeError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera permission was denied. Please allow camera access in your browser settings and reload the page.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found on this device. Please connect a camera and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "Your camera is already in use by another application. Please close it and try again.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "The requested camera resolution is not supported. Please try a different device.";
      case "SecurityError":
        return "Camera access is blocked by a security policy. This app must be served over HTTPS.";
      default:
        return `Camera error: ${err.message}`;
    }
  }
  return "An unknown camera error occurred.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Camera({ onVideoReady, className = "" }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({ status: "idle" });

  // -------------------------------------------------------------------------
  // Start the webcam stream
  // -------------------------------------------------------------------------

  const startCamera = useCallback(async () => {
    setCameraState({ status: "requesting" });

    try {
      // Request video-only stream; ideal resolution 1280×720 for accurate
      // landmark detection, but we allow the browser to fallback gracefully.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",        // prefer front-facing camera on mobile
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;

      // Wait for the video metadata to load so we have real dimensions
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      await video.play();

      setCameraState({ status: "active" });

      // Notify parent with the video element and its dimensions
      onVideoReady?.(video, {
        width:  video.videoWidth,
        height: video.videoHeight,
      });
    } catch (err) {
      setCameraState({ status: "error", message: describeError(err) });
    }
  }, [onVideoReady]);

  // -------------------------------------------------------------------------
  // Stop the webcam stream and release the camera
  // -------------------------------------------------------------------------

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState({ status: "idle" });
  }, []);

  // -------------------------------------------------------------------------
  // Lifecycle: start camera on mount, stop on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    startCamera();
    return () => {
      // Always release the camera when this component unmounts to avoid
      // the browser showing the camera-in-use indicator indefinitely.
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={`relative w-full h-full ${className}`}>

      {/* ------------------------------------------------------------------
          Live video element
          Mirror the video horizontally so the user sees themselves correctly
          (as in a mirror), matching the mirrored skeleton overlay.
          ------------------------------------------------------------------ */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{
          // Mirror the video so left/right matches the user's perspective
          transform: "scaleX(-1)",
          // Hide the default video controls
          display: cameraState.status === "active" ? "block" : "none",
          background: "var(--bg-base)",
        }}
        playsInline
        muted
        aria-label="Live webcam feed for pose detection"
      />

      {/* ------------------------------------------------------------------
          Overlay states: requesting / idle / error
          ------------------------------------------------------------------ */}
      {cameraState.status !== "active" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6"
          style={{ background: "var(--bg-surface)" }}
        >
          {/* Requesting camera */}
          {cameraState.status === "requesting" && (
            <>
              {/* Animated permission icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  border: "1px solid var(--accent-border)",
                  background: "var(--accent-muted)",
                  animation: "pulseGlow 2s ease-in-out infinite",
                }}
                aria-hidden="true"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Camera icon */}
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)" }}
              >
                Waiting for camera permission…
              </p>
            </>
          )}

          {/* Idle state — user must click to start */}
          {cameraState.status === "idle" && (
            <>
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)" }}
              >
                Camera not started.
              </p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-full text-sm font-semibold"
                style={{
                  background: "var(--accent)",
                  color: "#0C0F0A",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Enable Camera
              </button>
            </>
          )}

          {/* Error state */}
          {cameraState.status === "error" && (
            <>
              {/* Error icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  border: "1px solid rgba(192,97,74,0.3)",
                  background: "rgba(192,97,74,0.1)",
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <p
                className="text-base font-medium"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
              >
                Camera access failed
              </p>
              <p
                className="text-sm max-w-xs"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)", fontWeight: 300 }}
              >
                {cameraState.message}
              </p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-full text-sm font-semibold mt-2"
                style={{
                  background: "var(--bg-raised)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
