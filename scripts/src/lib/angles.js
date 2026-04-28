"use strict";
/**
 * @file lib/angles.ts
 * @description Joint angle calculation from MediaPipe landmark triplets.
 *
 * Phase 6:
 * - `calcAngle(a, b, c)` — angle at vertex b using dot-product formula
 * - `computeAngles(landmarks)` — compute all named joint angles at once
 *
 * The angle is always measured at the MIDDLE landmark (b / vertex).
 * Result is in degrees [0, 180].
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRECTED_JOINTS = void 0;
exports.calcAngle = calcAngle;
exports.computeAngles = computeAngles;
// ---------------------------------------------------------------------------
// Core geometry
// ---------------------------------------------------------------------------
/**
 * Compute the angle (in degrees) at vertex `b` formed by points a → b → c.
 * Uses the dot-product of vectors (a-b) and (c-b).
 *
 * Returns 0 if either vector has zero length (degenerate triplet).
 */
function calcAngle(a, b, c) {
    var ax = a.x - b.x;
    var ay = a.y - b.y;
    var az = a.z - b.z;
    var cx = c.x - b.x;
    var cy = c.y - b.y;
    var cz = c.z - b.z;
    var dot = ax * cx + ay * cy + az * cz;
    var magA = Math.sqrt(ax * ax + ay * ay + az * az);
    var magC = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (magA === 0 || magC === 0)
        return 0;
    // Clamp to [-1, 1] to guard against floating-point drift before acos
    var cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
}
// ---------------------------------------------------------------------------
// Named joint definitions
// Each entry: [jointName, landmarkA, landmarkB (vertex), landmarkC]
// Landmark indices from MediaPipe BlazePose 33-landmark topology:
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------
var JOINT_DEFINITIONS = [
    // Arms
    ["leftShoulder", 11, 13, 15], // left shoulder (elbow as vertex)
    ["rightShoulder", 12, 14, 16], // right shoulder
    ["leftElbow", 11, 13, 15], // elbow: shoulder→elbow→wrist (same indices, vertex=13)
    ["rightElbow", 12, 14, 16],
    // Hips
    ["leftHip", 11, 23, 25], // left hip: shoulder→hip→knee
    ["rightHip", 12, 24, 26],
    // Knees
    ["leftKnee", 23, 25, 27], // left knee: hip→knee→ankle
    ["rightKnee", 24, 26, 28],
    // Ankles
    ["leftAnkle", 25, 27, 31], // left ankle: knee→ankle→heel
    ["rightAnkle", 26, 28, 32],
    // Torso (spine-ish)
    ["spine", 23, 11, 12], // midpoint approximation: left hip → left shoulder → right shoulder
];
// Correct the shoulder and elbow definitions — they use different vertex landmarks:
// leftShoulder:  13 → 11 → 23  (elbow → shoulder → hip)
// leftElbow:     11 → 13 → 15  (shoulder → elbow → wrist)
exports.CORRECTED_JOINTS = [
    ["leftShoulder", 13, 11, 23],
    ["rightShoulder", 14, 12, 24],
    ["leftElbow", 11, 13, 15],
    ["rightElbow", 12, 14, 16],
    ["leftHip", 11, 23, 25],
    ["rightHip", 12, 24, 26],
    ["leftKnee", 23, 25, 27],
    ["rightKnee", 24, 26, 28],
    ["leftAnkle", 25, 27, 31],
    ["rightAnkle", 26, 28, 32],
];
// ---------------------------------------------------------------------------
// Visibility threshold — skip landmarks that MediaPipe is not confident about
// ---------------------------------------------------------------------------
var VISIBILITY_THRESHOLD = 0.3;
/**
 * Compute all named joint angles from a set of 33 MediaPipe landmarks.
 *
 * @param landmarks - Array of 33 Landmark objects (from MediaPipe)
 * @returns AngleMap — e.g. { leftElbow: 165.2, rightKnee: 92.4, ... }
 *          Joints where any landmark has low visibility are omitted.
 */
function computeAngles(landmarks) {
    var _a, _b, _c, _d, _e, _f;
    var angles = {};
    var skipped = [];
    for (var _i = 0, CORRECTED_JOINTS_1 = exports.CORRECTED_JOINTS; _i < CORRECTED_JOINTS_1.length; _i++) {
        var _g = CORRECTED_JOINTS_1[_i], name_1 = _g[0], idxA = _g[1], idxB = _g[2], idxC = _g[3];
        var a = landmarks[idxA];
        var b = landmarks[idxB];
        var c = landmarks[idxC];
        if (!a || !b || !c) {
            skipped.push("".concat(name_1, "(missing landmark)"));
            continue;
        }
        // Skip if any landmark has low confidence
        if (((_a = a.visibility) !== null && _a !== void 0 ? _a : 1) < VISIBILITY_THRESHOLD ||
            ((_b = b.visibility) !== null && _b !== void 0 ? _b : 1) < VISIBILITY_THRESHOLD ||
            ((_c = c.visibility) !== null && _c !== void 0 ? _c : 1) < VISIBILITY_THRESHOLD) {
            skipped.push("".concat(name_1, "(low-visibility: ").concat([(_d = a.visibility) === null || _d === void 0 ? void 0 : _d.toFixed(2), (_e = b.visibility) === null || _e === void 0 ? void 0 : _e.toFixed(2), (_f = c.visibility) === null || _f === void 0 ? void 0 : _f.toFixed(2)].join(","), ")"));
            continue;
        }
        angles[name_1] = Math.round(calcAngle(a, b, c) * 10) / 10;
    }
    // console.debug(
    //   "[Angles] computeAngles: %d/%d joints computed. Angles: %o | Skipped: %s",
    //   Object.keys(angles).length,
    //   CORRECTED_JOINTS.length,
    //   angles,
    //   skipped.length > 0 ? skipped.join(", ") : "none"
    // );
    return angles;
}
