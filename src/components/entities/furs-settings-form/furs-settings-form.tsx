import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Form } from "@/ui/components/ui/form";
import { PageLoadingSpinner } from "@/ui/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { updateFursSettingsSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useFursPremises, useFursSettings, useUpdateFursSettings, useUserFursSettings } from "./furs-settings.hooks";
// Import locale files
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { CertificateSettingsSection } from "./sections/certificate-settings-section";
import { EnableFiscalizationSection } from "./sections/enable-fiscalization-section";
import { GeneralSettingsSection } from "./sections/general-settings-section";
import { PremisesManagementSection } from "./sections/premises-management-section";

const translations = { sl, de, en, it, fr, es, pt, nl, pl, hr } as const;

/**
 * FURS Settings Form Schema
 * Uses generated schema from OpenAPI spec
 */
const fursSettingsFormSchema = updateFursSettingsSchema.required({
  enabled: true,
});

export type FursSettingsFormSchema = z.infer<typeof fursSettingsFormSchema>;

export type StepType = "settings" | "certificate" | "premises" | "enable";
export type SectionType =
  | "entity-info"
  | "operator"
  | "fiscalization"
  | "advanced"
  | "certificate-upload"
  | "premises-list"
  | "enable-toggle";

interface FursSettingsFormProps extends ComponentTranslationProps {
  entity: Entity;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  /**
   * Current active step (optional, for URL state management at page level)
   */
  initialStep?: StepType;
  /**
   * Callback when step changes (optional, for URL state management at page level)
   */
  onStepChange?: (step: StepType) => void;
  /**
   * Optional render prop to wrap each section with help content
   */
  renderSection?: (section: SectionType, content: ReactNode) => ReactNode;
}

/**
 * FURS Settings Form Component
 *
 * Implements progressive unlocking flow:
 * 1. General Settings (Step 1 - always accessible, configure numbering strategy & operator info)
 * 2. Certificate Upload (Step 2 - always accessible, upload P12/PFX certificate)
 * 3. Business Premises (Step 3 - unlocked after valid certificate, register locations & devices)
 * 4. Enable Fiscalization (Step 4 - unlocked when all prerequisites met, final activation step)
 *
 * Smart initial step selection: Opens to first incomplete step, or first step if all complete.
 */
export const FursSettingsForm: FC<FursSettingsFormProps> = ({
  entity,
  onSuccess,
  onError,
  t: translateFn,
  namespace,
  locale,
  initialStep = "settings",
  onStepChange,
  renderSection,
}) => {
  // Step navigation state (can be controlled via props for URL sync)
  const [activeStep, setActiveStep] = useState<StepType>(initialStep);
  const [hasInitializedStep, setHasInitializedStep] = useState(false);

  // Create a guaranteed translation function using the createTranslation utility
  const translate = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations,
  });

  // Handle step changes
  const handleStepChange = useCallback(
    (newStep: StepType) => {
      setActiveStep(newStep);
      onStepChange?.(newStep); // Notify parent (e.g., for URL updates)
    },
    [onStepChange],
  );

  // Fetch FURS settings and premises
  const { data: fursSettings, isLoading: settingsLoading } = useFursSettings(entity.id);
  const { data: premises, isLoading: premisesLoading } = useFursPremises(entity.id);
  const { data: userFursSettings } = useUserFursSettings(entity.id);

  const { mutate: updateSettings, isPending } = useUpdateFursSettings({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const form = useForm<FursSettingsFormSchema>({
    resolver: zodResolver(fursSettingsFormSchema),
    values: {
      enabled: fursSettings?.enabled || false,
      numbering_strategy: fursSettings?.numbering_strategy || "C",
      operator_tax_number: fursSettings?.operator_tax_number || "",
      operator_label: fursSettings?.operator_label || "",
    },
  });

  // Register with form footer for sticky save button
  useFormFooterRegistration({
    formId: "furs-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: translate("Save Settings"),
  });

  // Determine completion status
  const hasCertificate = fursSettings?.has_certificate || false;
  const certificateValid = fursSettings?.certificate_status === "valid";
  const hasPremises = (premises?.length || 0) > 0;
  // Check if at least one premise has at least one device
  const hasPremiseWithDevice =
    hasPremises && premises?.some((premise: any) => premise.Devices && premise.Devices.length > 0);

  // Step unlocking logic (new flow: settings -> certificate -> premises -> enable)
  // - Step 1 (Settings): Always accessible
  // - Step 2 (Certificate): Requires entity tax number + operator settings
  // - Step 3 (Premises): Requires valid certificate + operator settings
  // - Step 4 (Enable): Requires certificate + premise + device + operator settings
  const hasEntityTaxNumber = !!entity.tax_number;
  // Operator settings can come from user settings or entity-level FURS settings
  const hasOperatorSettings =
    (!!userFursSettings?.operator_tax_number && !!userFursSettings?.operator_label) ||
    (!!fursSettings?.operator_tax_number && !!fursSettings?.operator_label);
  const fursEnabled = fursSettings?.enabled || false;
  const canAccessCertificate = hasEntityTaxNumber && hasOperatorSettings;
  const canAccessPremises = hasEntityTaxNumber && hasOperatorSettings && hasCertificate && certificateValid;
  const canAccessEnable =
    hasEntityTaxNumber && hasOperatorSettings && certificateValid && hasPremises && hasPremiseWithDevice;

  const steps = [
    {
      id: "settings" as const,
      title: translate("General Settings"),
      complete: hasEntityTaxNumber && hasOperatorSettings,
      unlocked: true,
    },
    {
      id: "certificate" as const,
      title: translate("Certificate"),
      complete: hasCertificate && certificateValid,
      unlocked: canAccessCertificate,
    },
    {
      id: "premises" as const,
      title: translate("Business Premises"),
      complete: hasPremiseWithDevice,
      unlocked: canAccessPremises,
    },
    {
      id: "enable" as const,
      title: translate("Enable Fiscalization"),
      complete: fursEnabled,
      unlocked: canAccessEnable,
    },
  ];

  // Smart initial step selection: open to first incomplete step
  const getDefaultStep = (): StepType => {
    // If URL param provided, use it (if valid and unlocked)
    if (initialStep) {
      const stepInfo = steps.find((s) => s.id === initialStep);
      if (stepInfo?.unlocked) return initialStep;
    }

    // Find first incomplete unlocked step
    if (!certificateValid) return "certificate";
    if (!hasPremiseWithDevice) return "premises";
    if (!fursEnabled) return "enable";

    // All complete - show first step
    return "settings";
  };

  // Smart initial step selection on first load (when data is ready)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally run only when data loads, not on every dep change
  useEffect(() => {
    if (!hasInitializedStep && !settingsLoading && !premisesLoading) {
      const smartStep = getDefaultStep();
      if (smartStep !== activeStep) {
        handleStepChange(smartStep);
      }
      setHasInitializedStep(true);
    }
  }, [settingsLoading, premisesLoading, hasInitializedStep]);

  // Validate step and redirect if current step becomes locked
  // biome-ignore lint/correctness/useExhaustiveDependencies: steps is recreated on each render but values are stable
  useEffect(() => {
    const currentStepInfo = steps.find((s) => s.id === activeStep);
    if (currentStepInfo && !currentStepInfo.unlocked) {
      // If current step is locked, redirect to first unlocked step
      const firstUnlockedStep = steps.find((s) => s.unlocked);
      if (firstUnlockedStep) {
        handleStepChange(firstUnlockedStep.id);
      }
    }
  }, [activeStep, handleStepChange]);

  // Check if entity is Slovenian
  if (entity.country_code !== "SI") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{translate("FURS is for Slovenian Entities")}</AlertTitle>
        <AlertDescription>
          {translate("FURS fiscalization is only available for entities with country code SI")}
        </AlertDescription>
      </Alert>
    );
  }

  const onSubmit = (data: FursSettingsFormSchema) => {
    updateSettings({
      entityId: entity.id,
      data,
    });
  };

  if (settingsLoading || premisesLoading) {
    return <PageLoadingSpinner />;
  }

  // Check if entity is in sandbox (test) mode
  const isSandboxMode = entity.environment === "sandbox";

  // Shared tabs navigation component - in left column only
  const tabsNavigation = (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
      <Tabs
        value={activeStep}
        onValueChange={(value) => handleStepChange(value as typeof activeStep)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 rounded-none p-0">
          {steps.map((step, index) => {
            const isLocked = !step.unlocked;
            let tooltipText = "";

            if (isLocked) {
              if (step.id === "certificate") {
                if (!hasEntityTaxNumber) {
                  tooltipText = translate("Set entity tax number in General Settings first");
                } else {
                  tooltipText = translate("Set operator tax number and label in General Settings first");
                }
              } else if (step.id === "premises") {
                if (!hasEntityTaxNumber) {
                  tooltipText = translate("Set entity tax number in General Settings first");
                } else if (!hasOperatorSettings) {
                  tooltipText = translate("Set operator tax number and label in General Settings first");
                } else {
                  tooltipText = translate("Upload and validate digital certificate first");
                }
              } else if (step.id === "enable") {
                if (!hasEntityTaxNumber || !hasOperatorSettings) {
                  tooltipText = translate("Complete General Settings first");
                } else if (!certificateValid) {
                  tooltipText = translate("Upload and validate digital certificate first");
                } else if (!hasPremises) {
                  tooltipText = translate("Register at least one business premise first");
                } else {
                  tooltipText = translate("Register at least one electronic device first");
                }
              }
            }

            const trigger = (
              <TabsTrigger
                value={step.id}
                disabled={isLocked}
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
                    <p>{tooltipText}</p>
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

  // Helper to wrap section content with render prop if provided
  const wrapSection = (section: SectionType, content: ReactNode) => {
    if (renderSection) {
      return renderSection(section, content);
    }
    return content;
  };

  return (
    <Form {...form}>
      <form id="furs-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Sandbox notice - wrapped in grid for left alignment */}
        {isSandboxMode && (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{translate("Test Mode (Sandbox)")}</AlertTitle>
              <AlertDescription>
                {translate(
                  "This entity is in test mode. FURS invoices will be sent to the test/demo environment. No real fiscalization will occur.",
                )}
              </AlertDescription>
            </Alert>
            <div className="hidden lg:block" />
          </div>
        )}

        {/* Tabs navigation */}
        {tabsNavigation}

        {/* Step content - each section wrapped with its own help */}
        {activeStep === "settings" && (
          <GeneralSettingsSection
            form={form}
            entity={entity}
            t={translate}
            onSuccess={onSuccess}
            onError={onError}
            wrapSection={wrapSection}
          />
        )}

        {activeStep === "certificate" && (
          <CertificateSettingsSection
            entity={entity}
            fursSettings={fursSettings}
            t={translate}
            onSuccess={onSuccess}
            onError={onError}
            wrapSection={wrapSection}
          />
        )}

        {activeStep === "premises" && (
          <div className="space-y-6">
            {!hasCertificate && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{translate("Certificate Required")}</AlertTitle>
                <AlertDescription>
                  {translate("You must upload a digital certificate before you can register business premises")}
                </AlertDescription>
              </Alert>
            )}
            <PremisesManagementSection
              entity={entity}
              premises={(premises || []) as any}
              t={translate}
              onSuccess={onSuccess}
              onError={onError}
              wrapSection={wrapSection}
            />
          </div>
        )}

        {activeStep === "enable" && (
          <EnableFiscalizationSection
            form={form}
            fursSettings={fursSettings}
            premises={(premises || []) as any}
            t={translate}
            wrapSection={wrapSection}
          />
        )}
      </form>
    </Form>
  );
};
