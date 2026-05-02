# Plan: docs/prompt.txt — 5 feature improvements

## Context

The yoga-pose-estimation app currently has rough edges that hurt the student experience: the master reference image is camera-mirrored relative to the student's webcam view, instructional videos are capped at 15s with naive uniform-interval frame sampling, LLM-generated step instructions and feedback still leak technical/biomechanics language ("increase the angle between your elbow"), and the session ends with a bare "Pose Complete!" card with no takeaway. `docs/prompt.txt` lays out five concrete asks to fix these. This plan executes each task with minimal scope, reuses existing infra (OpenRouter client, Vercel Blob, jest), and keeps changes localized to a small set of files.

---

## Task 1 — Mirror the master image in the sidebar

The sidebar shows `currentStep.imageUrl` (a frame extracted from the instructor's video). The student sees themselves mirrored in their webcam, so the un-mirrored master is left/right-reversed from their POV — confusing.

**Change:** `src/components/StepInstructionPanel.tsx:201`
- Add `transform: "scaleX(-1)"` to the `<img>` style block (line 198–202). One-line CSS change. No re-encoding of the stored image — purely a display flip.

**Also check for other display sites of the same image:**
- The pose tile in `PoseGalleryPanel` / pose-card (if it shows `pose.imageUrl` or step thumbnails) — if a student-facing reference, mirror there too. Skip backend list views.

---

## Task 2 — 60s video limit + AI-driven full-video analysis

### 2a. Raise the duration cap
**`src/lib/config.ts:14`** — change `VIDEO_MAX_DURATION_S: 15` → `60`.

### 2b. Replace uniform frame sampling with adaptive sampling
**`src/components/RecordPoseFlow.tsx:88-114`** currently extracts `VIDEO_ANALYSIS_FRAME_COUNT = 10` frames at uniform intervals across 5–80% of the video. At 60s with 10 frames, we'd be sampling every ~4.5s — far too sparse to catch intermediate transitions.

**Approach (minimal-scope):**
1. Bump `VIDEO_ANALYSIS_FRAME_COUNT` from 10 to 24 in `config.ts`. (24 frames × 60s ≈ 2.5s spacing; at 15s ≈ 0.6s spacing — both reasonable.)
2. Extend `trimEnd` from 0.80 → 0.95 so we don't drop the final pose hold on longer videos.
3. Pass full frame array to `/api/analyze-video` as today. The vision model already picks `frameIndex` per step from the supplied set — letting it choose from 24 frames rather than 10 means it can identify true intermediate transitions.
4. In `src/app/api/analyze-video/route.ts:9-29`, update the system prompt to emphasize: "Identify ALL meaningful intermediate body-position transitions (entry, mid-pose adjustments, full pose, exit if shown), not just the start and end. Steps must span the full video chronologically."
5. Confirm `STEPS_BY_DIFFICULTY` upper bounds (currently advanced max=8) are sufficient; consider raising advanced.max to 10 for longer videos.

**Cost / payload note:** 24 base64 JPEGs at ~30KB each ≈ 720KB request body — within OpenRouter limits but worth a `console.log` of payload size for debugging. No streaming needed.

### 2c. 50MB file-size guard
Add a file-size check in `RecordPoseFlow.tsx` `handleFile` (currently lines 47–56) BEFORE creating the object URL:
- If `file.size > 50 * 1024 * 1024`, set error "Video must be under 50MB. Yours is {Math.round(size/1024/1024)}MB." and bail.

### 2d. API route body size limit
Next.js App Router default body limit is 1MB for JSON. Need to verify `/api/analyze-video` accepts the larger payload at 24 frames. If it 413s, add `export const runtime = "nodejs"` and a custom config — OR JPEG-compress harder (`canvas.toDataURL("image/jpeg", 0.7)` instead of `0.85`).

---

## Task 3 — Natural-language prompts (steps + feedback)

Two prompt sites + one data source need updating:

### 3a. Step generation prompt — `src/lib/llm.ts:10-27`
The prompt already says "Human-friendly body cues, NOT angle measurements" but the rule is buried. Strengthen with explicit do/don't examples:
- DO: "stretch your elbow more", "lift your chest", "soften your shoulders", "reach your arms higher"
- DON'T: "increase the angle at your elbow", "set your knee to 90°", "adjust hip flexion"
Add a short "Voice & tone" section: warm, encouraging, second-person, present tense. Avoid "the" + body-part — prefer "your".

### 3b. Video-analysis prompt — `src/app/api/analyze-video/route.ts:9-29`
Same do/don't language, same voice/tone block. The instruction string each step writes ends up shown to the student verbatim, so it must be natural.

### 3c. `correctionLow` / `correctionHigh` strings on PoseDefinition (the worst offenders)
**`src/lib/poseComparison.ts:46,53`** reads `correctionLow` / `correctionHigh` directly from `pose.angles[].correctionLow/High`. These are stored on each pose (built-in `data/poses.json` and any custom poses).

**Decision (confirmed):** Rewrite built-in `data/poses.json` correction strings to natural language AND update the derivation template/prompt in `src/lib/customPoses.ts` so newly-recorded custom poses get natural-language corrections going forward. Existing user-recorded poses in Upstash are left as-is (no migration script).

### 3d. `feedback.ts` headline strings
**`src/lib/feedback.ts:55-64`** — already fairly natural. Light pass: "Work on your foundational alignment first" → "Take a breath and reset your base — let's work from the ground up." Optional polish.

---

## Task 4 — Downloadable image-report comparison (student vs master)

This is the biggest task. Three subsystems: capture, generate, download.

### 4a. Capture student's final-pose snapshot
At session-completion time, we need a frame of the student in their attempted pose. The webcam canvas is already drawn each detection frame (see `drawSkeleton` usages). Add a `ref` to the live canvas and call `canvas.toDataURL("image/jpeg", 0.9)` when `stepFlow.isComplete` flips true. Store as state on the page hosting the practice flow.

**Critical files:** find the practice page (likely `src/app/practice/[id]/page.tsx` or `src/components/PracticePanel.tsx`) — the page that wires `useStepFlow` and the live webcam together. Small follow-up read during implementation.

### 4b. Generate the report image — Server-composited PNG via `@vercel/og`

**Decision (confirmed):** Option B — server-composited PNG with real photos + dynamic per-joint annotations. Deterministic, cheap, fast, and the comparison reflects the student's actual attempt.

- Left half = master frame (`pose.imageUrl` or first `videoStep.imageUrl`).
- Right half = student snapshot captured in 4a.
- Header = pose name + sanskrit ("YOGA POSE AUDIT REPORT — WARRIOR II (VIRABHADRASANA II)").
- Overlay text annotations dynamically from `PoseComparisonResult.joints`:
  - `correct` → green ✓ + "{Joint}: aligned"
  - `too_low` / `too_high` → amber/red + the natural-language `correctionText`
- Footer: overall score + date + small symbol legend.

Aesthetic from `docs/prompt.txt`: off-white parchment background, serif header, sans-serif body labels, color-coded annotations (green/cyan correct, red/amber off). All achievable with `@vercel/og`'s JSX-to-image rendering.

**New route:** `src/app/api/pose-report/route.ts`
- Accepts: `{ poseId, masterImageUrl, studentImageDataUrl, comparisonResult, score, poseName, sanskrit }`
- Renders PNG via `@vercel/og` `ImageResponse`
- Returns `image/png` body

`@vercel/og` is part of Next.js 13+; check `package.json` first — if absent, `npm install @vercel/og`. Edge runtime preferred for speed.

### 4c. Download UX
Update `src/components/StepInstructionPanel.tsx:119-165` (the `isComplete` block):
- Add a "Download Pose Report" button below "Pose Complete!"
- On click: POST student snapshot + comparison to `/api/pose-report`, receive PNG blob, trigger download via `<a href={objectUrl} download="pose-report-{poseSlug}.png">`. Revoke object URL after click.

### 4d. Wiring the comparison result to the completion screen
`StepInstructionPanel` already receives `stepFlow` props. Confirm the latest `PoseComparisonResult` is exposed (or thread it through). Verify during implementation.

---

## Task 5 — Tests + documentation

### 5a. Tests
Existing test layout: `tests/lib/*.test.ts` with jest + ts-jest + jsdom. Pattern: pure-function tests, no React component rendering.

Add/update:
- `tests/lib/llm.test.ts` (new) — assert `buildStepPrompt` includes the natural-language guidance phrases ("body cues") and forbids angle-measurement vocabulary in the system prompt template.
- `tests/lib/feedback.test.ts` (extend) — confirm new headline strings stay natural.
- `tests/lib/poseReport.test.ts` (new) — pure-function tests for an annotation-builder helper (extracted to `src/lib/poseReport.ts`) that turns `PoseComparisonResult` → annotation list with correct color codes and labels.
- `tests/lib/videoSampling.test.ts` (new) — extract frame-index calculation from `RecordPoseFlow` into a pure helper `computeFrameSampleTimes(duration, count, trimStart, trimEnd)` and test it covers the full duration and respects new bounds.
- `tests/lib/poseComparison.test.ts` (extend) — add cases asserting that all built-in pose correction strings are non-technical (no "angle", "degree", "°", "flexion").
- API-route tests are out of scope (no MSW setup currently).

### 5b. Docs
Update existing files only:
- `README.md` — Features list (60s videos, downloadable report), env vars unchanged.
- `docs/architecture.md` — new pose-report route, mirrored sidebar image, expanded video sampling.
- `docs/prompt.txt` — leave as-is; it's the source spec.
- No new doc files.

---

## Critical files to modify

| File | Purpose |
|------|---------|
| `src/components/StepInstructionPanel.tsx` | Mirror master image; add report download button on completion |
| `src/lib/config.ts` | `VIDEO_MAX_DURATION_S: 60`; bump `VIDEO_ANALYSIS_FRAME_COUNT` to 24 |
| `src/components/RecordPoseFlow.tsx` | Extract frame-time helper; extend `trimEnd` to 0.95; add 50MB guard |
| `src/lib/llm.ts` | Tighten step-prompt natural-language rules |
| `src/app/api/analyze-video/route.ts` | Same prompt tightening; emphasize intermediate transitions |
| `data/poses.json` | Rewrite `correctionLow`/`correctionHigh` strings (path TBC during impl) |
| `src/lib/customPoses.ts` | Update derivation template so new custom poses get natural-language corrections |
| `src/lib/feedback.ts` | Light polish on headline strings |
| `src/app/api/pose-report/route.ts` | **NEW** — render split-screen PNG via `@vercel/og` |
| `src/lib/poseReport.ts` | **NEW** — pure helpers for annotation building (testable) |
| `tests/lib/llm.test.ts` | **NEW** |
| `tests/lib/poseReport.test.ts` | **NEW** |
| `tests/lib/videoSampling.test.ts` | **NEW** |
| `tests/lib/feedback.test.ts`, `tests/lib/poseComparison.test.ts` | extend |
| `README.md`, `docs/architecture.md` | doc updates |

---

## Confirmed decisions

1. **Report:** Server-composited PNG via `@vercel/og` — real master photo + real student snapshot + dynamic text annotations from `PoseComparisonResult`. (Option B from Task 4b.)
2. **Correction strings:** Rewrite built-in `data/poses.json` AND update the derivation template in `src/lib/customPoses.ts` so new custom poses get natural-language corrections going forward. Existing user-recorded poses are left alone (no migration script).
3. **Video upload:** Add a 50MB file-size guard in `RecordPoseFlow.tsx` alongside the 60s duration check, with a clear "Video must be under 50MB" error message. Bail before frame extraction starts.

---

## Verification

1. **Mirror:** open a practice session, eyeball the sidebar image — instructor's left hand should appear on screen-left where the student's left hand also appears.
2. **60s video:** upload a 45–55s instructor video; confirm no "must be 15s" error; confirm steps span the full duration (first step from early frame, last step from late frame). Try a >50MB file and confirm the size guard fires before extraction starts.
3. **Natural language:** run `generateSteps` for Warrior II in the dev console — confirm zero occurrences of "angle", "degree", "°", or "flexion" in instruction strings. Run a live session and trigger a correction — confirm spoken/displayed feedback is conversational.
4. **Report:** complete a pose, click "Download Pose Report", open the PNG — verify split-screen layout, master on left + student on right, score + date in footer, color-coded joint annotations matching final `PoseComparisonResult`.
5. **Tests:** `npm test` — all green, including new files.
6. **Lint/Build:** `npm run build` succeeds; `npm run lint` clean.
