import { CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { cn } from "@/ui/lib/utils";
import type { FiscalizationStepConfig } from "./fiscalization-step-flow";

interface FiscalizationStepTabsProps<T extends string> {
  activeStep: T;
  steps: FiscalizationStepConfig<T>[];
  testIdPrefix: string;
  onStepChange: (step: T) => void;
  getTooltipText: (step: FiscalizationStepConfig<T>) => string;
}

export function FiscalizationStepTabs<T extends string>({
  activeStep,
  steps,
  testIdPrefix,
  onStepChange,
  getTooltipText,
}: FiscalizationStepTabsProps<T>) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
      <Tabs value={activeStep} onValueChange={(value) => onStepChange(value as T)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-none p-0">
          {steps.map((step, index) => {
            const isLocked = !step.unlocked;

            const trigger = (
              <TabsTrigger
                value={step.id}
                disabled={isLocked}
                data-testid={`${testIdPrefix}-${step.id}`}
                className={cn("cursor-pointer justify-center", !step.unlocked && "opacity-50")}
              >
                <span className="flex items-center gap-2">
                  {step.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                  {step.title}
                </span>
              </TabsTrigger>
            );

            if (isLocked) {
              return (
                <Tooltip key={step.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="flex cursor-not-allowed justify-center">{trigger}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getTooltipText(step)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <span key={step.id} className="flex justify-center">
                {trigger}
              </span>
            );
          })}
        </TabsList>
      </Tabs>
      <div className="hidden lg:block" />
    </div>
  );
}
