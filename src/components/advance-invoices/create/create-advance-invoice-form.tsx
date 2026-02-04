import { zodResolver } from "@hookform/resolvers/zod";
import type { AdvanceInvoice, CreateAdvanceInvoiceRequest } from "@spaceinvoices/js-sdk";
import { AlertCircle, Check, FileCode2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Form } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { CreateAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { createAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { useViesCheck } from "@/ui/hooks/use-vies-check";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { DocumentDetailsSection, DocumentNoteField } from "../../documents/create/document-details-section";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import { useDocumentCustomerForm } from "../../documents/create/use-document-customer-form";
import type { DocumentTypes } from "../../documents/types";
import { useFursPremises, useFursSettings } from "../../entities/furs-settings-form/furs-settings.hooks";
import { getEntityErrors, getFormFieldErrors, validateEslogForm } from "../../invoices/create/eslog-validation";
import { getLastUsedFursCombo, setLastUsedFursCombo, useCreateAdvanceInvoice } from "../advance-invoices.hooks";
import de from "./locales/de";
import sl from "./locales/sl";
import { prepareAdvanceInvoiceSubmission } from "./prepare-advance-invoice-submission";

const translations = {
  sl,
  de,
} as const;

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateAdvanceInvoiceFormValues = CreateAdvanceInvoiceSchema & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type AdvanceInvoicePreviewPayload = Partial<CreateAdvanceInvoiceRequest> & { number?: string };

type CreateAdvanceInvoiceFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: AdvanceInvoice) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: AdvanceInvoicePreviewPayload) => void;
  onAddNewTax?: () => void;
  onHeaderActionChange?: (action: ReactNode) => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateAdvanceInvoiceRequest>;
} & ComponentTranslationProps;

export default function CreateAdvanceInvoiceForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onHeaderActionChange,
  initialValues,
  t: translateProp,
  namespace,
  locale,
}: CreateAdvanceInvoiceFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const { activeEntity } = useEntities();

  // Get default note from entity settings (use invoice defaults)
  // Note: Advance invoices don't have payment terms - they are documents requesting payment
  const defaultNote = (activeEntity?.settings as any)?.default_invoice_note || "";

  // ============================================================================
  // FURS Settings & Premises
  // ============================================================================
  const { data: fursSettings, isLoading: isFursSettingsLoading } = useFursSettings(entityId);
  const { data: fursPremises, isLoading: isFursPremisesLoading } = useFursPremises(entityId, {
    enabled: fursSettings?.enabled === true,
  });

  // Loading state for FURS - don't render form until we know if FURS is active
  const isFursLoading = isFursSettingsLoading || (fursSettings?.enabled && isFursPremisesLoading);

  // Check if FURS is enabled and has active premises
  const isFursEnabled = fursSettings?.enabled === true;
  const activePremises = useMemo(() => fursPremises?.filter((p) => p.is_active) || [], [fursPremises]);
  const hasFursPremises = activePremises.length > 0;

  // FURS premise/device selection state
  const [selectedPremiseName, setSelectedPremiseName] = useState<string | undefined>();
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | undefined>();
  const [skipFiscalization, setSkipFiscalization] = useState(false);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentType, setPaymentType] = useState("bank_transfer");
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Price modes per item (gross vs net) - collected from component state at submit
  const initialPriceModes = useMemo(() => {
    if (!initialValues?.items) return {};
    return initialValues.items.reduce((acc, item, index) => {
      acc[index] = item.gross_price != null;
      return acc;
    }, {} as PriceModesMap);
  }, [initialValues?.items]);
  const priceModesRef = useRef<PriceModesMap>(initialPriceModes);

  // ============================================================================
  // e-SLOG Settings (Slovenian e-Invoice)
  // ============================================================================
  const isSlovenianEntity = activeEntity?.country_code === "SI";
  const entityEslogEnabled = !!(activeEntity?.settings as any)?.eslog_validation_enabled;
  const isEslogAvailable = isSlovenianEntity && entityEslogEnabled;

  // e-SLOG validation state - defaults to entity setting
  const [eslogValidationEnabled, setEslogValidationEnabled] = useState<boolean | undefined>(undefined);
  // e-SLOG entity-level errors (require settings update, can't be fixed in form)
  const [eslogEntityErrors, setEslogEntityErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Initialize e-SLOG state from entity settings
  useEffect(() => {
    if (isEslogAvailable && eslogValidationEnabled === undefined) {
      setEslogValidationEnabled(true);
    }
  }, [isEslogAvailable, eslogValidationEnabled]);

  // Clear entity errors when eslog validation is disabled
  useEffect(() => {
    if (!eslogValidationEnabled) {
      setEslogEntityErrors([]);
    }
  }, [eslogValidationEnabled]);

  // Get active devices for selected premise
  const activeDevices = useMemo(() => {
    if (!selectedPremiseName) return [];
    const premise = activePremises.find((p) => p.business_premise_name === selectedPremiseName);
    return premise?.Devices?.filter((d) => d.is_active) || [];
  }, [activePremises, selectedPremiseName]);

  // Initialize FURS selection from localStorage or first active combo
  useEffect(() => {
    if (!isFursEnabled || !hasFursPremises || selectedPremiseName) return;

    const lastUsed = getLastUsedFursCombo(entityId);
    if (lastUsed) {
      // Verify the last-used combo is still valid (premise/device still exist and active)
      const premise = activePremises.find((p) => p.business_premise_name === lastUsed.business_premise_name);
      const device = premise?.Devices?.find(
        (d) => d.electronic_device_name === lastUsed.electronic_device_name && d.is_active,
      );
      if (premise && device) {
        setSelectedPremiseName(lastUsed.business_premise_name);
        setSelectedDeviceName(lastUsed.electronic_device_name);
        return;
      }
    }

    // Fall back to first active premise/device
    const firstPremise = activePremises[0];
    const firstDevice = firstPremise?.Devices?.find((d) => d.is_active);
    if (firstPremise && firstDevice) {
      setSelectedPremiseName(firstPremise.business_premise_name);
      setSelectedDeviceName(firstDevice.electronic_device_name);
    }
  }, [isFursEnabled, hasFursPremises, activePremises, entityId, selectedPremiseName]);

  // When premise changes, select first active device
  useEffect(() => {
    if (!selectedPremiseName) return;
    const premise = activePremises.find((p) => p.business_premise_name === selectedPremiseName);
    const firstDevice = premise?.Devices?.find((d) => d.is_active);
    if (firstDevice && selectedDeviceName !== firstDevice.electronic_device_name) {
      // Only update if the current device is not in this premise
      const currentDeviceInPremise = premise?.Devices?.find(
        (d) => d.electronic_device_name === selectedDeviceName && d.is_active,
      );
      if (!currentDeviceInPremise) {
        setSelectedDeviceName(firstDevice.electronic_device_name);
      }
    }
  }, [selectedPremiseName, activePremises, selectedDeviceName]);

  const form = useForm<CreateAdvanceInvoiceFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createAdvanceInvoiceSchema) as Resolver<CreateAdvanceInvoiceFormValues>,
    defaultValues: {
      number: "", // Will be set by useNextAdvanceInvoiceNumber
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateAdvanceInvoiceFormValues["customer"]) ?? undefined,
      items: initialValues?.items?.length
        ? initialValues.items.map((item) => ({
            name: item.name || "",
            description: item.description || "",
            quantity: item.quantity ?? 1,
            // Use gross_price if set, otherwise use price
            price: item.gross_price ?? item.price,
            taxes: item.taxes || [],
          }))
        : [
            {
              name: "",
              description: "",
              quantity: 1,
              price: undefined,
              taxes: [],
            },
          ],
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      note: initialValues?.note ?? defaultNote,
    },
  });

  // Skip fiscalization is only allowed for bank transfers or unpaid invoices
  const canSkipFiscalization = !markAsPaid || paymentType === "bank_transfer";

  // Auto-disable skip when it becomes invalid (e.g., user changes payment type to cash)
  useEffect(() => {
    if (!canSkipFiscalization && skipFiscalization) {
      setSkipFiscalization(false);
    }
  }, [canSkipFiscalization, skipFiscalization]);

  // Check if FURS selection is ready (needed to prevent number flashing)
  const isFursSelectionReady = !isFursEnabled || !hasFursPremises || (!!selectedPremiseName && !!selectedDeviceName);

  // FURS is "active" for this advance invoice if enabled and we have a valid selection (and not skipped)
  const isFursActive =
    isFursEnabled && hasFursPremises && selectedPremiseName && selectedDeviceName && !skipFiscalization;

  // ============================================================================
  // Next Advance Invoice Number Preview
  // ============================================================================
  const { data: nextNumberData, isLoading: isNextNumberLoading } = useNextDocumentNumber(entityId, "advance_invoice", {
    businessPremiseName: isFursActive ? selectedPremiseName : undefined,
    electronicDeviceName: isFursActive ? selectedDeviceName : undefined,
    enabled: !!entityId && !isFursLoading && isFursSelectionReady,
  });

  // Overall loading state
  const isFormDataLoading = isFursLoading || !isFursSelectionReady || isNextNumberLoading;

  // Update header action with FURS and e-SLOG toggle buttons
  useEffect(() => {
    if (!onHeaderActionChange) return;

    if (isFursLoading) {
      onHeaderActionChange(null);
      return;
    }

    const showFursToggle = isFursEnabled && hasFursPremises;
    const showEslogToggle = isEslogAvailable;

    if (showFursToggle || showEslogToggle) {
      const isFursChecked = !skipFiscalization;
      const isEslogChecked = eslogValidationEnabled === true;

      onHeaderActionChange(
        <div className="flex items-center gap-2">
          {/* e-SLOG toggle */}
          {showEslogToggle && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isEslogChecked ? "outline" : "ghost"}
                    size="sm"
                    className={cn("h-8 cursor-pointer gap-2", !isEslogChecked && "text-muted-foreground")}
                    onClick={() => setEslogValidationEnabled(!eslogValidationEnabled)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        isEslogChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground bg-background text-muted-foreground",
                      )}
                    >
                      {isEslogChecked ? <Check className="size-3" /> : <FileCode2 className="size-3" />}
                    </div>
                    <span>{t("e-SLOG")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {isEslogChecked
                    ? t("Click to skip e-SLOG validation for this advance invoice")
                    : t("Click to enable e-SLOG validation")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* FURS toggle */}
          {showFursToggle && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isFursChecked ? "outline" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 cursor-pointer gap-2",
                      !canSkipFiscalization && "cursor-not-allowed opacity-50",
                      !isFursChecked && "text-destructive hover:text-destructive",
                    )}
                    onClick={() => canSkipFiscalization && setSkipFiscalization(!skipFiscalization)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        isFursChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-destructive bg-destructive text-destructive-foreground",
                      )}
                    >
                      {isFursChecked ? <Check className="size-3" /> : <X className="size-3" />}
                    </div>
                    <span>{t("Fiscally verify")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {canSkipFiscalization
                    ? isFursChecked
                      ? t("Click to skip fiscalization for this advance invoice")
                      : t("Click to enable fiscalization")
                    : t("Cannot skip fiscalization for cash payments")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>,
      );
    } else {
      onHeaderActionChange(null);
    }
  }, [
    isFursLoading,
    isFursEnabled,
    hasFursPremises,
    skipFiscalization,
    canSkipFiscalization,
    isEslogAvailable,
    eslogValidationEnabled,
    onHeaderActionChange,
    t,
  ]);

  // Pre-fill advance invoice number from preview
  useEffect(() => {
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form]);

  const formValues = useWatch({
    control: form.control,
  });

  // ============================================================================
  // VIES Check - determine if reverse charge applies
  // ============================================================================
  const { reverseChargeApplies, warning: viesWarning } = useViesCheck({
    issuerCountryCode: activeEntity?.country_code,
    isTaxSubject: activeEntity?.is_tax_subject ?? true,
    customerCountry: formValues.customer?.country,
    customerCountryCode: formValues.customer?.country_code,
    customerTaxNumber: formValues.customer?.tax_number,
    enabled: !!activeEntity,
  });

  // Customer form management
  const {
    originalCustomer,
    showCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    initialCustomerName,
    handleCustomerSelect,
    handleCustomerClear,
  } = useDocumentCustomerForm(form as any);

  const { mutate: createAdvanceInvoice, isPending } = useCreateAdvanceInvoice({
    entityId,
    onSuccess: (data) => {
      // Save FURS combo to localStorage on successful creation
      if (isFursActive && selectedPremiseName && selectedDeviceName) {
        setLastUsedFursCombo(entityId, {
          business_premise_name: selectedPremiseName,
          electronic_device_name: selectedDeviceName,
        });
      }
      onSuccess?.(data);
    },
    onError,
  });

  // Shared submit logic for both regular save and save as draft
  const submitAdvanceInvoice = useCallback(
    (values: CreateAdvanceInvoiceFormValues, isDraft: boolean) => {
      // Skip e-SLOG and FURS validation for drafts
      if (!isDraft && eslogValidationEnabled) {
        const validationErrors = validateEslogForm(values, activeEntity);

        if (validationErrors.length > 0) {
          const entityErrors = getEntityErrors(validationErrors);
          const formErrors = getFormFieldErrors(validationErrors);
          setEslogEntityErrors(entityErrors);
          for (const error of formErrors) {
            form.setError(error.field as any, {
              type: "eslog",
              message: error.message,
            });
          }
          return;
        }
        setEslogEntityErrors([]);
      }

      // Build FURS options (skip for drafts)
      const fursOptions =
        !isDraft && isFursEnabled
          ? skipFiscalization
            ? { skip: true }
            : selectedPremiseName && selectedDeviceName
              ? { business_premise_name: selectedPremiseName, electronic_device_name: selectedDeviceName }
              : undefined
          : undefined;

      // Build e-SLOG options (skip for drafts)
      const eslogOptions =
        !isDraft && isEslogAvailable ? { validation_enabled: eslogValidationEnabled === true } : undefined;

      const payload = prepareAdvanceInvoiceSubmission(values, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft ? false : markAsPaid,
        paymentType,
        furs: fursOptions,
        eslog: eslogOptions,
        priceModes: priceModesRef.current,
        isDraft,
      });

      createAdvanceInvoice(payload);
    },
    [
      activeEntity,
      createAdvanceInvoice,
      eslogValidationEnabled,
      form,
      isEslogAvailable,
      isFursEnabled,
      markAsPaid,
      originalCustomer,
      paymentType,
      selectedDeviceName,
      selectedPremiseName,
      showCustomerForm,
      skipFiscalization,
    ],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitAdvanceInvoice(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitAdvanceInvoice]);

  useFormFooterRegistration({
    formId: "create-advance-invoice-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save"),
    secondaryAction: {
      label: t("Save as Draft"),
      onClick: handleSaveAsDraft,
      isPending: isDraftPending,
    },
  });

  // Set default note from entity settings (advance invoices don't have payment terms)
  useEffect(() => {
    const entityDefaultNote = (activeEntity?.settings as any)?.default_invoice_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
  }, [activeEntity, form]);

  // Auto-add tax field for tax subject entities
  useEffect(() => {
    if (activeEntity?.is_tax_subject) {
      const items = form.getValues("items") || [];
      if (items.length > 0 && (!items[0].taxes || items[0].taxes.length === 0)) {
        form.setValue("items.0.taxes", [{ tax_id: undefined }]);
      }
    }
  }, [activeEntity?.is_tax_subject, form]);

  useEffect(() => {
    if (onChange) {
      const currentItems = form.getValues("items") || [];

      // Transform items to use gross_price when price mode is gross
      const transformedItems = currentItems.map((item: any, index: number) => {
        const { price, ...rest } = item;
        const isGross = priceModesRef.current[index] ?? false;
        if (isGross) {
          return { ...rest, gross_price: price };
        }
        return { ...rest, price };
      });

      const payload: AdvanceInvoicePreviewPayload = {
        number: formValues.number,
        date: formValues.date,
        customer_id: formValues.customer_id,
        customer: formValues.customer,
        items: transformedItems,
        currency_code: formValues.currency_code,
        note: formValues.note,
      };
      onChange(payload);
    }
  }, [formValues, onChange, form]);

  const onSubmit = (values: CreateAdvanceInvoiceFormValues) => {
    submitAdvanceInvoice(values, false);
  };

  // Show skeleton while loading
  if (isFormDataLoading) {
    return (
      <div className="space-y-8">
        <div className="flex w-full flex-col md:flex-row md:gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-7 w-16" />
          <div className="space-y-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-24 w-full" />
        </div>

        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form id="create-advance-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* e-SLOG entity-level validation errors */}
        {eslogEntityErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("e-SLOG Validation Failed")}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{t("The following entity settings need to be updated:")}</p>
              <ul className="list-disc space-y-1 pl-4">
                {eslogEntityErrors.map((error) => (
                  <li key={error.field} className="text-sm">
                    {error.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex w-full flex-col md:flex-row md:gap-6">
          <DocumentRecipientSection
            control={form.control}
            entityId={entityId}
            onCustomerSelect={handleCustomerSelect}
            onCustomerClear={handleCustomerClear}
            showCustomerForm={showCustomerForm}
            shouldFocusName={shouldFocusName}
            selectedCustomerId={selectedCustomerId}
            initialCustomerName={initialCustomerName}
            t={t}
          />
          <DocumentDetailsSection
            control={form.control}
            documentType={_type}
            t={t}
            fursInline={
              isFursEnabled && hasFursPremises
                ? {
                    premises: activePremises.map((p) => ({ id: p.id, business_premise_name: p.business_premise_name })),
                    devices: activeDevices.map((d) => ({ id: d.id, electronic_device_name: d.electronic_device_name })),
                    selectedPremise: selectedPremiseName,
                    selectedDevice: selectedDeviceName,
                    onPremiseChange: setSelectedPremiseName,
                    onDeviceChange: setSelectedDeviceName,
                    isSkipped: skipFiscalization,
                  }
                : undefined
            }
          >
            {/* Mark as paid section (UI-only state, not in form schema) */}
            <MarkAsPaidSection
              checked={markAsPaid}
              onCheckedChange={setMarkAsPaid}
              paymentType={paymentType}
              onPaymentTypeChange={setPaymentType}
              t={t}
            />
          </DocumentDetailsSection>
        </div>

        <DocumentItemsSection
          control={form.control}
          watch={form.watch}
          setValue={form.setValue}
          getValues={form.getValues}
          entityId={entityId}
          currencyCode={activeEntity?.currency_code ?? undefined}
          onAddNewTax={onAddNewTax}
          t={t}
          taxesDisabled={reverseChargeApplies}
          taxesDisabledMessage={
            reverseChargeApplies ? t("Reverse charge - tax exempt EU B2B sale") : viesWarning ? viesWarning : undefined
          }
          maxTaxesPerItem={activeEntity?.country_rules?.max_taxes_per_item}
          priceModesRef={priceModesRef}
          initialPriceModes={initialPriceModes}
        />

        <DocumentNoteField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: formValues.number,
            date: formValues.date,
            date_due: formValues.date_due,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />
      </form>
    </Form>
  );
}
