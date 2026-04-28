import { CONFIG } from "./config";
import { speak } from "./tts";

interface JointHintState {
  wrongSinceMs: number;
  lastSpokenAtMs: number;
}

const state = new Map<string, JointHintState>();

export function maybeSpeakJointHint(joint: string, isWrong: boolean, hint: string | null) {
  const now = Date.now();
  let s = state.get(joint);
  if (!s) {
    s = { wrongSinceMs: 0, lastSpokenAtMs: 0 };
    state.set(joint, s);
  }

  if (!isWrong) {
    s.wrongSinceMs = 0;
    return;
  }

  if (s.wrongSinceMs === 0) s.wrongSinceMs = now;
  const dwell = now - s.wrongSinceMs;
  if (dwell < CONFIG.JOINT_HINT_DWELL_MS) return;
  if (now - s.lastSpokenAtMs < CONFIG.JOINT_HINT_REPEAT_MS) return;
  if (!hint) return;

  s.lastSpokenAtMs = now;
  speak(hint);
}

export function clearJointHintGate() {
  state.clear();
}
