import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity, OrderIntegration } from "@spaceinvoices/js-sdk";
import { orderIntegrations } from "@spaceinvoices/js-sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ORDER_INTEGRATIONS_CACHE_KEY } from "@/ui/components/order-integrations/order-integrations.hooks";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Form } from "@/ui/components/ui/form";
import { PageLoadingSpinner } from "@/ui/components/ui/loading-spinner";
import { updateFursSettingsSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { type FiscalizationStepConfig, useFiscalizationStepFlow } from "../shared/fiscalization-step-flow";
import { FiscalizationStepTabs } from "../shared/fiscalization-step-tabs";
import { FursOperatorRequiredDialog } from "./furs-operator-required-dialog";
import { useFursPremises, useFursSettings, useUpdateFursSettings, useUserFursSettings } from "./furs-settings.hooks";
// Import locale files
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";
import { CertificateSettingsSection } from "./sections/certificate-settings-section";
import { EnableFiscalizationSection } from "./sections/enable-fiscalization-section";
import { GeneralSettingsSection } from "./sections/general-settings-section";
import { PremisesManagementSection } from "./sections/premises-management-section";

const translations = { bg, cs, de, en, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

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
  /**
   * Hide user-specific operator section (for embed/API key contexts without user session).
   * When true, the "Advanced Settings" entity-level operator fields are auto-expanded instead.
   */
  hideUserOperatorSection?: boolean;
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
  translationLocale,
  initialStep = "settings",
  onStepChange,
  renderSection,
  hideUserOperatorSection,
}) => {
  const queryClient = useQueryClient();
  // Create a guaranteed translation function using the createTranslation utility
  const translate = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  // Fetch FURS settings and premises
  const { data: fursSettings, isLoading: settingsLoading } = useFursSettings(entity.id);
  const { data: premises, isLoading: premisesLoading } = useFursPremises(entity.id);
  const { data: userFursSettings } = useUserFursSettings(entity.id, {
    enabled: !hideUserOperatorSection,
  });
  const { data: integrationResponse, isLoading: integrationsLoading } = useQuery({
    queryKey: [ORDER_INTEGRATIONS_CACHE_KEY, entity.id, "furs-settings-form"],
    queryFn: async () =>
      orderIntegrations.list({
        entity_id: entity.id,
        limit: 100,
        order_by: "name",
      }),
    enabled: !!entity.id,
    staleTime: 0,
  });
  const integrations = (integrationResponse?.data ?? []) as OrderIntegration[];
  const integrationIds = useMemo(() => integrations.map((integration) => integration.id), [integrations]);
  const hasOrderIntegrations = integrationIds.length > 0;
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [pendingSettingsData, setPendingSettingsData] = useState<FursSettingsFormSchema | null>(null);
  const [selectedPremiseId, setSelectedPremiseId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isBulkUpdatingIntegrations, setIsBulkUpdatingIntegrations] = useState(false);

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
      default_skip_fiscalization: fursSettings?.default_skip_fiscalization || false,
      numbering_strategy: fursSettings?.numbering_strategy || "C",
      operator_tax_number: fursSettings?.operator_tax_number || "",
      operator_label: fursSettings?.operator_label || "",
    },
  });

  // Register with form footer for sticky save button
  useFormFooterRegistration({
    formId: "furs-settings-form",
    isPending: isPending || isBulkUpdatingIntegrations,
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
  const remediationPremises = useMemo(() => {
    return ((premises || []) as any[])
      .filter((premise) => premise.is_active)
      .map((premise) => ({
        value: premise.id,
        label: premise.business_premise_name,
        devices: (premise.Devices || [])
          .filter((device: any) => device.is_active && device.electronic_device_name !== "OLD")
          .map((device: any) => ({
            value: device.id,
            label: device.electronic_device_name,
          })),
      }))
      .filter((premise) => premise.devices.length > 0);
  }, [premises]);
  const premiseOptions = useMemo(
    () => remediationPremises.map(({ value, label }) => ({ value, label })),
    [remediationPremises],
  );
  const deviceOptions = useMemo(
    () => remediationPremises.find((premise) => premise.value === selectedPremiseId)?.devices ?? [],
    [remediationPremises, selectedPremiseId],
  );
  const firstPremise = remediationPremises[0];
  const firstDevice = firstPremise?.devices[0];

  useEffect(() => {
    if (!remediationDialogOpen) return;
    if (!selectedPremiseId && firstPremise) {
      setSelectedPremiseId(firstPremise.value);
      setSelectedDeviceId(firstPremise.devices[0]?.value || "");
      return;
    }

    const selectedPremise = remediationPremises.find((premise) => premise.value === selectedPremiseId);
    if (!selectedPremise && firstPremise) {
      setSelectedPremiseId(firstPremise.value);
      setSelectedDeviceId(firstPremise.devices[0]?.value || "");
      return;
    }

    if (
      selectedPremise &&
      !selectedPremise.devices.some((device: { value: string }) => device.value === selectedDeviceId)
    ) {
      setSelectedDeviceId(selectedPremise.devices[0]?.value || "");
    }
  }, [firstPremise, remediationDialogOpen, remediationPremises, selectedDeviceId, selectedPremiseId]);

  const steps: FiscalizationStepConfig<StepType>[] = [
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
      complete: Boolean(hasPremiseWithDevice),
      unlocked: Boolean(canAccessPremises),
    },
    {
      id: "enable" as const,
      title: translate("Enable Fiscalization"),
      complete: Boolean(fursEnabled),
      unlocked: Boolean(canAccessEnable),
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

  const { activeStep, handleStepChange } = useFiscalizationStepFlow({
    initialStep,
    isReady: !settingsLoading && !premisesLoading,
    steps,
    getDefaultStep,
    onStepChange,
  });

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

  const replayPendingSettingsUpdate = (data: FursSettingsFormSchema) => {
    updateSettings({
      entityId: entity.id,
      data,
    });
  };

  const requiresIntegrationRemediation = (data: FursSettingsFormSchema) => {
    return (
      !fursEnabled &&
      data.enabled === true &&
      hasOrderIntegrations &&
      !(data.operator_tax_number?.trim() && data.operator_label?.trim())
    );
  };

  const attemptSaveFursSettings = (data: FursSettingsFormSchema) => {
    if (requiresIntegrationRemediation(data)) {
      setPendingSettingsData(data);
      setSelectedPremiseId(firstPremise?.value || "");
      setSelectedDeviceId(firstDevice?.value || "");
      setRemediationDialogOpen(true);
      return;
    }

    replayPendingSettingsUpdate(data);
  };

  const applyIntegrationDefaults = async (savedValues: { operator_tax_number: string; operator_label: string }) => {
    if (!selectedPremiseId || !selectedDeviceId) return;

    setIsBulkUpdatingIntegrations(true);

    try {
      for (const integrationId of integrationIds) {
        await orderIntegrations.update(
          integrationId,
          {
            business_premise_id: selectedPremiseId,
            electronic_device_id: selectedDeviceId,
          },
          { entity_id: entity.id },
        );
      }

      await queryClient.invalidateQueries({ queryKey: [ORDER_INTEGRATIONS_CACHE_KEY] });

      const nextData = pendingSettingsData;
      setPendingSettingsData(null);
      setRemediationDialogOpen(false);

      if (nextData) {
        replayPendingSettingsUpdate({
          ...nextData,
          operator_tax_number: savedValues.operator_tax_number,
          operator_label: savedValues.operator_label,
        });
      }
    } catch (error) {
      toast.error(translate("Failed to update one or more integrations"), {
        description: translate("Operator defaults saved, but integrations were not fully updated"),
      });
      onError?.(error);
    } finally {
      setIsBulkUpdatingIntegrations(false);
    }
  };

  if (settingsLoading || premisesLoading || integrationsLoading) {
    return <PageLoadingSpinner />;
  }

  // Check if entity is in sandbox (test) mode
  const isSandboxMode = entity.environment === "sandbox";

  const getStepTooltipText = (step: (typeof steps)[number]) => {
    if (step.id === "certificate") {
      if (!hasEntityTaxNumber) {
        return translate("Set entity tax number in General Settings first");
      }
      return translate("Set operator tax number and label in General Settings first");
    }

    if (step.id === "premises") {
      if (!hasEntityTaxNumber) {
        return translate("Set entity tax number in General Settings first");
      }
      if (!hasOperatorSettings) {
        return translate("Set operator tax number and label in General Settings first");
      }
      return translate("Upload and validate digital certificate first");
    }

    if (step.id === "enable") {
      if (!hasEntityTaxNumber || !hasOperatorSettings) {
        return translate("Complete General Settings first");
      }
      if (!certificateValid) {
        return translate("Upload and validate digital certificate first");
      }
      if (!hasPremises) {
        return translate("Register at least one business premise first");
      }
      return translate("Register at least one electronic device first");
    }

    return "";
  };

  // Helper to wrap section content with render prop if provided
  const wrapSection = (section: SectionType, content: ReactNode) => {
    if (renderSection) {
      return renderSection(section, content);
    }
    return content;
  };

  return (
    <Form {...form}>
      <form id="furs-settings-form" onSubmit={form.handleSubmit(attemptSaveFursSettings)} className="space-y-6">
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
        <FiscalizationStepTabs
          activeStep={activeStep}
          steps={steps}
          onStepChange={handleStepChange}
          getTooltipText={getStepTooltipText}
          testIdPrefix="furs-tab"
        />

        {/* Step content - each section wrapped with its own help */}
        {activeStep === "settings" && (
          <GeneralSettingsSection
            form={form}
            entity={entity}
            t={translate}
            onSuccess={onSuccess}
            onError={onError}
            wrapSection={wrapSection}
            hideUserOperatorSection={hideUserOperatorSection}
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
            entityId={entity.id}
            form={form}
            fursSettings={fursSettings}
            premises={(premises || []) as any}
            t={translate}
            wrapSection={wrapSection}
          />
        )}
      </form>
      <FursOperatorRequiredDialog
        open={remediationDialogOpen}
        onOpenChange={(open) => {
          setRemediationDialogOpen(open);
          if (!open) {
            setPendingSettingsData(null);
          }
        }}
        entityId={entity.id}
        onSaved={applyIntegrationDefaults}
        t={translate}
        saveScope="entity"
        mode="integration-remediation"
        titleOverride={translate("FURS Integration Defaults Required")}
        descriptionOverride={translate(
          "You have store integrations that need this information when fiscalization is enabled so fiscalized documents can be issued correctly. Please add the default operator, business premise, and device to use for those integrations.",
        )}
        initialValues={{
          operator_tax_number: fursSettings?.operator_tax_number || userFursSettings?.operator_tax_number || "",
          operator_label: fursSettings?.operator_label || userFursSettings?.operator_label || "",
        }}
        premiseOptions={premiseOptions}
        deviceOptions={deviceOptions}
        selectedPremiseId={selectedPremiseId}
        selectedDeviceId={selectedDeviceId}
        onPremiseChange={setSelectedPremiseId}
        onDeviceChange={setSelectedDeviceId}
      />
    </Form>
  );
};
