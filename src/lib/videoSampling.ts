export interface FrameSampleResult {
  times: number[];
  trimStart: number;
  trimEnd: number;
}

/**
 * Compute the timestamps (seconds) to seek to when sampling a video for pose analysis.
 * Trims the very start and near-end of the video to avoid intros and fade-outs.
 */
export function computeFrameSampleTimes(
  duration: number,
  count: number,
  trimStartRatio: number = 0.05,
  trimEndRatio: number = 0.95,
): FrameSampleResult {
  const trimStart = duration * trimStartRatio;
  const trimEnd = duration * trimEndRatio;
  const range = trimEnd - trimStart;
  const interval = count > 1 ? range / count : 0;
  const times = Array.from({ length: count }, (_, i) => trimStart + i * interval);
  return { times, trimStart, trimEnd };
}
