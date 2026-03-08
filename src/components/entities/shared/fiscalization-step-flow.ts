import { useCallback, useEffect, useRef, useState } from "react";

export interface FiscalizationStepConfig<T extends string> {
  id: T;
  title: string;
  complete: boolean;
  unlocked: boolean;
}

interface UseFiscalizationStepFlowOptions<T extends string> {
  initialStep: T;
  isReady: boolean;
  steps: FiscalizationStepConfig<T>[];
  getDefaultStep: () => T;
  onStepChange?: (step: T) => void;
}

export function useFiscalizationStepFlow<T extends string>({
  initialStep,
  isReady,
  steps,
  getDefaultStep,
  onStepChange,
}: UseFiscalizationStepFlowOptions<T>) {
  const [activeStep, setActiveStep] = useState<T>(initialStep);
  const [hasInitializedStep, setHasInitializedStep] = useState(false);
  const previousInitialStep = useRef(initialStep);

  const handleStepChange = useCallback(
    (newStep: T) => {
      setActiveStep(newStep);
      onStepChange?.(newStep);
    },
    [onStepChange],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: caller controls step definitions and default-step logic
  useEffect(() => {
    if (!hasInitializedStep && isReady) {
      const smartStep = getDefaultStep();
      if (smartStep !== activeStep) {
        handleStepChange(smartStep);
      }
      setHasInitializedStep(true);
    }
  }, [isReady, hasInitializedStep]);

  useEffect(() => {
    const currentStepInfo = steps.find((step) => step.id === activeStep);
    if (currentStepInfo && !currentStepInfo.unlocked) {
      const firstUnlockedStep = steps.find((step) => step.unlocked);
      if (firstUnlockedStep) {
        handleStepChange(firstUnlockedStep.id);
      }
    }
  }, [activeStep, steps, handleStepChange]);

  useEffect(() => {
    if (!hasInitializedStep) return;

    if (previousInitialStep.current === initialStep) {
      return;
    }

    previousInitialStep.current = initialStep;

    const nextStepInfo = steps.find((step) => step.id === initialStep);
    if (nextStepInfo?.unlocked && initialStep !== activeStep) {
      setActiveStep(initialStep);
    }
  }, [activeStep, hasInitializedStep, initialStep, steps]);

  return {
    activeStep,
    handleStepChange,
  };
}
