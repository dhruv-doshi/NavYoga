import type { StepFlowState } from "@/lib/types";

interface StepInstructionPanelProps {
  stepFlow: StepFlowState;
  onRetry?: () => void;
  onSkipStep?: () => void;
}

export function StepInstructionPanel({ stepFlow, onRetry, onSkipStep }: StepInstructionPanelProps) {
  const { steps, currentStepIndex, stepMasteryScore, isLoading, error, isComplete } = stepFlow;

  if (isLoading) {
    return (
      <div
        className="p-5 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
        >
          Steps
        </h2>
        <div className="flex flex-col gap-2">
          <div
            className="h-4 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "80%" }}
          />
          <div
            className="h-3 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "100%" }}
          />
          <div
            className="h-3 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "90%" }}
          />
        </div>
      </div>
    );
  }

  if (isLoading || (steps.length === 0 && !error)) {
    console.log("[StepPanel] isLoading=%s, steps=%d, error=%s", isLoading, steps.length, error);
    return (
      <div
        className="p-5 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
        >
          Steps
        </h2>
        <div className="flex flex-col gap-2">
          <div
            className="h-4 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "80%" }}
          />
          <div
            className="h-3 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "100%" }}
          />
          <div
            className="h-3 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded animate-pulse"
            style={{ width: "90%" }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    console.log("[StepPanel] error state: %s", error);
    return (
      <div
        className="p-5 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
        >
          Steps
        </h2>
        <div className="flex flex-col gap-2">
          <p
            className="text-sm"
            style={{ color: "var(--joint-error)", fontFamily: "var(--font-dm-sans)" }}
          >
            Could not load instructions. Feedback mode active.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-2 rounded text-xs font-semibold"
              style={{
                background: "rgba(120,180,255,0.15)",
                border: "1px solid rgba(120,180,255,0.4)",
                color: "rgba(120,180,255,0.9)",
                fontFamily: "var(--font-dm-sans)",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  const currentStep = steps[currentStepIndex];

  if (isComplete) {
    return (
      <div
        className="p-5 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
        >
          Steps
        </h2>
        <div
          className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-lg"
          style={{
            background: "rgba(95, 173, 91, 0.1)",
            border: "1px solid rgba(95, 173, 91, 0.3)",
          }}
        >
          <div
            className="text-3xl"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            ✓
          </div>
          <p
            className="text-sm font-semibold text-center"
            style={{
              color: "var(--joint-correct)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Pose Complete!
          </p>
          <p
            className="text-xs text-center"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Excellent work. Select a new pose to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-5 flex flex-col gap-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <h2
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
      >
        Current Step
      </h2>

      <div className="flex flex-col gap-3">
        <div
          className="text-xs"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-sans)" }}
        >
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        <div key={`step-${currentStepIndex}`} className="step-fade-in flex flex-col gap-3">
          {currentStep.imageUrl && (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                aspectRatio: "16/9",
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentStep.imageUrl}
                alt={`Step ${currentStepIndex + 1}: ${currentStep.title}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
            >
              {currentStep.title}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-dm-sans)" }}
            >
              {currentStep.instruction}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div
            className="flex justify-between items-center"
            style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
          >
            <span style={{ fontFamily: "var(--font-dm-sans)" }}>Mastery</span>
            <span style={{ fontFamily: "var(--font-dm-sans)" }}>{stepMasteryScore}%</span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: 6,
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: `${stepMasteryScore}%`,
                height: "100%",
                background: "var(--joint-correct)",
                transition: "width 300ms ease",
              }}
            />
          </div>
        </div>

        {onSkipStep && !isComplete && (
          <button
            onClick={onSkipStep}
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              padding: 0,
              alignSelf: "flex-end",
            }}
          >
            Next step →
          </button>
        )}
      </div>
    </div>
  );
}
