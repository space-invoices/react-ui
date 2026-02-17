import { AlertCircle, AlertTriangle, Building2, CheckCircle2, ChevronRight, Info, User } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect, useState } from "react";
import { useUpdateEntity } from "@/ui/components/entities/entities.hooks";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { PageLoadingSpinner } from "@/ui/components/ui/loading-spinner";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import { Separator } from "@/ui/components/ui/separator";
import { Switch } from "@/ui/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import {
  useFinaPremises,
  useFinaSettings,
  useUpdateFinaSettings,
  useUpdateUserFinaSettings,
  useUserFinaSettings,
} from "./fina-settings.hooks";
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
export type FinaSectionType =
  | "entity-info"
  | "operator"
  | "numbering"
  | "certificate-upload"
  | "premises-list"
  | "enable-toggle"
  | "user-operator"
  | "advanced";

interface FinaSettingsFormProps extends ComponentTranslationProps {
  entity: any;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  initialStep?: FinaStepType;
  onStepChange?: (step: FinaStepType) => void;
  renderSection?: (section: FinaSectionType, content: ReactNode) => ReactNode;
  /**
   * Hide user-specific operator section (for embed/API key contexts without user session).
   * When true, the "Advanced Settings" entity-level operator fields are auto-expanded instead.
   */
  hideUserOperatorSection?: boolean;
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
  hideUserOperatorSection,
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

  // Entity info state
  const [entityTaxNumber, setEntityTaxNumber] = useState("");
  const [entityAddress, setEntityAddress] = useState("");
  const [entityCity, setEntityCity] = useState("");
  const [entityPostCode, setEntityPostCode] = useState("");

  useEffect(() => {
    setEntityTaxNumber(entity.tax_number || "");
    setEntityAddress(entity.address || "");
    setEntityCity(entity.city || "");
    setEntityPostCode(entity.post_code || "");
  }, [entity.tax_number, entity.address, entity.city, entity.post_code]);

  const { mutate: updateEntity, isPending: isEntityUpdatePending } = useUpdateEntity({
    onSuccess: () => onSuccess?.(),
    onError: (error) => onError?.(error),
  });

  const handleSaveEntityInfo = () => {
    updateEntity({
      id: entity.id,
      data: {
        tax_number: entityTaxNumber || null,
        address: entityAddress || null,
        city: entityCity || null,
        post_code: entityPostCode || null,
      },
    });
  };

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

  // User FINA operator settings (per-user, stored in user.settings)
  const { data: userFinaSettings, isLoading: userSettingsLoading } = useUserFinaSettings(entity.id, {
    enabled: !hideUserOperatorSection,
  });
  const [userOperatorOib, setUserOperatorOib] = useState("");
  const [userOperatorLabel, setUserOperatorLabel] = useState("");

  useEffect(() => {
    if (userFinaSettings) {
      setUserOperatorOib(userFinaSettings.operator_oib || "");
      setUserOperatorLabel(userFinaSettings.operator_label || "");
    }
  }, [userFinaSettings]);

  const { mutate: updateUserSettings, isPending: isUserSettingsPending } = useUpdateUserFinaSettings({
    onSuccess: () => onSuccess?.(),
    onError: (error) => onError?.(error),
  });

  const handleSaveUserSettings = () => {
    if (userOperatorOibError) return;
    updateUserSettings({
      entityId: entity.id,
      data: {
        operator_oib: userOperatorOib || undefined,
        operator_label: userOperatorLabel || undefined,
      },
    });
  };

  // Form state for entity-level settings (API default)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(!!hideUserOperatorSection);
  const [formData, setFormData] = useState({
    enabled: false,
    numbering_sequence: "P" as "N" | "P",
    operator_oib: "",
    operator_label: "",
    u_sust_pdv: true,
  });

  // Sync form data when settings load
  useEffect(() => {
    if (finaSettings) {
      setFormData({
        enabled: finaSettings.enabled || false,
        numbering_sequence: finaSettings.numbering_sequence || "P",
        operator_oib: finaSettings.operator_oib || "",
        operator_label: finaSettings.operator_label || "",
        u_sust_pdv: finaSettings.u_sust_pdv ?? true,
      });
    }
  }, [finaSettings]);

  // Determine completion status
  const hasEntityTaxNumber = !!entity.tax_number;
  // Operator OIB is required by CIS protocol (minOccurs="1" in FiskalizacijaSchema.xsd)
  // Can come from user settings or entity-level FINA settings
  const hasOperatorSettings =
    (!!userFinaSettings?.operator_oib && !!userFinaSettings?.operator_label) ||
    (!!finaSettings?.operator_oib && !!finaSettings?.operator_label);
  const hasCertificate = finaSettings?.has_certificate || false;
  const certificateValid = finaSettings?.certificate_status === "valid";
  const hasPremises = (premises?.length || 0) > 0;
  const hasPremiseWithDevice =
    hasPremises && premises?.some((premise: any) => premise.Devices && premise.Devices.length > 0);

  const finaEnabled = finaSettings?.enabled || false;
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

  const userOperatorOibError =
    userOperatorOib !== "" && !/^\d{11}$/.test(userOperatorOib) ? translate("OIB must be exactly 11 digits") : "";

  const operatorOibError =
    formData.operator_oib !== "" && !/^\d{11}$/.test(formData.operator_oib)
      ? translate("OIB must be exactly 11 digits")
      : "";

  const handleSaveSettings = () => {
    if (operatorOibError) return;
    updateSettings({
      entityId: entity.id,
      data: {
        ...formData,
        operator_oib: formData.operator_oib || undefined,
        operator_label: formData.operator_label || undefined,
      },
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
              if (step.id === "certificate") {
                if (!hasEntityTaxNumber) {
                  tooltipText = translate("Set entity OIB in General Settings first");
                } else {
                  tooltipText = translate("Set operator OIB and label in General Settings first");
                }
              } else if (step.id === "premises") {
                if (!hasEntityTaxNumber) {
                  tooltipText = translate("Set entity OIB in General Settings first");
                } else if (!hasOperatorSettings) {
                  tooltipText = translate("Set operator OIB and label in General Settings first");
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
            "entity-info",
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{translate("Entity Information")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {translate("Required company details for FINA fiscalization")}
                  </p>
                </div>
              </div>

              {!entity.tax_number && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{translate("Entity OIB is required for FINA fiscalization")}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="entity-tax-number" className="font-medium text-sm">
                    {translate("Entity OIB")}
                  </label>
                  <Input
                    id="entity-tax-number"
                    placeholder="12345678901"
                    value={entityTaxNumber}
                    onChange={(e) => setEntityTaxNumber(e.target.value)}
                    className={cn("mt-2 h-10", !entity.tax_number && "border-destructive")}
                    maxLength={11}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
                    {translate("Your company's OIB (must match FINA certificate)")}
                  </p>
                </div>

                <div>
                  <label htmlFor="entity-address" className="font-medium text-sm">
                    {translate("Address")}
                  </label>
                  <Input
                    id="entity-address"
                    value={entityAddress}
                    onChange={(e) => setEntityAddress(e.target.value)}
                    className="mt-2 h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="entity-post-code" className="font-medium text-sm">
                      {translate("Post Code")}
                    </label>
                    <Input
                      id="entity-post-code"
                      value={entityPostCode}
                      onChange={(e) => setEntityPostCode(e.target.value)}
                      className="mt-2 h-10"
                    />
                  </div>
                  <div>
                    <label htmlFor="entity-city" className="font-medium text-sm">
                      {translate("City")}
                    </label>
                    <Input
                      id="entity-city"
                      value={entityCity}
                      onChange={(e) => setEntityCity(e.target.value)}
                      className="mt-2 h-10"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveEntityInfo}
                  disabled={isEntityUpdatePending}
                  className="cursor-pointer"
                >
                  {isEntityUpdatePending ? translate("Saving...") : translate("Save Entity Info")}
                </Button>
              </div>
            </div>,
          )}

          <Separator />

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
                  <RadioGroupItem value="P" id="seq-p" />
                  <Label htmlFor="seq-p">{translate("Per Premise (P)")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="N" id="seq-n" />
                  <Label htmlFor="seq-n">{translate("Per Device (N)")}</Label>
                </div>
              </RadioGroup>
            </div>,
          )}

          <Separator />

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
            </div>,
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
            <Button onClick={handleSaveSettings} disabled={isPending || !!operatorOibError}>
              {isPending ? translate("Saving...") : translate("Save Settings")}
            </Button>
            <div className="hidden lg:block" />
          </div>

          <Separator />

          {/* Per-user operator settings (hidden in embed/API key mode) */}
          {!hideUserOperatorSection && (
            <>
              {wrapSection(
                "user-operator",
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{translate("Your Operator Settings")}</h3>
                      <p className="text-muted-foreground text-sm">
                        {translate("Your personal operator info for FINA invoices")}
                      </p>
                    </div>
                  </div>

                  {(!userFinaSettings?.operator_oib || !userFinaSettings?.operator_label) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {translate("Operator OIB and label are required for FINA fiscalization")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label className="font-medium text-sm">{translate("Operator OIB")}</Label>
                      <Input
                        type="text"
                        value={userOperatorOib}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setUserOperatorOib(val);
                        }}
                        placeholder={translate("OIB of the operator (11 digits)")}
                        className={cn("mt-1", userOperatorOibError && "border-destructive")}
                        maxLength={11}
                        disabled={userSettingsLoading}
                      />
                      {userOperatorOibError && <p className="mt-1 text-destructive text-xs">{userOperatorOibError}</p>}
                    </div>
                    <div>
                      <Label className="font-medium text-sm">{translate("Operator Label")}</Label>
                      <Input
                        type="text"
                        value={userOperatorLabel}
                        onChange={(e) => setUserOperatorLabel(e.target.value)}
                        placeholder={translate("e.g. Cashier 1")}
                        className="mt-1"
                        disabled={userSettingsLoading}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveUserSettings}
                      disabled={isUserSettingsPending || userSettingsLoading || !!userOperatorOibError}
                      className="cursor-pointer"
                    >
                      {isUserSettingsPending ? translate("Saving...") : translate("Save Operator Settings")}
                    </Button>
                  </div>
                </div>,
              )}

              <Separator />
            </>
          )}

          {/* API Default Operator (advanced/entity-level) */}
          {wrapSection(
            "advanced",
            <div>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="flex w-full items-center gap-2 py-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isAdvancedOpen && "rotate-90")} />
                <span className="font-medium text-sm">{translate("Advanced Settings")}</span>
              </button>
              {isAdvancedOpen && (
                <div className="pt-4">
                  <div className="space-y-4 rounded-lg border p-4">
                    <div>
                      <h4 className="font-medium text-sm">{translate("API Default Operator")}</h4>
                      <p className="text-muted-foreground text-xs">
                        {translate("Default operator settings for API key usage (when no user context)")}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{translate("Operator OIB")}</Label>
                        <Input
                          type="text"
                          value={formData.operator_oib}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setFormData((prev) => ({ ...prev, operator_oib: val }));
                          }}
                          placeholder={translate("OIB of the operator (11 digits)")}
                          className={cn("mt-1", operatorOibError && "border-destructive")}
                          maxLength={11}
                        />
                        {operatorOibError && <p className="mt-1 text-destructive text-xs">{operatorOibError}</p>}
                        <p className="mt-1 text-muted-foreground text-xs">
                          {translate("OIB for API key usage (optional)")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm">{translate("Operator Label")}</Label>
                        <Input
                          type="text"
                          value={formData.operator_label}
                          onChange={(e) => setFormData((prev) => ({ ...prev, operator_label: e.target.value }))}
                          placeholder="API Default"
                          className="mt-1"
                        />
                        <p className="mt-1 text-muted-foreground text-xs">
                          {translate("Operator label for API key usage (optional)")}
                        </p>
                      </div>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={isPending || !!operatorOibError} size="sm">
                      {isPending ? translate("Saving...") : translate("Save Settings")}
                    </Button>
                  </div>
                </div>
              )}
            </div>,
          )}
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
                        data: checked
                          ? {
                              ...formData,
                              enabled: true,
                              operator_oib: formData.operator_oib || undefined,
                              operator_label: formData.operator_label || undefined,
                            }
                          : { enabled: false },
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
