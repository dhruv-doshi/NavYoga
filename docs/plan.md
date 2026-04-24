# Yoga Pose Estimation App — Implementation Plan

## Context

Build a web-based yoga pose estimation and correction app that uses the device camera to analyze body posture in real time and provide corrective feedback. The app uses MediaPipe Pose (BlazePose) for landmark detection, calculates joint angles, compares against reference ranges, and displays corrective suggestions with a visual skeleton overlay. No authentication needed. Deployed on Vercel as a pure Next.js application.

---

## Architecture

**Pure Next.js monorepo** — no separate backend. MediaPipe runs client-side. Pose reference data is static JSON. All logic executes in the browser with zero network calls during practice. Next.js API routes available if dynamic data serving is needed later.

---

## Data Flow

```
Webcam (getUserMedia)
    │ video frames
    ▼
MediaPipe Pose (BlazePose, runs in browser)
    │ 33 body landmarks (x, y, z, visibility)
    ▼
angles.ts — compute joint angles from landmark triplets
    │ { leftElbow: 165°, rightKnee: 92°, ... }
    ▼
poseComparison.ts — compare angles vs poses.json [min, max] ranges
    │ per-joint status: correct / too_high / too_low
    ├──────────────────────────┐
    ▼                          ▼
drawing.ts + PoseCanvas    feedback.ts + FeedbackPanel
(skeleton overlay,          ("Straighten your left knee")
 green/red joints)
```

---

## Folder Structure

```
yoga-pose-estimation/
├── docs/
│   ├── project.txt
│   ├── prompt.txt
│   ├── plan.md
│   ├── architecture.md
│   ├── pose-reference.md
│   └── deployment.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # landing page
│   │   ├── practice/
│   │   │   └── page.tsx          # camera + feedback view
│   │   └── poses/
│   │       └── page.tsx          # pose library
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Camera.tsx
│   │   ├── PoseCanvas.tsx
│   │   ├── FeedbackPanel.tsx
│   │   ├── PoseSelector.tsx
│   │   └── ScoreDisplay.tsx
│   ├── lib/
│   │   ├── mediapipe.ts
│   │   ├── angles.ts
│   │   ├── poseComparison.ts
│   │   ├── feedback.ts
│   │   ├── drawing.ts
│   │   └── types.ts
│   ├── data/
│   │   └── poses.json
│   └── styles/
│       └── globals.css
├── public/
│   └── images/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Supported Poses (6 Initial)

1. **Mountain Pose (Tadasana)** — standing straight, baseline
2. **Warrior I (Virabhadrasana I)** — front knee bent, arms overhead
3. **Warrior II (Virabhadrasana II)** — arms extended, side-facing
4. **Tree Pose (Vrksasana)** — single-leg balance
5. **Chair Pose (Utkatasana)** — knees bent, arms up
6. **Triangle Pose (Trikonasana)** — lateral bend, arms extended

Each pose in `poses.json`: id, name, description, image, and an array of angle constraints (landmark triplet, min/max degrees, correction text for each direction).

---

## Incremental Build Phases

### Phase 1 — Project Scaffolding
- Initialize Next.js with TypeScript, Tailwind CSS, ESLint
- Create folder structure (empty files/placeholders)
- Add docs stubs
- **Verify:** `npm run dev` loads default page

### Phase 2 — Landing Page & Navigation
- Build Header component with nav links
- Landing page with project description and "Start Practice" CTA
- Route to `/practice` and `/poses` (placeholder content)
- **Verify:** click between all pages

### Phase 3 — Camera Access
- Build Camera component using `navigator.mediaDevices.getUserMedia`
- Display live webcam feed on `/practice`
- Handle permission denied with user-friendly message
- **Verify:** see live webcam feed on practice page

### Phase 4 — MediaPipe Integration
- Install `@mediapipe/tasks-vision`
- Create `mediapipe.ts` — initialize PoseLandmarker, configure model
- Run detection per frame via `requestAnimationFrame`
- Log landmarks to console for verification
- **Verify:** console shows 33 landmarks updating per frame

### Phase 5 — Skeleton Overlay
- Build PoseCanvas (canvas element matching video dimensions)
- Implement `drawing.ts` — draw lines between connected landmarks, circles at joints
- Layer canvas on top of video
- **Verify:** skeleton moves with your body in real time

### Phase 6 — Angle Calculation
- Implement `angles.ts` — 3-point angle via dot product formula
- Implement `types.ts` — shared interfaces (Landmark, AngleResult, PoseDefinition, etc.)
- Display computed angles as debug overlay
- **Verify:** move arm, see elbow angle update in real time

### Phase 7 — Pose Reference Data
- Create `poses.json` with all 6 poses and their angle constraints
- Build PoseSelector component (dropdown or cards)
- Build `/poses` page — browse pose library with descriptions
- Add reference images to `public/images/`
- **Verify:** browse all poses, see details and images

### Phase 8 — Pose Comparison Engine
- Implement `poseComparison.ts` — compare live angles vs selected pose reference
- When target pose selected, return per-joint correctness status
- Color joints green (correct) or red (incorrect) on skeleton
- **Verify:** select Mountain Pose, stand straight → green; slouch → red

### Phase 9 — Feedback Panel
- Implement `feedback.ts` — generate correction strings from comparison results
- Build FeedbackPanel component — display corrective suggestions
- Debounce updates (500ms) to prevent flickering
- **Verify:** hold Warrior II incorrectly, see specific corrections

### Phase 10 — Score Display
- Build ScoreDisplay component — alignment percentage (correct joints / total)
- Visual indicator (progress bar or radial gauge)
- **Verify:** improve pose, watch score increase

### Phase 11 — Polish & Responsiveness
- Responsive layout for mobile and desktop
- Loading states, error boundaries, accessibility
- Improve landing page design and transitions
- **Verify:** works on phone and desktop

### Phase 12 — Documentation & Deployment
- Write `docs/architecture.md`, `docs/pose-reference.md`, `docs/deployment.md`
- Add JSDoc comments to all source files
- Configure for Vercel deployment
- Deploy to Vercel
- **Verify:** app is live at Vercel URL

---

## Verification Strategy

Each phase produces a testable state:
- **Phases 1-3:** Visual verification in browser (page loads, navigation works, camera feed visible)
- **Phases 4-6:** Console/debug overlay verification (landmarks detected, angles calculated)
- **Phases 7-10:** Functional testing (select pose, get feedback, see score)
- **Phases 11-12:** Cross-device testing and live deployment