import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { PageLoadingSpinner } from "@/ui/components/ui/loading-spinner";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import { Switch } from "@/ui/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useFinaPremises, useFinaSettings, useUpdateFinaSettings } from "./fina-settings.hooks";
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
import { PremisesManagementSection } from "./sections/premises-management-section";

const translations = { sl, de, en, it, fr, es, pt, nl, pl, hr } as const;

export type FinaStepType = "settings" | "certificate" | "premises" | "enable";
export type FinaSectionType = "operator" | "numbering" | "certificate-upload" | "premises-list" | "enable-toggle";

interface FinaSettingsFormProps extends ComponentTranslationProps {
  entity: any;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  initialStep?: FinaStepType;
  onStepChange?: (step: FinaStepType) => void;
  renderSection?: (section: FinaSectionType, content: ReactNode) => ReactNode;
}

/**
 * FINA Settings Form Component
 *
 * Implements progressive unlocking flow (same as FURS):
 * 1. General Settings - numbering sequence, operator OIB, PDV system
 * 2. Certificate Upload - FINA P12/PFX certificate
 * 3. Business Premises - register locations & devices with FINA
 * 4. Enable Fiscalization - final activation
 */
export const FinaSettingsForm: FC<FinaSettingsFormProps> = ({
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
  const [activeStep, setActiveStep] = useState<FinaStepType>(initialStep);
  const [hasInitializedStep, setHasInitializedStep] = useState(false);

  const translate = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations,
  });

  const handleStepChange = useCallback(
    (newStep: FinaStepType) => {
      setActiveStep(newStep);
      onStepChange?.(newStep);
    },
    [onStepChange],
  );

  // Fetch FINA settings and premises
  const { data: finaSettings, isLoading: settingsLoading } = useFinaSettings(entity.id);
  const { data: premises, isLoading: premisesLoading } = useFinaPremises(entity.id);

  const { mutate: updateSettings, isPending } = useUpdateFinaSettings({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  // Form state for settings
  const [formData, setFormData] = useState({
    enabled: false,
    numbering_sequence: "N" as "N" | "P",
    operator_oib: "",
    operator_label: "",
    u_sust_pdv: true,
  });

  // Sync form data when settings load
  useEffect(() => {
    if (finaSettings) {
      setFormData({
        enabled: finaSettings.enabled || false,
        numbering_sequence: finaSettings.numbering_sequence || "N",
        operator_oib: finaSettings.operator_oib || "",
        operator_label: finaSettings.operator_label || "",
        u_sust_pdv: finaSettings.u_sust_pdv ?? true,
      });
    }
  }, [finaSettings]);

  // Determine completion status
  const hasCertificate = finaSettings?.has_certificate || false;
  const certificateValid = finaSettings?.certificate_status === "valid";
  const hasPremises = (premises?.length || 0) > 0;
  const hasPremiseWithDevice =
    hasPremises && premises?.some((premise: any) => premise.Devices && premise.Devices.length > 0);

  const finaEnabled = finaSettings?.enabled || false;
  const canAccessPremises = hasCertificate && certificateValid;
  const canAccessEnable = certificateValid && hasPremises && hasPremiseWithDevice;

  const steps = [
    { id: "settings" as const, title: translate("General Settings"), complete: true, unlocked: true },
    {
      id: "certificate" as const,
      title: translate("Certificate"),
      complete: hasCertificate && certificateValid,
      unlocked: true,
    },
    {
      id: "premises" as const,
      title: translate("Business Premises"),
      complete: !!hasPremiseWithDevice,
      unlocked: canAccessPremises,
    },
    {
      id: "enable" as const,
      title: translate("Enable Fiscalization"),
      complete: finaEnabled,
      unlocked: canAccessEnable,
    },
  ];

  const getDefaultStep = (): FinaStepType => {
    if (initialStep) {
      const stepInfo = steps.find((s) => s.id === initialStep);
      if (stepInfo?.unlocked) return initialStep;
    }
    if (!certificateValid) return "certificate";
    if (!hasPremiseWithDevice) return "premises";
    if (!finaEnabled) return "enable";
    return "settings";
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally run only when data loads
  useEffect(() => {
    if (!hasInitializedStep && !settingsLoading && !premisesLoading) {
      const smartStep = getDefaultStep();
      if (smartStep !== activeStep) {
        handleStepChange(smartStep);
      }
      setHasInitializedStep(true);
    }
  }, [settingsLoading, premisesLoading, hasInitializedStep]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: steps is recreated on each render but values are stable
  useEffect(() => {
    const currentStepInfo = steps.find((s) => s.id === activeStep);
    if (currentStepInfo && !currentStepInfo.unlocked) {
      const firstUnlockedStep = steps.find((s) => s.unlocked);
      if (firstUnlockedStep) {
        handleStepChange(firstUnlockedStep.id);
      }
    }
  }, [activeStep, handleStepChange]);

  if (entity.country_code !== "HR") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{translate("FINA is for Croatian Entities")}</AlertTitle>
        <AlertDescription>
          {translate("FINA fiscalization is only available for entities with country code HR")}
        </AlertDescription>
      </Alert>
    );
  }

  if (settingsLoading || premisesLoading) {
    return <PageLoadingSpinner />;
  }

  const isSandboxMode = entity.environment === "sandbox";

  const handleSaveSettings = () => {
    updateSettings({
      entityId: entity.id,
      data: formData,
    });
  };

  const wrapSection = (section: FinaSectionType, content: ReactNode) => {
    if (renderSection) {
      return renderSection(section, content);
    }
    return content;
  };

  const tabsNavigation = (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
      <Tabs value={activeStep} onValueChange={(value) => handleStepChange(value as FinaStepType)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-none p-0">
          {steps.map((step, index) => {
            const isLocked = !step.unlocked;
            let tooltipText = "";
            if (isLocked) {
              if (step.id === "premises") {
                tooltipText = translate("Upload and validate digital certificate first");
              } else if (step.id === "enable") {
                if (!certificateValid) {
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

  return (
    <div className="space-y-6">
      {isSandboxMode && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{translate("Test Mode (Sandbox)")}</AlertTitle>
            <AlertDescription>
              {translate(
                "This entity is in test mode. FINA invoices will be sent to the test environment. No real fiscalization will occur.",
              )}
            </AlertDescription>
          </Alert>
          <div className="hidden lg:block" />
        </div>
      )}

      {tabsNavigation}

      {/* Settings step */}
      {activeStep === "settings" && (
        <div className="space-y-6">
          {wrapSection(
            "numbering",
            <div className="space-y-4">
              <div>
                <Label className="font-medium text-sm">{translate("Numbering Sequence")}</Label>
                <p className="text-muted-foreground text-sm">{translate("Choose how invoice numbers are sequenced")}</p>
              </div>
              <RadioGroup
                value={formData.numbering_sequence}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, numbering_sequence: value as "N" | "P" }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="N" id="seq-n" />
                  <Label htmlFor="seq-n">{translate("Per Premise (N)")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="P" id="seq-p" />
                  <Label htmlFor="seq-p">{translate("Per Device (P)")}</Label>
                </div>
              </RadioGroup>
            </div>,
          )}

          {wrapSection(
            "operator",
            <div className="space-y-4">
              <div>
                <Label className="font-medium text-sm">{translate("PDV System")}</Label>
                <div className="mt-2 flex items-center space-x-2">
                  <Switch
                    checked={formData.u_sust_pdv}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, u_sust_pdv: checked }))}
                  />
                  <Label>{translate("Entity is registered in the Croatian PDV (VAT) system")}</Label>
                </div>
              </div>
              <div>
                <Label className="font-medium text-sm">{translate("Operator OIB")}</Label>
                <input
                  type="text"
                  value={formData.operator_oib}
                  onChange={(e) => setFormData((prev) => ({ ...prev, operator_oib: e.target.value }))}
                  placeholder={translate("OIB of the operator (11 digits, optional)")}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={11}
                />
              </div>
              <div>
                <Label className="font-medium text-sm">{translate("Operator Label")}</Label>
                <input
                  type="text"
                  value={formData.operator_label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, operator_label: e.target.value }))}
                  placeholder={translate("Descriptive label for the operator (optional)")}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>,
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
            <Button onClick={handleSaveSettings} disabled={isPending}>
              {isPending ? translate("Saving...") : translate("Save Settings")}
            </Button>
            <div className="hidden lg:block" />
          </div>
        </div>
      )}

      {/* Certificate step */}
      {activeStep === "certificate" && (
        <CertificateSettingsSection
          entity={entity}
          finaSettings={finaSettings}
          t={translate}
          onSuccess={onSuccess}
          onError={onError}
          wrapSection={wrapSection}
        />
      )}

      {/* Premises step */}
      {activeStep === "premises" && (
        <PremisesManagementSection
          entity={entity}
          premises={premises || []}
          t={translate}
          onSuccess={onSuccess}
          onError={onError}
          wrapSection={wrapSection}
        />
      )}

      {/* Enable step */}
      {activeStep === "enable" && (
        <div className="space-y-4">
          {wrapSection(
            "enable-toggle",
            <div className="space-y-4">
              <h3 className="font-medium text-sm">{translate("Setup Checklist")}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {certificateValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">{translate("Valid certificate uploaded")}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasPremises ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">{translate("At least one business premise registered")}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasPremiseWithDevice ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">{translate("At least one electronic device registered")}</span>
                </div>
              </div>

              {canAccessEnable ? (
                <div className="mt-4 flex items-center space-x-2">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({ ...prev, enabled: checked }));
                      updateSettings({
                        entityId: entity.id,
                        data: { ...formData, enabled: checked },
                      });
                    }}
                  />
                  <Label>{translate("Enable FINA Fiscalization")}</Label>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{translate("Cannot Enable Fiscalization")}</AlertTitle>
                  <AlertDescription>
                    {translate("Complete all prerequisites above before enabling FINA fiscalization.")}
                  </AlertDescription>
                </Alert>
              )}

              {finaEnabled && (
                <p className="text-green-600 text-sm">
                  {translate("Once enabled, all new B2C invoices will be automatically fiscalized with FINA")}
                </p>
              )}
            </div>,
          )}
        </div>
      )}
    </div>
  );
};
