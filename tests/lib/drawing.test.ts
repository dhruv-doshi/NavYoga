import { drawSkeletonInRect, LANDMARK_TO_JOINT, POSE_CONNECTIONS } from "@/lib/drawing";
import type { Landmark } from "@/lib/types";
import type { JointColorMap } from "@/lib/drawing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLandmark(x: number, y: number, visibility = 1): Landmark {
  return { x, y, z: 0, visibility };
}

/** Build a 33-element landmark array with all landmarks at a default position. */
function makeFullLandmarks(overrides: Partial<Record<number, Landmark>> = {}): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0.5, 0.5));
  for (const [idx, lm] of Object.entries(overrides)) {
    if (lm) lms[Number(idx)] = lm;
  }
  return lms;
}

function makeCanvas(w = 200, h = 200): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

const FULL_RECT = { x: 0, y: 0, w: 200, h: 200 };

// ---------------------------------------------------------------------------
// LANDMARK_TO_JOINT export
// ---------------------------------------------------------------------------

describe("LANDMARK_TO_JOINT", () => {
  it("maps index 11 to leftShoulder", () => {
    expect(LANDMARK_TO_JOINT[11]).toBe("leftShoulder");
  });

  it("maps index 26 to rightKnee", () => {
    expect(LANDMARK_TO_JOINT[26]).toBe("rightKnee");
  });
});

// ---------------------------------------------------------------------------
// POSE_CONNECTIONS export
// ---------------------------------------------------------------------------

describe("POSE_CONNECTIONS", () => {
  it("contains at least 20 bone pairs", () => {
    expect(POSE_CONNECTIONS.length).toBeGreaterThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// drawSkeletonInRect
// ---------------------------------------------------------------------------

describe("drawSkeletonInRect", () => {
  it("draws nothing when landmarks array is empty", () => {
    const { ctx } = makeCanvas();
    const fillSpy = jest.spyOn(ctx, "fill");
    const strokeSpy = jest.spyOn(ctx, "stroke");

    drawSkeletonInRect(ctx, [], FULL_RECT);

    expect(fillSpy).not.toHaveBeenCalled();
    expect(strokeSpy).not.toHaveBeenCalled();
  });

  it("skips landmarks with low visibility", () => {
    const { ctx } = makeCanvas();
    // All landmarks at visibility 0.1 (below threshold of 0.5)
    const lms = makeFullLandmarks();
    lms.forEach((lm) => { lm.visibility = 0.1; });

    const arcSpy = jest.spyOn(ctx, "arc");
    drawSkeletonInRect(ctx, lms, FULL_RECT);

    expect(arcSpy).not.toHaveBeenCalled();
  });

  it("calls arc (joint circles) for visible landmarks", () => {
    const { ctx } = makeCanvas();
    const lms = makeFullLandmarks();
    const arcSpy = jest.spyOn(ctx, "arc");

    drawSkeletonInRect(ctx, lms, FULL_RECT);

    expect(arcSpy).toHaveBeenCalled();
  });

  it("uses correct green fill for 'correct' joints", () => {
    const { ctx } = makeCanvas();
    const lms = makeFullLandmarks();
    const jointColors: JointColorMap = { leftKnee: "correct" };

    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyleValues.push(v); },
      get() { return ""; },
    });

    drawSkeletonInRect(ctx, lms, FULL_RECT, { jointColors, tone: "student" });

    // At least one fill should be the correct-joint green
    expect(fillStyleValues.some((v) => v.includes("95, 173, 91"))).toBe(true);
  });

  it("uses red fill for 'error' joints", () => {
    const { ctx } = makeCanvas();
    const lms = makeFullLandmarks();
    const jointColors: JointColorMap = { leftKnee: "error" };

    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyleValues.push(v); },
      get() { return ""; },
    });

    drawSkeletonInRect(ctx, lms, FULL_RECT, { jointColors, highlightErrors: true, tone: "student" });

    expect(fillStyleValues.some((v) => v.includes("192, 97, 74"))).toBe(true);
  });

  it("uses expert green bone color when tone='expert'", () => {
    const { ctx } = makeCanvas();
    const lms = makeFullLandmarks();

    const strokeStyleValues: string[] = [];
    Object.defineProperty(ctx, "strokeStyle", {
      set(v: string) { strokeStyleValues.push(v); },
      get() { return ""; },
    });

    drawSkeletonInRect(ctx, lms, FULL_RECT, { tone: "expert" });

    expect(strokeStyleValues.some((v) => v.includes("45, 122, 45"))).toBe(true);
  });

  it("draws error highlight stroke before standard bones when highlightErrors=true", () => {
    const { ctx } = makeCanvas();
    const lms = makeFullLandmarks({ 25: makeLandmark(0.4, 0.7) }); // leftKnee idx=25
    const jointColors: JointColorMap = { leftKnee: "error" };

    const strokeCalls: string[] = [];
    Object.defineProperty(ctx, "strokeStyle", {
      set(v: string) { strokeCalls.push(v); },
      get() { return ""; },
    });

    drawSkeletonInRect(ctx, lms, FULL_RECT, { jointColors, highlightErrors: true });

    // Red error stroke should appear before standard bone strokes
    const firstRedIdx = strokeCalls.findIndex((v) => v.includes("192, 97, 74"));
    const firstLimeIdx = strokeCalls.findIndex((v) => v.includes("195, 255, 90"));
    expect(firstRedIdx).toBeGreaterThanOrEqual(0);
    expect(firstLimeIdx).toBeGreaterThanOrEqual(0);
    expect(firstRedIdx).toBeLessThan(firstLimeIdx);
  });

  it("positions landmarks inside the given rect (not at canvas origin)", () => {
    const { ctx } = makeCanvas(400, 400);
    const rect = { x: 100, y: 50, w: 150, h: 200 };
    // Place a single visible landmark at normalized (0, 0) — should draw at (100, 50)
    const lms: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0, 0, 0)); // all invisible
    lms[11] = makeLandmark(0, 0, 1); // leftShoulder at top-left of rect

    const arcCalls: Array<[number, number]> = [];
    const origArc = ctx.arc.bind(ctx);
    jest.spyOn(ctx, "arc").mockImplementation((x, y, ...rest) => {
      arcCalls.push([x, y]);
      origArc(x, y, ...rest);
    });

    drawSkeletonInRect(ctx, lms, rect);

    // The leftShoulder joint should be drawn at rect.x=100, rect.y=50
    expect(arcCalls.some(([x, y]) => x === 100 && y === 50)).toBe(true);
  });
});
