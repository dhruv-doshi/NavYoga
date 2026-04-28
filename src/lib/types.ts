/**
 * @file types.ts
 * @description Shared TypeScript interfaces and types used throughout the app.
 *
 * These types are the contract between MediaPipe landmark data, the angle
 * calculation engine, the pose comparison logic, and the UI components.
 */

// ---------------------------------------------------------------------------
// MediaPipe landmark types
// ---------------------------------------------------------------------------

/**
 * A single body landmark returned by MediaPipe Pose.
 * Coordinates are normalized to [0, 1] relative to the video frame dimensions.
 */
export interface Landmark {
  /** Horizontal position (0 = left edge, 1 = right edge) */
  x: number;
  /** Vertical position (0 = top edge, 1 = bottom edge) */
  y: number;
  /** Depth relative to the camera (used for 3D estimation, optional in 2D mode) */
  z: number;
  /** Confidence score [0, 1] for this landmark's visibility */
  visibility: number;
}

// ---------------------------------------------------------------------------
// Angle / joint types
// ---------------------------------------------------------------------------

/**
 * The calculated angle at a specific body joint.
 */
export interface JointAngle {
  /** Identifier matching keys in PoseAngleConstraint (e.g. "leftElbow") */
  joint: string;
  /** Calculated angle in degrees [0, 180] */
  angleDeg: number;
}

/** Map from joint name → computed angle in degrees */
export type AngleMap = Record<string, number>;

// ---------------------------------------------------------------------------
// Pose reference data types (matches poses.json schema)
// ---------------------------------------------------------------------------

/**
 * Constraint for a single joint within a yoga pose definition.
 * Defines the acceptable angle range and corrective text.
 */
export interface PoseAngleConstraint {
  /** Human-readable joint identifier (e.g. "leftKnee", "rightElbow") */
  joint: string;
  /**
   * Ordered triplet of MediaPipe landmark indices used to compute the angle.
   * The angle is measured at the middle landmark (index [1]).
   * See: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
   */
  landmarks: [number, number, number];
  /** Minimum acceptable angle in degrees */
  min: number;
  /** Maximum acceptable angle in degrees */
  max: number;
  /** Feedback shown when the user's angle is BELOW min */
  correctionLow: string;
  /** Feedback shown when the user's angle is ABOVE max */
  correctionHigh: string;
}

/**
 * Full definition of a supported yoga pose.
 * Loaded from src/data/poses.json.
 */
export interface PoseDefinition {
  /** Unique slug identifier (e.g. "mountain", "warrior-1") */
  id: string;
  /** Display name (e.g. "Mountain Pose") */
  name: string;
  /** Sanskrit name (e.g. "Tadasana") */
  sanskrit: string;
  /** Short description shown in the pose library */
  description: string;
  /** Difficulty level for UI display */
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Path to reference image inside /public/images/ */
  imageUrl: string;
  /** List of joint angle constraints that define correct form */
  angles: PoseAngleConstraint[];
  /** Focus area tags for UI display */
  focus?: string[];
  /** Optional canonical landmark snapshot for reference overlay */
  referenceLandmarks?: Landmark[];
  /** Whether this pose was recorded by the user (vs built-in) */
  isCustom?: boolean;
  /** ISO timestamp when this pose was recorded */
  recordedAt?: string;
  /** LLM-generated step instructions (cached to avoid re-calling LLM) */
  cachedSteps?: PoseStep[];
  /** Video-derived steps with instructor frame images */
  videoSteps?: VideoStep[];
}

// ---------------------------------------------------------------------------
// Pose comparison result types
// ---------------------------------------------------------------------------

/**
 * Status of a single joint after comparison against the reference pose.
 * - "correct": angle is within [min, max]
 * - "too_low": angle is below min (correction: correctionLow)
 * - "too_high": angle is above max (correction: correctionHigh)
 * - "unknown": landmark not visible / confidence too low
 */
export type JointStatus = "correct" | "too_low" | "too_high" | "unknown";

/**
 * Result for a single joint after pose comparison.
 */
export interface JointComparisonResult {
  joint: string;
  status: JointStatus;
  angleDeg: number;
  /** How many degrees outside the target range (0 if correct/unknown) */
  deviation: number;
  /** The corrective instruction to show if status is not "correct" */
  correctionText: string | null;
}

/**
 * Full comparison result between the user's current pose and a reference pose.
 */
export interface PoseComparisonResult {
  /** The pose that was compared against */
  poseId: string;
  /** Per-joint results */
  joints: JointComparisonResult[];
  /** Overall alignment score as a percentage [0, 100] */
  score: number;
  /** List of correction strings for joints that are not correct */
  corrections: string[];
}

// ---------------------------------------------------------------------------
// Recording types
// ---------------------------------------------------------------------------

/**
 * State machine phase for recording instructor pose.
 */
export type RecordingPhase =
  | "idle"       // button not pressed
  | "countdown"  // 3-2-1 countdown
  | "capturing"  // collecting frames
  | "naming"     // user types a name
  | "saved";     // confirmation flash

/**
 * State for recording UI component.
 */
export interface RecordingState {
  phase: RecordingPhase;
  countdown: number;           // seconds remaining (3→0)
  captureBuffer: Landmark[][]; // accumulated frames during capture window
}

// ---------------------------------------------------------------------------
// Step-by-step instruction types
// ---------------------------------------------------------------------------

/**
 * A single step within a pose's instruction sequence.
 */
export interface PoseStep {
  index: number;
  title: string;
  instruction: string;
  focusJoints: string[];
  /** Present when this step was derived from a video frame */
  imageUrl?: string;
}

/**
 * A video-derived step — same as PoseStep but imageUrl is required.
 */
export interface VideoStep {
  index: number;
  title: string;
  instruction: string;
  focusJoints: string[];
  imageUrl: string;
}

/**
 * State machine for step-by-step pose guidance.
 */
export interface StepFlowState {
  steps: PoseStep[];
  currentStepIndex: number;
  stepMasteryScore: number;
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// UI / component prop types
// ---------------------------------------------------------------------------

/**
 * Props shared between Camera and PoseCanvas to keep their dimensions in sync.
 */
export interface VideoDimensions {
  width: number;
  height: number;
}
