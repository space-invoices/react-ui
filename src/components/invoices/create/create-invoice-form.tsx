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
import { useEslogValidation } from "@/ui/hooks/use-eslog-validation";
import { usePremiseSelection } from "@/ui/hooks/use-premise-selection";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import { buildEslogOptions, buildFinaOptions, buildFursOptions } from "@/ui/lib/fiscalization-options";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { CUSTOMERS_CACHE_KEY } from "../../customers/customers.hooks";
import {
  DocumentDetailsSection,
  DocumentFooterField,
  DocumentNoteField,
  DocumentPaymentTermsField,
  DocumentSignatureField,
  DocumentTaxClauseField,
} from "../../documents/create/document-details-section";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { type LinkedDocumentSummary, LinkedDocumentsInfo } from "../../documents/create/linked-documents-info";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import type { DocumentTypes } from "../../documents/types";
import { useCreateInvoice, useNextInvoiceNumber, useUpdateInvoice } from "../invoices.hooks";
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

function calculateDueDate(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const DUE_DAYS_PRESETS = [0, 7, 14, 30, 60, 90] as const;

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

const DUPLICATE_PREVIEW_SETTLE_MS = 120;
const DUPLICATE_PREVIEW_MIN_DELAY_MS = 260;

function emitInvoiceCreateDebug(_detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
}

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
  /** Source documents linked to this invoice (e.g., delivery notes merged into this invoice) */
  sourceDocuments?: LinkedDocumentSummary[];
  /** Force linking documents even if an advance invoice is already applied to another invoice */
  forceLinkedDocuments?: boolean;
  /** Mode: create (default) or edit */
  mode?: "create" | "edit";
  /** Document ID for edit mode */
  documentId?: string;
} & ComponentTranslationProps;

function buildInvoiceFormValues({
  initialValues,
  currencyCode,
  defaultInvoiceNote,
  defaultPaymentTerms,
  defaultFooter,
  defaultInvoiceDueDays,
}: {
  initialValues?: Partial<CreateInvoiceRequest> & { number?: string };
  currencyCode?: string;
  defaultInvoiceNote: string;
  defaultPaymentTerms: string;
  defaultFooter: string;
  defaultInvoiceDueDays: number;
}): CreateInvoiceFormValues {
  return {
    number: initialValues?.number || "",
    date: initialValues?.date || new Date().toISOString(),
    customer_id: initialValues?.customer_id ?? undefined,
    customer: (initialValues?.customer as CreateInvoiceFormValues["customer"]) ?? undefined,
    items: initialValues?.items?.length
      ? initialValues.items.map((item: any) => ({
          type: item.type,
          name: item.name || "",
          description: item.description || "",
          ...(item.type !== "separator"
            ? {
                quantity: item.quantity ?? 1,
                price: item.gross_price ?? item.price,
                taxes: item.taxes || [],
              }
            : {}),
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
    currency_code: initialValues?.currency_code || currencyCode || "EUR",
    reference: (initialValues as any)?.reference ?? "",
    note: initialValues?.note ?? defaultInvoiceNote,
    tax_clause: (initialValues as any)?.tax_clause ?? "",
    payment_terms: initialValues?.payment_terms ?? defaultPaymentTerms,
    footer: (initialValues as any)?.footer ?? defaultFooter,
    date_due:
      initialValues?.date_due ||
      calculateDueDate(initialValues?.date || new Date().toISOString(), defaultInvoiceDueDays),
    date_service: (initialValues as any)?.date_service || new Date().toISOString(),
    linked_documents: (initialValues as any)?.linked_documents,
  };
}

export default function CreateInvoiceForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onHeaderActionChange,
  initialValues,
  sourceDocuments,
  forceLinkedDocuments,
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
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";
  const defaultInvoiceDueDays = (activeEntity?.settings as any)?.default_invoice_due_days ?? 30;

  // ============================================================================
  // FURS & FINA Premise Selection (shared hook)
  // ============================================================================
  const furs = usePremiseSelection({ entityId, type: "furs" });
  const fina = usePremiseSelection({ entityId, type: "fina" });
  const [skipFiscalization, setSkipFiscalization] = useState(false);

  // ============================================================================
  // e-SLOG Validation (shared hook)
  // ============================================================================
  const eslog = useEslogValidation(activeEntity);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<string[]>(["bank_transfer"]);
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Service date type state (single date or range)
  const [serviceDateType, setServiceDateType] = useState<"single" | "range">(
    initialValues && (initialValues as any).date_service_to ? "range" : "single",
  );

  // Due days type state for invoice due date selector
  const [dueDaysType, setDueDaysType] = useState<number | "custom">(() => {
    if (mode === "edit" || initialValues?.date_due) return "custom";
    return (DUE_DAYS_PRESETS as readonly number[]).includes(defaultInvoiceDueDays) ? defaultInvoiceDueDays : "custom";
  });

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

  const formDefaultValues = useMemo(
    () =>
      buildInvoiceFormValues({
        initialValues,
        currencyCode: activeEntity?.currency_code ?? undefined,
        defaultInvoiceNote,
        defaultPaymentTerms,
        defaultFooter,
        defaultInvoiceDueDays,
      }),
    [
      activeEntity?.currency_code,
      defaultFooter,
      defaultInvoiceDueDays,
      defaultInvoiceNote,
      defaultPaymentTerms,
      initialValues,
    ],
  );

  const form = useForm<CreateInvoiceFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createInvoiceSchema) as Resolver<CreateInvoiceFormValues>,
    defaultValues: formDefaultValues,
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

  // Handle due days type change - recalculate due date for presets
  const handleDueDaysTypeChange = useCallback(
    (type: number | "custom") => {
      setDueDaysType(type);
      if (type !== "custom") {
        const currentDate = form.getValues("date");
        if (currentDate) {
          form.setValue("date_due", calculateDueDate(currentDate, type));
        }
      }
    },
    [form],
  );

  // FURS is "active" for this invoice if enabled and we have a valid selection (and not skipped)
  const isFursActive = furs.isActive && !skipFiscalization;

  // ============================================================================
  // VIES Check - determine transaction type early (needed for number preview)
  // ============================================================================
  const customerCountry = useWatch({ control: form.control, name: "customer.country" });
  const customerCountryCode = useWatch({ control: form.control, name: "customer.country_code" });
  const customerTaxNumber = useWatch({ control: form.control, name: "customer.tax_number" });
  const customerIsEndConsumerWatch =
    useWatch({ control: form.control, name: "customer.is_end_consumer" as any }) === true;

  const {
    reverseChargeApplies,
    transactionType,
    isFetching: isViesFetching,
    warning: viesWarning,
  } = useTransactionTypeCheck({
    issuerCountryCode: activeEntity?.country_code,
    isTaxSubject: activeEntity?.is_tax_subject ?? true,
    customerCountry,
    customerCountryCode,
    customerTaxNumber,
    customerIsEndConsumer: customerIsEndConsumerWatch,
    enabled: !!activeEntity,
  });

  // FINA numbering guard: use FINA numbering for domestic transactions (or all if unified numbering is on)
  const finaUnifiedNumbering = fina.settings?.unified_numbering !== false;
  const useFinaNumbering =
    !!fina.isActive && (finaUnifiedNumbering || transactionType == null || transactionType === "domestic");
  const isFinaNonDomestic = !!fina.isActive && !useFinaNumbering;

  // ============================================================================
  // Next Invoice Number Preview
  // ============================================================================
  // Wait for FURS selection to be ready before querying to prevent number flashing
  // Skip in edit mode - we use the existing document number
  // Use the same premise/device params for both FURS and FINA (an entity is either one, never both)
  const activePremiseName = isFursActive
    ? furs.selectedPremiseName
    : useFinaNumbering
      ? fina.selectedPremiseName
      : undefined;
  const activeDeviceNameForNumber = isFursActive
    ? furs.selectedDeviceName
    : useFinaNumbering
      ? fina.selectedDeviceName
      : undefined;

  const { data: nextNumberData, isLoading: isNextNumberLoading } = useNextInvoiceNumber(entityId, {
    business_premise_name: activePremiseName,
    electronic_device_name: activeDeviceNameForNumber,
    enabled:
      !!entityId && !furs.isLoading && furs.isSelectionReady && !fina.isLoading && fina.isSelectionReady && !isEditMode,
  });

  // Overall loading state - wait until we have FURS/FINA data, selection ready, and next number (only in create mode)
  const isFormDataLoading = isEditMode
    ? false // In edit mode, don't wait for next number
    : furs.isLoading || !furs.isSelectionReady || fina.isLoading || !fina.isSelectionReady || isNextNumberLoading;

  // Update header action with FURS and e-SLOG toggle buttons
  useEffect(() => {
    if (!onHeaderActionChange) return;

    // Don't set header action while loading or in edit mode (FURS/FINA/e-SLOG not editable)
    if (furs.isLoading || fina.isLoading || isEditMode) {
      onHeaderActionChange(null);
      return;
    }

    const showFursToggle = furs.isEnabled && furs.hasPremises;
    const showEslogToggle = eslog.isAvailable;

    if (showFursToggle || showEslogToggle) {
      const isFursChecked = !skipFiscalization;
      const isEslogChecked = eslog.isEnabled === true;

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
                    onClick={() => eslog.setEnabled(!eslog.isEnabled)}
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
    furs.isLoading,
    fina.isLoading,
    furs.isEnabled,
    furs.hasPremises,
    skipFiscalization,
    canSkipFiscalization,
    eslog.isAvailable,
    eslog.isEnabled,
    eslog.setEnabled,
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

  // Watch fields needed for document note/payment terms preview
  const watchedNumber = useWatch({ control: form.control, name: "number" });
  const watchedDate = useWatch({ control: form.control, name: "date" });
  const watchedDateDue = useWatch({ control: form.control, name: "date_due" });
  const watchedCurrencyCode = useWatch({ control: form.control, name: "currency_code" });
  const watchedCustomer = useWatch({ control: form.control, name: "customer" });

  // Croatian invoice validation:
  // - Domestic/3w B2C requires FINA
  // - Domestic B2B (customer has tax number and NOT end consumer) is blocked
  const isCroatianEntity = activeEntity?.country_code === "HR";
  const customerHasTaxNumber = !!customerTaxNumber?.trim();
  const isDomesticTransaction = transactionType === "domestic";
  const requiresFinaFiscalization = isDomesticTransaction || transactionType === "3w_b2c";
  const is3wTransaction = transactionType === "3w_b2b" || transactionType === "3w_b2c";

  // Auto-toggle is_end_consumer based on tax number for Croatian domestic/3w customers
  // Default: checked (end consumer). When tax number is entered: uncheck (business). User can override.
  const prevAutoSetTaxRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isCroatianEntity || !(isDomesticTransaction || is3wTransaction)) return;
    const hasTaxNumber = !!customerTaxNumber?.trim();
    const hadTaxNumber = !!prevAutoSetTaxRef.current?.trim();
    prevAutoSetTaxRef.current = customerTaxNumber ?? undefined;

    // Auto-uncheck when tax number goes from empty to filled (likely a business)
    if (hasTaxNumber && !hadTaxNumber && customerIsEndConsumerWatch) {
      form.setValue("customer.is_end_consumer" as any, false);
    }
    // Auto-check when tax number goes from filled to empty (likely an individual)
    if (!hasTaxNumber && hadTaxNumber && !customerIsEndConsumerWatch) {
      form.setValue("customer.is_end_consumer" as any, true);
    }
  }, [customerTaxNumber, isCroatianEntity, isDomesticTransaction, is3wTransaction, customerIsEndConsumerWatch, form]);

  const finaValidationError = (() => {
    if (!isCroatianEntity || !requiresFinaFiscalization) return undefined;
    // Domestic B2B is always blocked (3w B2B never reaches here since requiresFinaFiscalization is false for 3w B2B)
    if (isDomesticTransaction && customerHasTaxNumber && !customerIsEndConsumerWatch) {
      return t("Domestic B2B invoicing in Croatia is not supported");
    }
    if (!fina.isEnabled) {
      return t("FINA fiscalization must be enabled for domestic invoices");
    }
    return undefined;
  })();

  // Auto-populate tax_clause from entity settings when transaction type changes
  const effectiveTransactionType = transactionType ?? "domestic";
  const prevTransactionTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (effectiveTransactionType === prevTransactionTypeRef.current) return;
    prevTransactionTypeRef.current = effectiveTransactionType;

    const taxClauseDefaults = (activeEntity?.settings as any)?.tax_clause_defaults;
    if (!taxClauseDefaults) return;

    const clause = taxClauseDefaults[effectiveTransactionType] ?? "";
    form.setValue("tax_clause", clause);
  }, [effectiveTransactionType, activeEntity, form]);

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
      // Save FURS/FINA combos to localStorage on successful creation
      furs.saveCombo();
      fina.saveCombo();
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
      // Block Croatian domestic B2B and domestic B2C without FINA
      if (finaValidationError) return;

      // Skip e-SLOG validation for drafts and edit mode
      if (!isDraft && !isEditMode && eslog.isEnabled) {
        const validationErrors = validateEslogForm(values as any, activeEntity);

        if (validationErrors.length > 0) {
          const entityErrors = getEntityErrors(validationErrors);
          const formErrors = getFormFieldErrors(validationErrors);
          eslog.setEntityErrors(entityErrors);
          for (const error of formErrors) {
            form.setError(error.field as any, {
              type: "eslog",
              message: error.message,
            });
          }
          return;
        }
        eslog.setEntityErrors([]);
      }

      // Build FURS options (skip for drafts and edit mode)
      const fursOptions = buildFursOptions({
        isDraft,
        isEnabled: furs.isEnabled,
        isEditMode,
        skipFiscalization,
        premiseName: furs.selectedPremiseName,
        deviceName: furs.selectedDeviceName,
      });

      // Build FINA options (skip for drafts, edit mode, and non-domestic transactions)
      const finaOptions = buildFinaOptions({
        isDraft,
        useFinaNumbering,
        isEditMode,
        premiseName: fina.selectedPremiseName,
        deviceName: fina.selectedDeviceName,
        paymentType: paymentTypes[0],
      });

      // Build e-SLOG options (skip for drafts and edit mode)
      const eslogOptions = buildEslogOptions({
        isDraft,
        isEditMode,
        isAvailable: eslog.isAvailable,
        isEnabled: eslog.isEnabled,
      });

      const payload = prepareInvoiceSubmission(values as any, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft || isEditMode ? false : markAsPaid,
        paymentTypes,
        furs: fursOptions,
        fina: finaOptions,
        eslog: eslogOptions,
        priceModes: priceModesRef.current,
        isDraft,
      });

      // Add force_linked_documents if set (used after conflict dialog approval)
      if (forceLinkedDocuments) {
        (payload as any).force_linked_documents = true;
      }

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
      eslog,
      finaValidationError,
      fina,
      forceLinkedDocuments,
      form,
      furs,
      isEditMode,
      useFinaNumbering,
      markAsPaid,
      originalCustomer,
      paymentTypes,
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
  // When form is pre-populated via initialValues (duplicate/merge), treat as dirty immediately
  const isDirty = form.formState.isDirty || !!initialValues;

  useFormFooterRegistration({
    formId: "create-invoice-form",
    isPending,
    isDirty,
    label: saveLabel,
    secondaryAction,
  });

  // Track if initial setup has been done
  const initialSetupDoneRef = useRef(false);
  const hasInitialValues = !!initialValues;
  const duplicateHydrationStartedAtRef = useRef<number | null>(hasInitialValues ? performance.now() : null);
  const duplicateHydrationLoggedRef = useRef(false);
  const appliedInitialValuesSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasInitialValues) return;

    const nextSignature = JSON.stringify(formDefaultValues);
    if (appliedInitialValuesSignatureRef.current === nextSignature) return;

    appliedInitialValuesSignatureRef.current = nextSignature;
    initialSetupDoneRef.current = false;
    duplicateHydrationStartedAtRef.current = performance.now();
    duplicateHydrationLoggedRef.current = false;
    form.reset(formDefaultValues);
    priceModesRef.current = initialPriceModes;
  }, [form, formDefaultValues, hasInitialValues, initialPriceModes]);

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
    const entityDefaultFooter = (activeEntity.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
    }
    const entityDefaultSignature = (activeEntity.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
    }

    // Auto-populate due date and due days type from entity settings when entity loads async
    if (!isEditMode && !initialValues?.date_due) {
      const dueDays = (activeEntity.settings as any)?.default_invoice_due_days ?? 30;
      const currentDate = form.getValues("date");
      if (currentDate) {
        form.setValue("date_due", calculateDueDate(currentDate, dueDays));
      }
      setDueDaysType((DUE_DAYS_PRESETS as readonly number[]).includes(dueDays) ? dueDays : "custom");
    }

    // Auto-add tax field for tax subject entities
    if (activeEntity.is_tax_subject) {
      const items = form.getValues("items") || [];
      if (items.length > 0 && (!items[0].taxes || items[0].taxes.length === 0)) {
        form.setValue("items.0.taxes", [{ tax_id: undefined }]);
      }
    }

    initialSetupDoneRef.current = true;
    if (hasInitialValues && duplicateHydrationStartedAtRef.current && !duplicateHydrationLoggedRef.current) {
      duplicateHydrationLoggedRef.current = true;
      emitInvoiceCreateDebug({
        stage: "entity_defaults_applied",
        hasInitialValues: true,
        elapsedMs: Number((performance.now() - duplicateHydrationStartedAtRef.current).toFixed(1)),
      });
    }
  }, [activeEntity, form, hasInitialValues, isEditMode, initialValues]);

  // Recalculate due date when document date changes (skip in edit mode and custom due days)
  const prevDateRef = useRef(form.getValues("date"));
  useEffect(() => {
    if (isEditMode) return;
    if (!watchedDate || watchedDate === prevDateRef.current) return;
    prevDateRef.current = watchedDate;
    if (dueDaysType !== "custom") {
      form.setValue("date_due", calculateDueDate(watchedDate, dueDaysType));
    }
  }, [watchedDate, isEditMode, form, dueDaysType]);

  // Use form.watch subscription for onChange callback (avoids re-render loops)
  const prevPayloadRef = useRef<string>("");
  const initialPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEmittedSettledInitialPreviewRef = useRef(!hasInitialValues);
  const pendingInitialPreviewPayloadRef = useRef<InvoicePreviewPayload | null>(null);

  useEffect(() => {
    if (!hasInitialValues) return;

    hasEmittedSettledInitialPreviewRef.current = false;
    prevPayloadRef.current = "";
    pendingInitialPreviewPayloadRef.current = null;
    if (initialPreviewTimeoutRef.current) {
      clearTimeout(initialPreviewTimeoutRef.current);
      initialPreviewTimeoutRef.current = null;
    }
  }, [hasInitialValues]);

  const buildPreviewPayload = useCallback((formValues: any): InvoicePreviewPayload => {
    const currentItems = formValues.items || [];
    const transformedItems = currentItems.map((item: any, index: number) => {
      const { price, ...rest } = item;
      const isGross = priceModesRef.current[index] ?? false;
      return isGross ? { ...rest, gross_price: price } : { ...rest, price };
    });
    return {
      number: formValues.number,
      date: formValues.date,
      date_service: formValues.date_service,
      date_service_to: formValues.date_service_to,
      customer_id: formValues.customer_id,
      customer: formValues.customer,
      items: transformedItems,
      currency_code: formValues.currency_code,
      reference: formValues.reference,
      note: formValues.note,
      payment_terms: formValues.payment_terms,
      signature: formValues.signature,
    };
  }, []);

  const emitCurrentPreviewPayload = useCallback(() => {
    if (!onChange) return;
    onChange(buildPreviewPayload(form.getValues()));
  }, [buildPreviewPayload, form, onChange]);

  useEffect(() => {
    if (!onChange) return;

    const emitSettledInitialPreview = (payload: InvoicePreviewPayload) => {
      pendingInitialPreviewPayloadRef.current = payload;

      if (initialPreviewTimeoutRef.current) return;

      const hydrationStartedAt = duplicateHydrationStartedAtRef.current ?? performance.now();
      const elapsedMs = performance.now() - hydrationStartedAt;
      const delayMs = Math.max(DUPLICATE_PREVIEW_SETTLE_MS, DUPLICATE_PREVIEW_MIN_DELAY_MS - elapsedMs);
      initialPreviewTimeoutRef.current = setTimeout(() => {
        initialPreviewTimeoutRef.current = null;
        hasEmittedSettledInitialPreviewRef.current = true;
        const settledPayload = pendingInitialPreviewPayloadRef.current ?? payload;
        if (hasInitialValues && duplicateHydrationStartedAtRef.current && !duplicateHydrationLoggedRef.current) {
          duplicateHydrationLoggedRef.current = true;
          emitInvoiceCreateDebug({
            stage: "initial_payload_emitted",
            hasInitialValues: true,
            itemCount: settledPayload.items?.length ?? 0,
            elapsedMs: Number((performance.now() - duplicateHydrationStartedAtRef.current).toFixed(1)),
          });
        }
        onChange(settledPayload);
        pendingInitialPreviewPayloadRef.current = null;
      }, delayMs);
    };

    // Initial call
    const initialPayload = buildPreviewPayload(form.getValues());
    prevPayloadRef.current = JSON.stringify(initialPayload);
    if (hasInitialValues) {
      emitSettledInitialPreview(initialPayload);
    } else {
      onChange(initialPayload);
    }

    // Subscribe to changes
    const subscription = form.watch((formValues) => {
      const payload = buildPreviewPayload(formValues);
      const payloadStr = JSON.stringify(payload);
      if (payloadStr !== prevPayloadRef.current) {
        prevPayloadRef.current = payloadStr;
        if (hasInitialValues && duplicateHydrationStartedAtRef.current) {
          emitInvoiceCreateDebug({
            stage: "payload_changed",
            hasInitialValues: true,
            itemCount: payload.items?.length ?? 0,
            elapsedMs: Number((performance.now() - duplicateHydrationStartedAtRef.current).toFixed(1)),
          });
        }
        if (hasInitialValues && !hasEmittedSettledInitialPreviewRef.current) {
          emitSettledInitialPreview(payload);
        } else {
          onChange(payload);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (initialPreviewTimeoutRef.current) {
        clearTimeout(initialPreviewTimeoutRef.current);
        initialPreviewTimeoutRef.current = null;
      }
      pendingInitialPreviewPayloadRef.current = null;
    };
  }, [buildPreviewPayload, form, hasInitialValues, onChange]);

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
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Details section skeleton — inline label rows */}
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-20" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-[6.5rem] shrink-0" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-[6.5rem] shrink-0" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-[6.5rem] shrink-0" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-[6.5rem] shrink-0" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-[6.5rem] shrink-0" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Items section skeleton */}
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

        {/* Note field skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form id="create-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Croatian domestic invoice validation errors */}
        {finaValidationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{finaValidationError}</AlertTitle>
          </Alert>
        )}

        {/* e-SLOG entity-level validation errors */}
        {eslog.entityErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("e-SLOG Validation Failed")}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{t("The following entity settings need to be updated:")}</p>
              <ul className="list-disc space-y-1 pl-4">
                {eslog.entityErrors.map((error) => (
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
            showEndConsumerToggle={isCroatianEntity && (isDomesticTransaction || is3wTransaction)}
            t={t}
          />
          <DocumentDetailsSection
            control={form.control}
            documentType={_type}
            t={t}
            fursInline={
              // Hide FURS selector in edit mode - fiscalization is set at creation only
              !isEditMode && furs.isEnabled && furs.hasPremises
                ? {
                    premises: furs.activePremises.map((p) => ({
                      id: p.id,
                      business_premise_name: p.business_premise_name,
                    })),
                    devices: furs.activeDevices.map((d: any) => ({
                      id: d.id,
                      electronic_device_name: d.electronic_device_name,
                    })),
                    selectedPremise: furs.selectedPremiseName,
                    selectedDevice: furs.selectedDeviceName,
                    onPremiseChange: furs.setSelectedPremiseName,
                    onDeviceChange: furs.setSelectedDeviceName,
                    isSkipped: skipFiscalization,
                  }
                : undefined
            }
            finaInline={
              !isEditMode && useFinaNumbering
                ? {
                    premises: fina.activePremises.map((p: any) => ({
                      id: p.id,
                      business_premise_name: p.business_premise_name,
                    })),
                    devices: fina.activeDevices.map((d: any) => ({
                      id: d.id,
                      electronic_device_name: d.electronic_device_name,
                    })),
                    selectedPremise: fina.selectedPremiseName,
                    selectedDevice: fina.selectedDeviceName,
                    onPremiseChange: fina.setSelectedPremiseName,
                    onDeviceChange: fina.setSelectedDeviceName,
                  }
                : undefined
            }
            serviceDate={{
              dateType: serviceDateType,
              onDateTypeChange: setServiceDateType,
            }}
            dueDays={{
              dueDaysType,
              onDueDaysTypeChange: handleDueDaysTypeChange,
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
                alwaysShowPaymentType={!!fina.isActive && requiresFinaFiscalization}
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
          onItemsStateChange={emitCurrentPreviewPayload}
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

        <DocumentTaxClauseField
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
          transactionType={transactionType}
          isTransactionTypeFetching={isViesFetching}
          isFinaNonDomestic={isFinaNonDomestic}
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

        <DocumentSignatureField
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

        <DocumentFooterField
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

        {sourceDocuments && sourceDocuments.length > 0 && (
          <LinkedDocumentsInfo documents={sourceDocuments} locale={locale || "en"} t={t} />
        )}
      </form>
    </Form>
  );
}
