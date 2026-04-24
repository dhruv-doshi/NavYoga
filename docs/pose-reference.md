# Pose Reference

All six poses are defined in `src/data/poses.json`. Each entry follows the `PoseDefinition` interface from `src/lib/types.ts`.

## Landmark Index Reference (MediaPipe BlazePose 33)

| Index | Landmark | Index | Landmark |
|---|---|---|---|
| 0 | Nose | 17 | Left pinky |
| 11 | Left shoulder | 12 | Right shoulder |
| 13 | Left elbow | 14 | Right elbow |
| 15 | Left wrist | 16 | Right wrist |
| 23 | Left hip | 24 | Right hip |
| 25 | Left knee | 26 | Right knee |
| 27 | Left ankle | 28 | Right ankle |

## How Angles Are Computed

Each constraint specifies a `landmarks: [A, B, C]` triplet. The angle is measured at the **middle landmark B** (the vertex), using the dot-product of vectors BA and BC:

```
angle = acos( (BA · BC) / (|BA| × |BC|) )
```

Landmarks with `visibility < 0.5` are skipped to avoid noisy readings.

## Joint Definitions Used for Comparison

| Joint name | Landmark triplet (A→vertex→C) | What it measures |
|---|---|---|
| `leftShoulder` | 13 → 11 → 23 | Elbow → shoulder → hip |
| `rightShoulder` | 14 → 12 → 24 | Elbow → shoulder → hip |
| `leftElbow` | 11 → 13 → 15 | Shoulder → elbow → wrist |
| `rightElbow` | 12 → 14 → 16 | Shoulder → elbow → wrist |
| `leftHip` | 11 → 23 → 25 | Shoulder → hip → knee |
| `rightHip` | 12 → 24 → 26 | Shoulder → hip → knee |
| `leftKnee` | 23 → 25 → 27 | Hip → knee → ankle |
| `rightKnee` | 24 → 26 → 28 | Hip → knee → ankle |

---

## Supported Poses

### 1. Mountain Pose — Tadasana (Beginner)

Standing tall, spine elongated, arms at sides.

| Joint | Min° | Max° | Too low → | Too high → |
|---|---|---|---|---|
| leftKnee | 165 | 180 | Straighten left knee | Soften knee slightly |
| rightKnee | 165 | 180 | Straighten right knee | Soften knee slightly |
| leftHip | 160 | 180 | Extend left hip | Draw hip forward |
| rightHip | 160 | 180 | Extend right hip | Draw hip forward |
| leftElbow | 155 | 180 | Straighten left arm | Relax left elbow |
| rightElbow | 155 | 180 | Straighten right arm | Relax right elbow |

### 2. Warrior I — Virabhadrasana I (Beginner)

Front knee bent ~90°, arms overhead, back leg straight.

| Joint | Min° | Max° |
|---|---|---|
| leftKnee (front) | 80 | 105 |
| rightKnee (back) | 155 | 180 |
| leftHip | 80 | 115 |
| leftShoulder | 140 | 180 |
| rightShoulder | 140 | 180 |

### 3. Warrior II — Virabhadrasana II (Beginner)

Arms extended parallel to floor, front knee bent ~90°.

| Joint | Min° | Max° |
|---|---|---|
| leftKnee (front) | 80 | 105 |
| rightKnee (back) | 155 | 180 |
| leftElbow | 155 | 180 |
| rightElbow | 155 | 180 |

### 4. Tree Pose — Vrksasana (Intermediate)

Standing on one leg, raised foot against inner thigh.

| Joint | Min° | Max° |
|---|---|---|
| leftKnee (standing) | 160 | 180 |
| rightKnee (raised) | 30 | 75 |
| leftHip | 158 | 180 |

### 5. Chair Pose — Utkatasana (Beginner)

Knees bent as if sitting in a chair, arms raised.

| Joint | Min° | Max° |
|---|---|---|
| leftKnee | 80 | 120 |
| rightKnee | 80 | 120 |
| leftHip | 70 | 110 |
| rightHip | 70 | 110 |
| leftShoulder | 140 | 180 |
| rightShoulder | 140 | 180 |

### 6. Triangle Pose — Trikonasana (Intermediate)

Legs wide, one hand to the floor, one arm to the sky.

| Joint | Min° | Max° |
|---|---|---|
| leftKnee | 155 | 180 |
| rightKnee | 155 | 180 |
| leftElbow | 155 | 180 |
| rightElbow | 155 | 180 |
| leftHip | 60 | 100 |

---

## Scoring

`score = (correct joints / evaluated joints) × 100`

Only joints where all three landmarks have `visibility ≥ 0.5` are counted. Joints with low-confidence landmarks get status `"unknown"` and are excluded from the score denominator.
