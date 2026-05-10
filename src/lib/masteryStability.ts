import { CONFIG } from "./config";

export class MasteryStabilityTracker {
  private ema = 0;
  private window: boolean[] = [];
  private stepEnteredAt = Date.now();
  private hasFirstSample = false;

  reset(now = Date.now()) {
    this.ema = 0;
    this.window = [];
    this.stepEnteredAt = now;
    this.hasFirstSample = false;
  }

  update(rawMastery: number): number {
    if (!this.hasFirstSample) {
      this.ema = rawMastery;
      this.hasFirstSample = true;
    } else {
      this.ema = CONFIG.MASTERY_EMA_ALPHA * rawMastery + (1 - CONFIG.MASTERY_EMA_ALPHA) * this.ema;
    }
    const above = this.ema >= CONFIG.MASTERY_THRESHOLD;
    this.window.push(above);
    if (this.window.length > CONFIG.HOLD_WINDOW_FRAMES) this.window.shift();
    return this.ema;
  }

  shouldAdvance(now = Date.now(), minDwellMs: number = CONFIG.MIN_STEP_DWELL_MS): boolean {
    if (now - this.stepEnteredAt < minDwellMs) return false;
    if (this.window.length < CONFIG.HOLD_FRAMES_REQUIRED) return false;
    const trues = this.window.reduce((n, v) => n + (v ? 1 : 0), 0);
    return trues >= CONFIG.HOLD_FRAMES_REQUIRED;
  }

  get smoothedMastery(): number {
    return this.ema;
  }
}
