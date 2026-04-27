import { useCallback, useEffect, useRef, useState } from "react";
import { generateSteps } from "@/lib/llm";
import { computeStepMastery, shouldAdvanceStep } from "@/lib/stepInstructions";
import { speak, cancelSpeech } from "@/lib/tts";
import type { PoseDefinition, PoseComparisonResult, StepFlowState } from "@/lib/types";

export function useStepFlow(pose: PoseDefinition | null) {
  const [stepFlow, setStepFlow] = useState<StepFlowState>({
    steps: [],
    currentStepIndex: 0,
    stepMasteryScore: 0,
    isLoading: false,
    error: null,
    isComplete: false,
  });

  const lastMasteryRef = useRef(0);

  useEffect(() => {
    if (!pose) {
      resetFlow();
      return;
    }

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
        setStepFlow((prev) => ({
          ...prev,
          steps,
          isLoading: false,
          error: null,
        }));

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
  }, [pose?.id]);

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

        return {
          ...prev,
          currentStepIndex: nextIndex,
          stepMasteryScore: 0,
        };
      });
    },
    []
  );

  const resetFlow = useCallback(() => {
    cancelSpeech();
    lastMasteryRef.current = 0;
    setStepFlow({
      steps: [],
      currentStepIndex: 0,
      stepMasteryScore: 0,
      isLoading: false,
      error: null,
      isComplete: false,
    });
  }, []);

  return { stepFlow, advanceIfReady, resetFlow };
}
