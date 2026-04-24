# Asana — Real-time Yoga Pose Estimation

A browser-based yoga pose analysis tool. Point your camera at yourself, select a pose, and get instant joint-by-joint feedback. Runs entirely client-side — no data ever leaves your device.

## Features

- **Real-time skeleton overlay** — MediaPipe BlazePose detects 33 body landmarks at up to 60 fps
- **Pose comparison** — compare your live angles against reference ranges for 6 foundational poses
- **Color-coded joints** — green joints are in range; red joints need correction
- **Corrective feedback** — specific text instructions for each joint that's off
- **Alignment score** — radial gauge showing overall form percentage
- **Zero backend** — everything runs in WebAssembly in the browser

## Supported Poses

| Pose | Sanskrit | Difficulty |
|---|---|---|
| Mountain Pose | Tadasana | Beginner |
| Warrior I | Virabhadrasana I | Beginner |
| Warrior II | Virabhadrasana II | Beginner |
| Chair Pose | Utkatasana | Beginner |
| Tree Pose | Vrksasana | Intermediate |
| Triangle Pose | Trikonasana | Intermediate |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Grant camera permission when prompted.

## Build & Deploy

```bash
npm run build   # type-check + compile
npm run start   # serve production build locally
```

Deploy to Vercel: import the repo, no environment variables needed. See [`docs/deployment.md`](docs/deployment.md) for full instructions.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (SSG)
│   ├── poses/page.tsx        # Pose library (SSG)
│   └── practice/page.tsx     # Practice studio (CSR)
├── components/
│   ├── Camera.tsx            # getUserMedia lifecycle
│   ├── PoseCanvas.tsx        # MediaPipe detection loop + canvas
│   ├── PoseSelector.tsx      # Pose dropdown
│   ├── FeedbackPanel.tsx     # Correction text display
│   ├── ScoreDisplay.tsx      # Radial alignment gauge
│   ├── Header.tsx            # Sticky nav (mobile hamburger)
│   ├── Footer.tsx            # Site footer
│   └── ErrorBoundary.tsx     # Catches runtime errors
├── lib/
│   ├── mediapipe.ts          # PoseLandmarker init + detect
│   ├── angles.ts             # Joint angle computation
│   ├── poseComparison.ts     # Compare angles vs pose reference
│   ├── feedback.ts           # Generate correction strings
│   ├── drawing.ts            # Canvas skeleton rendering
│   └── types.ts              # Shared TypeScript types
└── data/
    └── poses.json            # Pose definitions + angle constraints
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — data flow, component map, rendering strategy
- [`docs/pose-reference.md`](docs/pose-reference.md) — landmark indices, angle definitions, per-pose constraints
- [`docs/deployment.md`](docs/deployment.md) — Vercel deployment, security headers, local dev

## Tech Stack

- **Next.js 16** (App Router, React 19)
- **MediaPipe Tasks Vision** — browser-native pose detection
- **TypeScript** — strict mode throughout
- **Tailwind CSS v4**
