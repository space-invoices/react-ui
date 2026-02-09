import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateInvoiceRequest, Invoice } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, FileCode2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Form } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createInvoiceSchema } from "@/ui/generated/schemas";
import { useViesCheck } from "@/ui/hooks/use-vies-check";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { CUSTOMERS_CACHE_KEY } from "../../customers/customers.hooks";
import {
  DocumentDetailsSection,
  DocumentNoteField,
  DocumentPaymentTermsField,
} from "../../documents/create/document-details-section";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import type { DocumentTypes } from "../../documents/types";
import { useFursPremises, useFursSettings } from "../../entities/furs-settings-form/furs-settings.hooks";
import {
  getLastUsedFursCombo,
  setLastUsedFursCombo,
  useCreateInvoice,
  useNextInvoiceNumber,
  useUpdateInvoice,
} from "../invoices.hooks";
import { getEntityErrors, getFormFieldErrors, validateEslogForm } from "./eslog-validation";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareInvoiceSubmission } from "./prepare-invoice-submission";
import { useInvoiceCustomerForm } from "./use-invoice-customer-form";

const translations = {
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
} as const;

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type InvoicePreviewPayload = Partial<CreateInvoiceRequest> & { number?: string };

type DocumentAddFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: Invoice) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: InvoicePreviewPayload) => void;
  onAddNewTax?: () => void;
  onHeaderActionChange?: (action: ReactNode) => void;
  /** Initial values for form fields (used for document duplication or editing) */
  initialValues?: Partial<CreateInvoiceRequest> & { number?: string };
  /** Mode: create (default) or edit */
  mode?: "create" | "edit";
  /** Document ID for edit mode */
  documentId?: string;
} & ComponentTranslationProps;

export default function CreateInvoiceForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onHeaderActionChange,
  initialValues,
  mode = "create",
  documentId,
  t: translateProp,
  namespace,
  locale,
}: DocumentAddFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const isEditMode = mode === "edit";
  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();

  // Get default invoice note and payment terms from entity settings
  const defaultInvoiceNote = (activeEntity?.settings as any)?.default_invoice_note || "";
  const defaultPaymentTerms = (activeEntity?.settings as any)?.default_invoice_payment_terms || "";

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
  const [paymentTypes, setPaymentTypes] = useState<string[]>(["bank_transfer"]);
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Service date type state (single date or range)
  const [serviceDateType, setServiceDateType] = useState<"single" | "range">("single");

  // Price modes per item (gross vs net) - collected from component state at submit
  // Initialize from initialValues for duplicated documents
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
  const isSloenianEntity = activeEntity?.country_code === "SI";
  const entityEslogEnabled = !!(activeEntity?.settings as any)?.eslog_validation_enabled;
  const isEslogAvailable = isSloenianEntity && entityEslogEnabled;

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

  const form = useForm<CreateInvoiceFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createInvoiceSchema) as Resolver<CreateInvoiceFormValues>,
    defaultValues: {
      number: initialValues?.number || "", // Edit mode uses initialValues, create mode uses useNextInvoiceNumber
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateInvoiceFormValues["customer"]) ?? undefined,
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
      note: initialValues?.note ?? defaultInvoiceNote,
      payment_terms: initialValues?.payment_terms ?? defaultPaymentTerms,
      date_service: new Date().toISOString(),
    },
  });

  // Skip fiscalization is only allowed for bank transfers or unpaid invoices
  const canSkipFiscalization = !markAsPaid || paymentTypes.every((type) => type === "bank_transfer");

  // Auto-disable skip when it becomes invalid (e.g., user changes payment type to cash)
  useEffect(() => {
    if (!canSkipFiscalization && skipFiscalization) {
      setSkipFiscalization(false);
    }
  }, [canSkipFiscalization, skipFiscalization]);

  // Clear date_service_to when switching from range to single
  useEffect(() => {
    if (serviceDateType === "single") {
      form.setValue("date_service_to", undefined);
    }
  }, [serviceDateType, form]);

  // Check if FURS selection is ready (needed to prevent number flashing)
  // Selection is ready when: FURS not enabled, OR no premises, OR we have a valid selection
  const isFursSelectionReady = !isFursEnabled || !hasFursPremises || (!!selectedPremiseName && !!selectedDeviceName);

  // FURS is "active" for this invoice if enabled and we have a valid selection (and not skipped)
  const isFursActive =
    isFursEnabled && hasFursPremises && selectedPremiseName && selectedDeviceName && !skipFiscalization;

  // ============================================================================
  // Next Invoice Number Preview
  // ============================================================================
  // Wait for FURS selection to be ready before querying to prevent number flashing
  // Skip in edit mode - we use the existing document number
  const { data: nextNumberData, isLoading: isNextNumberLoading } = useNextInvoiceNumber(entityId, {
    business_premise_name: isFursActive ? selectedPremiseName : undefined,
    electronic_device_name: isFursActive ? selectedDeviceName : undefined,
    enabled: !!entityId && !isFursLoading && isFursSelectionReady && !isEditMode,
  });

  // Overall loading state - wait until we have FURS data, selection ready, and next number (only in create mode)
  const isFormDataLoading = isEditMode
    ? false // In edit mode, don't wait for next number
    : isFursLoading || !isFursSelectionReady || isNextNumberLoading;

  // Update header action with FURS and e-SLOG toggle buttons
  useEffect(() => {
    if (!onHeaderActionChange) return;

    // Don't set header action while loading or in edit mode (FURS/e-SLOG not editable)
    if (isFursLoading || isEditMode) {
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
                    ? t("Click to skip e-SLOG validation for this invoice")
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
                      ? t("Click to skip fiscalization for this invoice")
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
    isEditMode,
    onHeaderActionChange,
    t,
  ]);

  // Pre-fill invoice number from preview
  useEffect(() => {
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form]);

  // Watch specific fields for VIES check (stable references)
  const customerCountry = useWatch({ control: form.control, name: "customer.country" });
  const customerCountryCode = useWatch({ control: form.control, name: "customer.country_code" });
  const customerTaxNumber = useWatch({ control: form.control, name: "customer.tax_number" });

  // Watch fields needed for document note/payment terms preview
  const watchedNumber = useWatch({ control: form.control, name: "number" });
  const watchedDate = useWatch({ control: form.control, name: "date" });
  const watchedDateDue = useWatch({ control: form.control, name: "date_due" });
  const watchedCurrencyCode = useWatch({ control: form.control, name: "currency_code" });
  const watchedCustomer = useWatch({ control: form.control, name: "customer" });

  // ============================================================================
  // VIES Check - determine if reverse charge applies
  // ============================================================================
  const { reverseChargeApplies, warning: viesWarning } = useViesCheck({
    issuerCountryCode: activeEntity?.country_code,
    isTaxSubject: activeEntity?.is_tax_subject ?? true,
    customerCountry,
    customerCountryCode,
    customerTaxNumber,
    enabled: !!activeEntity,
  });

  // Extract customer management logic into a custom hook
  const {
    originalCustomer,
    showCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    initialCustomerName,
    handleCustomerSelect,
    handleCustomerClear,
  } = useInvoiceCustomerForm(form as any);

  const { mutate: createInvoice, isPending: isCreatePending } = useCreateInvoice({
    entityId,
    onSuccess: (data) => {
      // Save FURS combo to localStorage on successful creation
      if (isFursActive && selectedPremiseName && selectedDeviceName) {
        setLastUsedFursCombo(entityId, {
          business_premise_name: selectedPremiseName,
          electronic_device_name: selectedDeviceName,
        });
      }
      // Invalidate customers cache when a customer was created/linked
      // This ensures the new customer appears in autocomplete for future documents
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      onSuccess?.(data);
    },
    onError,
  });

  const { mutate: updateInvoice, isPending: isUpdatePending } = useUpdateInvoice({
    entityId,
    onSuccess: (data) => {
      // Invalidate customers cache when a customer was created/linked
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      // Invalidate document queries to refresh the view
      queryClient.invalidateQueries({ queryKey: ["documents", "invoice", documentId] });
      onSuccess?.(data);
    },
    onError,
  });

  const isPending = isCreatePending || isUpdatePending;

  // Shared submit logic for both regular save and save as draft
  const submitInvoice = useCallback(
    (values: CreateInvoiceFormValues, isDraft: boolean) => {
      // Skip e-SLOG validation for drafts and edit mode
      if (!isDraft && !isEditMode && eslogValidationEnabled) {
        const validationErrors = validateEslogForm(values as any, activeEntity);

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

      // Build FURS options (skip for drafts and edit mode)
      const fursOptions =
        !isDraft && !isEditMode && isFursEnabled
          ? skipFiscalization
            ? { skip: true }
            : selectedPremiseName && selectedDeviceName
              ? { business_premise_name: selectedPremiseName, electronic_device_name: selectedDeviceName }
              : undefined
          : undefined;

      // Build e-SLOG options (skip for drafts and edit mode)
      const eslogOptions =
        !isDraft && !isEditMode && isEslogAvailable
          ? { validation_enabled: eslogValidationEnabled === true }
          : undefined;

      const payload = prepareInvoiceSubmission(values as any, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft || isEditMode ? false : markAsPaid,
        paymentTypes,
        furs: fursOptions,
        eslog: eslogOptions,
        priceModes: priceModesRef.current,
        isDraft,
      });

      if (isEditMode && documentId) {
        // In edit mode, use updateInvoice
        // Remove number from payload as it's not editable
        const { number: _number, ...updatePayload } = payload as any;
        updateInvoice({ id: documentId, data: updatePayload });
      } else {
        createInvoice(payload);
      }
    },
    [
      activeEntity,
      createInvoice,
      updateInvoice,
      documentId,
      eslogValidationEnabled,
      form,
      isEditMode,
      isEslogAvailable,
      isFursEnabled,
      markAsPaid,
      originalCustomer,
      paymentTypes,
      selectedDeviceName,
      selectedPremiseName,
      showCustomerForm,
      skipFiscalization,
    ],
  );

  // Handle save as draft - triggers form validation then submits with isDraft=true
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitInvoice(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitInvoice]);

  // Memoize secondary action to prevent infinite loops in useFormFooterRegistration
  // Don't show "Save as Draft" in edit mode
  const draftLabel = t("Save as Draft");
  const saveLabel = isEditMode ? t("Update") : t("Save");
  const secondaryAction = useMemo(
    () =>
      isEditMode
        ? undefined
        : {
            label: draftLabel,
            onClick: handleSaveAsDraft,
            isPending: isDraftPending,
          },
    [draftLabel, handleSaveAsDraft, isDraftPending, isEditMode],
  );

  // Watch isDirty to get stable reference
  const isDirty = form.formState.isDirty;

  useFormFooterRegistration({
    formId: "create-invoice-form",
    isPending,
    isDirty,
    label: saveLabel,
    secondaryAction,
  });

  // Track if initial setup has been done
  const initialSetupDoneRef = useRef(false);

  // Set default note and payment terms from entity settings when entity data is available
  // This handles the case where activeEntity loads asynchronously
  useEffect(() => {
    if (initialSetupDoneRef.current) return;
    if (!activeEntity) return;

    const entityDefaultNote = (activeEntity.settings as any)?.default_invoice_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
    const entityDefaultPaymentTerms = (activeEntity.settings as any)?.default_invoice_payment_terms;
    if (entityDefaultPaymentTerms && !form.getValues("payment_terms")) {
      form.setValue("payment_terms", entityDefaultPaymentTerms);
    }

    // Auto-add tax field for tax subject entities
    if (activeEntity.is_tax_subject) {
      const items = form.getValues("items") || [];
      if (items.length > 0 && (!items[0].taxes || items[0].taxes.length === 0)) {
        form.setValue("items.0.taxes", [{ tax_id: undefined }]);
      }
    }

    initialSetupDoneRef.current = true;
  }, [activeEntity, form]);

  // Use form.watch subscription for onChange callback (avoids re-render loops)
  const prevPayloadRef = useRef<string>("");

  useEffect(() => {
    if (!onChange) return;

    const buildPayload = (formValues: any): InvoicePreviewPayload => {
      const currentItems = formValues.items || [];
      const transformedItems = currentItems.map((item: any, index: number) => {
        const { price, ...rest } = item;
        const isGross = priceModesRef.current[index] ?? false;
        return isGross ? { ...rest, gross_price: price } : { ...rest, price };
      });
      return {
        number: formValues.number,
        date: formValues.date,
        customer_id: formValues.customer_id,
        customer: formValues.customer,
        items: transformedItems,
        currency_code: formValues.currency_code,
        note: formValues.note,
        payment_terms: formValues.payment_terms,
      };
    };

    // Initial call
    const initialPayload = buildPayload(form.getValues());
    prevPayloadRef.current = JSON.stringify(initialPayload);
    onChange(initialPayload);

    // Subscribe to changes
    const subscription = form.watch((formValues) => {
      const payload = buildPayload(formValues);
      const payloadStr = JSON.stringify(payload);
      if (payloadStr !== prevPayloadRef.current) {
        prevPayloadRef.current = payloadStr;
        onChange(payload);
      }
    });

    return () => subscription.unsubscribe();
  }, [onChange, form]);

  const onSubmit = (values: CreateInvoiceFormValues) => {
    submitInvoice(values, false);
  };

  // Show skeleton while loading FURS data and next number
  if (isFormDataLoading) {
    return (
      <div className="space-y-8">
        {/* Recipient + Details columns */}
        <div className="flex w-full flex-col md:flex-row md:gap-6">
          {/* Recipient section skeleton */}
          <div className="flex-1 space-y-4">
            <Skeleton className="h-7 w-24" /> {/* "Recipient" title */}
            <Skeleton className="h-10 w-full" /> {/* Customer autocomplete */}
          </div>
          {/* Details section skeleton */}
          <div className="flex-1 space-y-4">
            <Skeleton className="h-7 w-20" /> {/* "Details" title */}
            <Skeleton className="h-5 w-16" /> {/* "Number *" label */}
            <Skeleton className="h-10 w-full" /> {/* Number field */}
            <Skeleton className="h-5 w-12" /> {/* "Date *" label */}
            <Skeleton className="h-10 w-full" /> {/* Date picker */}
            <Skeleton className="h-5 w-16" /> {/* "Due Date" label */}
            <Skeleton className="h-10 w-full" /> {/* Due date picker */}
            <Skeleton className="h-5 w-20" /> {/* "Currency *" label */}
            <Skeleton className="h-10 w-full" /> {/* Currency select */}
            {/* Mark as paid section */}
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
                <Skeleton className="h-5 w-28" /> {/* "Mark as Paid" */}
              </div>
            </div>
          </div>
        </div>

        {/* Items section skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-16" /> {/* "Items" title */}
          <div className="space-y-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-full" /> {/* Item name */}
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" /> {/* Quantity */}
              <Skeleton className="h-10 flex-1" /> {/* Price */}
            </div>
          </div>
          <Skeleton className="h-9 w-24" /> {/* Add item button */}
        </div>

        {/* Note field skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-12" /> {/* "Note" label */}
          <Skeleton className="h-24 w-full" /> {/* Textarea */}
        </div>

        {/* Save button skeleton */}
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form id="create-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              // Hide FURS selector in edit mode - fiscalization is set at creation only
              !isEditMode && isFursEnabled && hasFursPremises
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
            serviceDate={{
              dateType: serviceDateType,
              onDateTypeChange: setServiceDateType,
            }}
          >
            {/* Invoice-specific: Mark as paid section (UI-only state, not in form schema) */}
            {/* Hide in edit mode - payments are managed separately */}
            {!isEditMode && (
              <MarkAsPaidSection
                checked={markAsPaid}
                onCheckedChange={setMarkAsPaid}
                paymentTypes={paymentTypes}
                onPaymentTypesChange={setPaymentTypes}
                t={t}
              />
            )}
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
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
        />

        <DocumentPaymentTermsField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
        />
      </form>
    </Form>
  );
}
