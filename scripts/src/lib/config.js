"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    DETECTION_FPS: 10,
    SCORE_UPDATE_THROTTLE: 15,
    POSE_MASTERY_TOLERANCE: 5,
    STEP_ADVANCEMENT_THRESHOLD: 80,
    MAX_FEEDBACK_ITEMS: 3,
    FEEDBACK_WARNING_THRESHOLD: 15,
    TTS_MIN_GAP_MS: 8000,
    TTS_ENABLED: true,
    LLM_MODEL: "meta-llama/llama-3.1-8b-instruct",
    LLM_BASE_URL: "https://openrouter.ai/api/v1",
    LLM_MAX_STEPS: 6,
    VIDEO_FRAME_INTERVAL_MS: 500,
    VIDEO_MIN_FRAMES: 3,
    VIDEO_BEST_FRAMES_COUNT: 5,
};
