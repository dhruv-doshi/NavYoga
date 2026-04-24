# Architecture

## Overview

Asana is a **pure client-side Next.js application**. All pose detection, angle computation, and feedback generation run in the browser via WebAssembly (MediaPipe). No video or biometric data is ever sent to a server.

```
Browser
  └── Next.js (App Router, React 19)
        ├── /               Landing page (Server Component)
        ├── /poses          Pose library (Server Component)
        └── /practice       Practice studio (Client Component tree)
              ├── Camera          getUserMedia → <video>
              ├── PoseCanvas      MediaPipe → skeleton canvas overlay
              ├── PoseSelector    Pose dropdown (from poses.json)
              ├── ScoreDisplay    Radial gauge score
              └── FeedbackPanel   Corrective text cards
```

## Data Flow

```
Webcam (getUserMedia)
    │ raw video frames
    ▼
MediaPipe PoseLandmarker (WASM, runs in-browser)
    │ 33 body landmarks {x, y, z, visibility}
    ▼
lib/angles.ts — computeAngles()
    │ AngleMap { leftKnee: 92°, rightHip: 165°, … }
    ▼
lib/poseComparison.ts — comparePose()
    │ PoseComparisonResult { joints[], score, corrections[] }
    ├──────────────────────────────┐
    ▼                              ▼
lib/drawing.ts                lib/feedback.ts
PoseCanvas (skeleton,          FeedbackPanel (correction
green/red joints)              text, headline)
                                   │
                               ScoreDisplay (% gauge)
```

## Key Files

| Path | Responsibility |
|---|---|
| `src/lib/mediapipe.ts` | Initialize and run MediaPipe PoseLandmarker |
| `src/lib/angles.ts` | Compute joint angles from landmark triplets |
| `src/lib/poseComparison.ts` | Compare live angles vs pose reference ranges |
| `src/lib/feedback.ts` | Generate prioritized corrective text |
| `src/lib/drawing.ts` | Draw skeleton + colored joints on canvas |
| `src/lib/types.ts` | All shared TypeScript interfaces |
| `src/data/poses.json` | Static pose definitions with angle constraints |
| `src/components/Camera.tsx` | getUserMedia lifecycle, error handling |
| `src/components/PoseCanvas.tsx` | RAF detection loop, bridges Camera → lib |
| `src/components/PoseSelector.tsx` | Pose dropdown |
| `src/components/FeedbackPanel.tsx` | Correction display |
| `src/components/ScoreDisplay.tsx` | Radial alignment gauge |
| `src/components/ErrorBoundary.tsx` | Catches MediaPipe / canvas render errors |

## MediaPipe Integration

- Package: `@mediapipe/tasks-vision`
- Model: `pose_landmarker_lite` (fast, browser-optimized)
- Detection runs on every `requestAnimationFrame` via `detectForVideo()`
- Model WASM files are served from the `@mediapipe/tasks-vision` CDN to avoid bundling 30 MB of WASM assets

## Performance Notes

- The detection loop uses `requestAnimationFrame` — automatically throttles to 60 fps and pauses when the tab is hidden
- Feedback updates are debounced (500 ms) to prevent excessive re-renders
- All Server Components (landing page, pose library) are statically generated at build time

## Rendering Strategy

| Route | Strategy | Reason |
|---|---|---|
| `/` | Static (SSG) | No dynamic data, instant load |
| `/poses` | Static (SSG) | Pose data from local JSON |
| `/practice` | Client (CSR) | Camera + canvas cannot run server-side |
