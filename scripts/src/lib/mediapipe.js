"use strict";
/**
 * @file lib/mediapipe.ts
 * @description MediaPipe PoseLandmarker initialization and per-frame detection.
 *
 * Phase 4:
 * - Load the PoseLandmarker WASM/model from CDN via FilesetResolver
 * - Expose `initPoseLandmarker()` to create the detector once
 * - Expose `detectPose()` to run inference on a single video frame
 *
 * The model runs fully client-side via WebAssembly — no network calls during
 * practice. The initial model download (~6 MB) is cached by the browser.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPoseLandmarker = initPoseLandmarker;
exports.detectPose = detectPose;
exports.disposePoseLandmarker = disposePoseLandmarker;
exports.detectPoseFromImage = detectPoseFromImage;
var tasks_vision_1 = require("@mediapipe/tasks-vision");
// ---------------------------------------------------------------------------
// Singleton — reuse the same PoseLandmarker instance across frames
// ---------------------------------------------------------------------------
var poseLandmarker = null;
var initPromise = null;
// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
/**
 * Initialize the MediaPipe PoseLandmarker (idempotent — safe to call multiple times).
 * Returns the shared instance after the WASM runtime and model are loaded.
 */
function initPoseLandmarker() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (poseLandmarker) {
                console.log("[MediaPipe] initPoseLandmarker: already initialized, reusing instance");
                return [2 /*return*/, poseLandmarker];
            }
            if (initPromise) {
                console.log("[MediaPipe] initPoseLandmarker: init already in progress, awaiting...");
                return [2 /*return*/, initPromise];
            }
            console.log("[MediaPipe] initPoseLandmarker: starting initialization");
            initPromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                var vision;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log("[MediaPipe] Loading WASM runtime from CDN...");
                            return [4 /*yield*/, tasks_vision_1.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm")];
                        case 1:
                            vision = _a.sent();
                            console.log("[MediaPipe] WASM runtime loaded. Creating PoseLandmarker...");
                            return [4 /*yield*/, tasks_vision_1.PoseLandmarker.createFromOptions(vision, {
                                    baseOptions: {
                                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                                        delegate: "GPU",
                                    },
                                    runningMode: "VIDEO",
                                    numPoses: 1,
                                    minPoseDetectionConfidence: 0.5,
                                    minPosePresenceConfidence: 0.5,
                                    minTrackingConfidence: 0.5,
                                })];
                        case 2:
                            poseLandmarker = _a.sent();
                            console.log("[MediaPipe] PoseLandmarker ready. Model: pose_landmarker_lite, delegate: GPU");
                            return [2 /*return*/, poseLandmarker];
                    }
                });
            }); })();
            return [2 /*return*/, initPromise];
        });
    });
}
// ---------------------------------------------------------------------------
// Per-frame detection
// ---------------------------------------------------------------------------
/**
 * Run pose detection on the current video frame.
 * Must be called after `initPoseLandmarker()` resolves.
 *
 * @param videoEl - The live <video> element
 * @param timestampMs - Current timestamp in milliseconds (from performance.now())
 * @returns Array of 33 landmarks for the first detected person, or null if none.
 */
var _lastDetectionHadLandmarks = null;
function detectPose(videoEl, timestampMs) {
    if (!poseLandmarker) {
        console.warn("[MediaPipe] detectPose called before PoseLandmarker was initialized");
        return null;
    }
    if (videoEl.readyState < 2) {
        console.debug("[MediaPipe] detectPose: video not ready (readyState=%d)", videoEl.readyState);
        return null;
    }
    var result;
    try {
        result = poseLandmarker.detectForVideo(videoEl, timestampMs);
    }
    catch (err) {
        console.error("[MediaPipe] detectForVideo threw:", err);
        return null;
    }
    var hasLandmarks = !!(result.landmarks && result.landmarks.length > 0);
    // Only log on state transitions (pose appears / disappears) to avoid flooding
    if (hasLandmarks !== _lastDetectionHadLandmarks) {
        if (hasLandmarks) {
            console.log("[MediaPipe] Pose detected — %d landmarks on first person", result.landmarks[0].length);
        }
        else {
            console.log("[MediaPipe] No pose detected in frame");
        }
        _lastDetectionHadLandmarks = hasLandmarks;
    }
    if (!hasLandmarks)
        return null;
    return result.landmarks[0];
}
/**
 * Release resources. Call when the practice page unmounts.
 */
function disposePoseLandmarker() {
    console.log("[MediaPipe] disposePoseLandmarker: releasing resources");
    poseLandmarker === null || poseLandmarker === void 0 ? void 0 : poseLandmarker.close();
    poseLandmarker = null;
    initPromise = null;
    _lastDetectionHadLandmarks = null;
}
// ---------------------------------------------------------------------------
// Image mode detection (separate instance — IMAGE runningMode)
// ---------------------------------------------------------------------------
var imageLandmarker = null;
var imageInitPromise = null;
function getImageLandmarker() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (imageLandmarker)
                return [2 /*return*/, imageLandmarker];
            if (imageInitPromise)
                return [2 /*return*/, imageInitPromise];
            imageInitPromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                var vision;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, tasks_vision_1.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm")];
                        case 1:
                            vision = _a.sent();
                            return [4 /*yield*/, tasks_vision_1.PoseLandmarker.createFromOptions(vision, {
                                    baseOptions: {
                                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                                        delegate: "GPU",
                                    },
                                    runningMode: "IMAGE",
                                    numPoses: 1,
                                    minPoseDetectionConfidence: 0.5,
                                    minPosePresenceConfidence: 0.5,
                                })];
                        case 2:
                            imageLandmarker = _a.sent();
                            return [2 /*return*/, imageLandmarker];
                    }
                });
            }); })();
            return [2 /*return*/, imageInitPromise];
        });
    });
}
/**
 * Detect pose landmarks from a static image element.
 * Returns 33 landmarks or null if no person detected.
 */
function detectPoseFromImage(source) {
    return __awaiter(this, void 0, void 0, function () {
        var lm, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageLandmarker()];
                case 1:
                    lm = _a.sent();
                    try {
                        result = lm.detect(source);
                    }
                    catch (err) {
                        console.error("[MediaPipe] detectPoseFromImage threw:", err);
                        return [2 /*return*/, null];
                    }
                    if (!result.landmarks || result.landmarks.length === 0)
                        return [2 /*return*/, null];
                    return [2 /*return*/, result.landmarks[0]];
            }
        });
    });
}
