import { useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import { generateSteps } from "@/lib/llm";
import { computeStepMastery } from "@/lib/stepInstructions";
import { speak, cancelSpeech } from "@/lib/tts";
import { updateCustomPoseSteps } from "@/lib/customPoses";
import { MasteryStabilityTracker } from "@/lib/masteryStability";
import { CONFIG } from "@/lib/config";
import type { PoseDefinition, PoseComparisonResult, StepFlowState, Landmark, VideoStep } from "@/lib/types";

export function useStepFlow(pose: PoseDefinition | null, enabled: boolean = true) {
  const [stepFlow, setStepFlow] = useState<StepFlowState>({
    steps: [],
    currentStepIndex: 0,
    stepMasteryScore: 0,
    isLoading: false,
    error: null,
    isComplete: false,
  });

  const trackerRef = useRef(new MasteryStabilityTracker());

  useEffect(() => {
    if (!pose || !enabled) {
      if (!pose) resetFlow();
      return;
    }

    // Priority 1: video-derived steps (have instructor frame images)
    if (pose.videoSteps && pose.videoSteps.length > 0) {
      const steps = pose.videoSteps.map((vs) => ({ ...vs }));
      trackerRef.current.reset();
      setStepFlow({ steps, currentStepIndex: 0, stepMasteryScore: 0, isLoading: false, error: null, isComplete: false });
      speak(steps[0].instruction);
      return;
    }

    // Priority 2: text-only cached steps
    if (pose.cachedSteps && pose.cachedSteps.length > 0) {
      trackerRef.current.reset();
      setStepFlow({ steps: pose.cachedSteps, currentStepIndex: 0, stepMasteryScore: 0, isLoading: false, error: null, isComplete: false });
      speak(pose.cachedSteps[0].instruction);
      return;
    }

    cancelSpeech();
    setStepFlow((prev) => ({ ...prev, isLoading: true, error: null, steps: [], currentStepIndex: 0, isComplete: false }));

    generateSteps(pose)
      .then((steps) => {
        trackerRef.current.reset();
        setStepFlow((prev) => ({ ...prev, steps, isLoading: false, error: null }));
        if (pose.isCustom) {
          updateCustomPoseSteps(pose.id, steps).catch((e) =>
            console.warn("[useStepFlow] Failed to cache steps:", e)
          );
        }
        if (steps.length > 0) speak(steps[0].instruction);
      })
      .catch((error) => {
        console.error("[useStepFlow] generateSteps failed:", error);
        setStepFlow((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load instructions",
        }));
      });
  }, [pose?.id, enabled]);

  const advanceIfReady = useCallback(
    (result: PoseComparisonResult) => {
      setStepFlow((prev) => {
        if (prev.steps.length === 0 || prev.isComplete) return prev;

        const currentStep = prev.steps[prev.currentStepIndex];
        const rawMastery = computeStepMastery(result, currentStep);
        const smoothed = trackerRef.current.update(rawMastery);

        const isFinalHold = currentStep.title.toLowerCase() === "final hold";
        const minDwell = isFinalHold ? 5000 : CONFIG.MIN_STEP_DWELL_MS;
        if (trackerRef.current.shouldAdvance(Date.now(), minDwell)) {
          const nextIndex = prev.currentStepIndex + 1;
          if (nextIndex >= prev.steps.length) {
            speak("Pose complete! Excellent work.");
            return { ...prev, isComplete: true, stepMasteryScore: 100 };
          }
          const nextStep = prev.steps[nextIndex];
          speak(nextStep.instruction);
          trackerRef.current.reset();
          console.log("[useStepFlow] advanced to step %d: '%s'", nextIndex, nextStep.title);
          return { ...prev, currentStepIndex: nextIndex, stepMasteryScore: 0 };
        }

        return { ...prev, stepMasteryScore: Math.round(smoothed) };
      });
    },
    []
  );

  const skipStep = useCallback(() => {
    setStepFlow((prev) => {
      if (prev.steps.length === 0 || prev.isComplete) return prev;
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.steps.length) {
        speak("Pose complete! Excellent work.");
        return { ...prev, isComplete: true, stepMasteryScore: 100 };
      }
      const nextStep = prev.steps[nextIndex];
      speak(nextStep.instruction);
      trackerRef.current.reset();
      console.log("[useStepFlow] manually skipped to step %d: '%s'", nextIndex, nextStep.title);
      return { ...prev, currentStepIndex: nextIndex, stepMasteryScore: 0 };
    });
  }, []);

  const resetFlow = useCallback(() => {
    cancelSpeech();
    trackerRef.current.reset();
    setStepFlow({ steps: [], currentStepIndex: 0, stepMasteryScore: 0, isLoading: false, error: null, isComplete: false });
  }, []);

  // Expose per-step reference landmarks for accurate comparison
  const currentStepReference: Landmark[] | null = (() => {
    const step = stepFlow.steps[stepFlow.currentStepIndex];
    if (step && "referenceLandmarks" in step) {
      return (step as VideoStep).referenceLandmarks ?? null;
    }
    return null;
  })();

  return { stepFlow, advanceIfReady, resetFlow, skipStep, currentStepReference };
}
