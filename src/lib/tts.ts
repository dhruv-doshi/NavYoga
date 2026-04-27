import { CONFIG } from "./config";

let lastSpokenAtRef = 0;

export function isTTSAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.speechSynthesis;
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !CONFIG.TTS_ENABLED || !isTTSAvailable()) {
    return;
  }

  const now = Date.now();
  if (now - lastSpokenAtRef < CONFIG.TTS_MIN_GAP_MS) {
    return;
  }

  cancelSpeech();
  lastSpokenAtRef = now;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}
