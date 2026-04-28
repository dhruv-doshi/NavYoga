import { useCallback, useEffect, useRef, useState } from "react";
import { generateSteps } from "@/lib/llm";
import { computeStepMastery, shouldAdvanceStep } from "@/lib/stepInstructions";
import { speak, cancelSpeech } from "@/lib/tts";
import { updateCustomPoseSteps } from "@/lib/customPoses";
import type { PoseDefinition, PoseComparisonResult, StepFlowState } from "@/lib/types";

export function useStepFlow(pose: PoseDefinition | null, enabled: boolean = true) {
  const [stepFlow, setStepFlow] = useState<StepFlowState>({
    steps: [],
    currentStepIndex: 0,
    stepMasteryScore: 0,
    isLoading: false,
    error: null,
    isComplete: false,
  });

  const lastMasteryRef = useRef(-1);

  useEffect(() => {
    if (!pose || !enabled) {
      if (!pose) resetFlow();
      return;
    }

    console.log("[useStepFlow] enabled=%s, pose=%s, hasVideoSteps=%s, hasCachedSteps=%s", enabled, pose.id, !!pose.videoSteps?.length, !!pose.cachedSteps?.length);

    // Priority 1: video-derived steps (have instructor frame images)
    if (pose.videoSteps && pose.videoSteps.length > 0) {
      console.log("[useStepFlow] video steps hit: %d steps", pose.videoSteps.length);
      const steps = pose.videoSteps.map((vs) => ({ ...vs }));
      setStepFlow({
        steps,
        currentStepIndex: 0,
        stepMasteryScore: 0,
        isLoading: false,
        error: null,
        isComplete: false,
      });
      speak(steps[0].instruction);
      return;
    }

    // Priority 2: text-only cached steps
    if (pose.cachedSteps && pose.cachedSteps.length > 0) {
      console.log("[useStepFlow] cache hit: %d steps", pose.cachedSteps.length);
      setStepFlow({
        steps: pose.cachedSteps,
        currentStepIndex: 0,
        stepMasteryScore: 0,
        isLoading: false,
        error: null,
        isComplete: false,
      });
      speak(pose.cachedSteps[0].instruction);
      return;
    }

    console.log("[useStepFlow] calling LLM for %s", pose.name);
    cancelSpeech();
    setStepFlow((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      steps: [],
      currentStepIndex: 0,
      isComplete: false,
    }));

    generateSteps(pose)
      .then((steps) => {
        console.log("[useStepFlow] LLM returned %d steps", steps.length);
        setStepFlow((prev) => ({
          ...prev,
          steps,
          isLoading: false,
          error: null,
        }));

        // Cache steps for custom poses
        if (pose.isCustom) {
          updateCustomPoseSteps(pose.id, steps);
        }

        if (steps.length > 0) {
          speak(steps[0].instruction);
        }
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
        const mastery = computeStepMastery(result, currentStep);

        const masteryDelta = Math.abs(mastery - lastMasteryRef.current);
        if (masteryDelta < 3) {
          return prev;
        }

        lastMasteryRef.current = mastery;

        if (!shouldAdvanceStep(mastery)) {
          return { ...prev, stepMasteryScore: mastery };
        }

        const nextIndex = prev.currentStepIndex + 1;
        if (nextIndex >= prev.steps.length) {
          speak("Pose complete! Excellent work.");
          return { ...prev, isComplete: true, stepMasteryScore: 100 };
        }

        const nextStep = prev.steps[nextIndex];
        speak(nextStep.instruction);
        lastMasteryRef.current = -1; // reset so the new step's first mastery reading always triggers an update

        console.log("[useStepFlow] advanced to step %d: '%s'", nextIndex, nextStep.title);
        return {
          ...prev,
          currentStepIndex: nextIndex,
          stepMasteryScore: 0,
        };
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
      lastMasteryRef.current = -1;
      console.log("[useStepFlow] manually skipped to step %d: '%s'", nextIndex, nextStep.title);
      return { ...prev, currentStepIndex: nextIndex, stepMasteryScore: 0 };
    });
  }, []);

  const resetFlow = useCallback(() => {
    cancelSpeech();
    lastMasteryRef.current = -1;
    setStepFlow({
      steps: [],
      currentStepIndex: 0,
      stepMasteryScore: 0,
      isLoading: false,
      error: null,
      isComplete: false,
    });
  }, []);

  return { stepFlow, advanceIfReady, resetFlow, skipStep };
}
