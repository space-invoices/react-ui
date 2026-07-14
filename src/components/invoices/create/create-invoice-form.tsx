import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateInvoice, Invoice, Tax } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Form, FormRoot } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createInvoiceSchema } from "@/ui/generated/schemas";
import { getInitialEslogValidationEnabled, useEslogValidation } from "@/ui/hooks/use-eslog-validation";
import { usePremiseSelection } from "@/ui/hooks/use-premise-selection";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import { normalizeDateOnlyInput, toLocalCalendarDate, toLocalDateOnlyString } from "@/ui/lib/date-only";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATIONS_FEATURE,
  type DocumentContentLocaleMode,
} from "@/ui/lib/document-content-translations";
import {
  buildEslogOptions,
  buildFinaOptions,
  buildFursOptions,
  buildGermanEInvoicingOptions,
  buildUjpOptions,
  type FiscalizationOperatorOverride,
} from "@/ui/lib/fiscalization-options";
import {
  normalizePtDocumentInput,
  type PtDocumentInputForm,
  ptDocumentInputFormSchema,
} from "@/ui/lib/pt-document-input";
import { invalidateRevenueRecognitionQueries } from "@/ui/lib/revenue-recognition-cache";
import { normalizeLineItemDiscountsForForm } from "@/ui/lib/schemas/shared";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useWhiteLabel } from "@/ui/providers/white-label-provider";
import { CUSTOMERS_CACHE_KEY } from "../../customers/customers.hooks";
import { BusinessUnitSelectField } from "../../documents/create/business-unit-select-field";
import {
  type BusinessUnitOption,
  getDocumentDefaultFields,
  mergeEntityAndBusinessUnitSettings,
} from "../../documents/create/business-unit-utils";
import {
  applyCustomCreatePreviewTemplate,
  applyCustomCreateTemplate,
} from "../../documents/create/custom-create-template";
import { withInvoiceIssueDateValidation } from "../../documents/create/document-date-validation";
import {
  DocumentDetailsSection,
  DocumentFooterField,
  DocumentNoteField,
  DocumentPaymentTermsField,
  DocumentSignatureField,
  DocumentTaxClauseField,
} from "../../documents/create/document-details-section";
import { withRequiredDocumentItemFields } from "../../documents/create/document-item-validation";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { type LinkedDocumentSummary, LinkedDocumentsInfo } from "../../documents/create/linked-documents-info";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import {
  calculateDocumentTotal,
  coercePaymentRowsToType,
  createEmptyPaymentRow,
  type DraftPaymentRow,
  getFirstValidPaymentType,
  serializePaymentRows,
  validatePaymentRows,
} from "../../documents/create/payment-rows";
import { prepareDocumentItems } from "../../documents/create/prepare-document-submission";
import {
  financialInputsMatchInitial,
  resolvePreservedExpectedTotal,
} from "../../documents/create/preserved-expected-total";
import { scrollToFirstInvalidField } from "../../documents/create/scroll-to-first-invalid-field";
import type { DocumentTypes } from "../../documents/types";
import { useCreateCustomInvoice, useCreateInvoice, useNextInvoiceNumber, useUpdateInvoice } from "../invoices.hooks";
import { EslogSetupErrorsDialog } from "./eslog-setup-errors-dialog";
import {
  buildEslogFieldErrors,
  getEntityErrors,
  getFormFieldErrors,
  hasCustomerFieldErrors,
  mergeFieldErrors,
  translateEslogValidationError,
  validateEslogForm,
} from "./eslog-validation";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareInvoiceSubmission, prepareInvoiceUpdateSubmission } from "./prepare-invoice-submission";
import { useInvoiceCustomerForm } from "./use-invoice-customer-form";

function calculateDueDate(dateValue: string, days: number): string {
  const date = toLocalCalendarDate(dateValue) ?? new Date(dateValue);
  date.setDate(date.getDate() + days);
  return toLocalDateOnlyString(date);
}

function isSameCalendarDate(left: string | Date | undefined, right: string | Date): boolean {
  if (!left) return false;

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
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
const FORM_ID = "create-invoice-form";
const createInvoiceFormSchema = withInvoiceIssueDateValidation(
  withRequiredDocumentItemFields(
    createInvoiceSchema.extend({
      business_unit_id: z.string().nullish(),
      pt: ptDocumentInputFormSchema.optional(),
    }),
  ),
);

function emitInvoiceCreateDebug(_detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
}

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateInvoiceFormValues = z.infer<typeof createInvoiceFormSchema> & {
  number?: string;
  _duplicate_source_id?: string;
  _duplicate_target_type?: string;
};

/** Preview payload extends request with display-only fields */
type InvoicePreviewPayload = Partial<CreateInvoice> & {
  id?: string;
  number?: string;
  pt?: PtDocumentInputForm;
  business_unit_id?: string | null;
};

type DocumentAddFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: Invoice) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: InvoicePreviewPayload) => void;
  onAddNewTax?: () => void;
  onFindEstimatedTax?: () => Promise<Tax | null | undefined> | Tax | null | undefined;
  onHeaderActionChange?: (action: ReactNode) => void;
  /** Initial values for form fields (used for document duplication or editing) */
  initialValues?: Partial<CreateInvoice> & { number?: string; business_unit_id?: string | null };
  businessUnits?: BusinessUnitOption[];
  showBusinessUnitSelect?: boolean;
  disableBusinessUnitSelect?: boolean;
  /** Source documents linked to this invoice (e.g., delivery notes merged into this invoice) */
  sourceDocuments?: LinkedDocumentSummary[];
  /** Force linking documents even if an advance invoice is already applied to another invoice */
  forceLinkedDocuments?: boolean;
  /** Mode: create (default) or edit */
  mode?: "create" | "edit";
  /** Document ID for edit mode */
  documentId?: string;
  /** Whether draft actions should be available in the UI */
  allowDrafts?: boolean;
  /** Optional app-level content rendered inside the details section. */
  detailsExtras?: ReactNode;
  /** Request-scoped operator override for embed fiscalization flows. */
  operatorPrefill?: FiscalizationOperatorOverride;
  translationLocale?: string;
} & ComponentTranslationProps;

function buildInvoiceFormValues({
  initialValues,
  currencyCode,
  documentDefaults,
  defaultInvoiceDueDays,
  isEditMode,
  fallbackNowIso,
}: {
  initialValues?: Partial<CreateInvoice> & { number?: string; business_unit_id?: string | null };
  currencyCode?: string;
  documentDefaults: ReturnType<typeof getDocumentDefaultFields>;
  defaultInvoiceDueDays: number;
  isEditMode: boolean;
  fallbackNowIso: string;
}): CreateInvoiceFormValues {
  const resolvedDate = normalizeDateOnlyInput(initialValues?.date || fallbackNowIso) ?? fallbackNowIso;
  return {
    number: initialValues?.number || "",
    business_unit_id: (initialValues as any)?.business_unit_id ?? null,
    calculation_mode: (initialValues as any)?.calculation_mode ?? undefined,
    date: resolvedDate,
    customer_id: initialValues?.customer_id ?? undefined,
    customer: (initialValues?.customer as CreateInvoiceFormValues["customer"]) ?? undefined,
    items: initialValues?.items?.length
      ? initialValues.items.map((item: any) => ({
          type: item.type ?? undefined,
          name: item.name || "",
          description: item.description || "",
          ...(item.type !== "separator"
            ? {
                item_id: item.item_id,
                translations: item.translations ?? {},
                classification: item.classification ?? undefined,
                unit: item.unit ?? undefined,
                financial_category_id: item.financial_category_id ?? undefined,
                e_invoicing: item.e_invoicing ?? undefined,
                quantity: item.quantity ?? 1,
                price: item.gross_price ?? item.price,
                gross_price: item.gross_price ?? undefined,
                taxes: item.taxes || [],
                discounts: normalizeLineItemDiscountsForForm(item.discounts),
                metadata: item.metadata ?? undefined,
              }
            : {}),
        }))
      : [
          {
            name: "",
            description: "",
            translations: {},
            quantity: 1,
            price: undefined,
            taxes: [],
          },
        ],
    currency_code: initialValues?.currency_code || currencyCode || "EUR",
    reference: (initialValues as any)?.reference ?? "",
    note: initialValues?.note ?? (isEditMode ? "" : documentDefaults.note),
    tax_clause: (initialValues as any)?.tax_clause ?? "",
    payment_terms: initialValues?.payment_terms ?? (isEditMode ? "" : documentDefaults.payment_terms),
    footer: (initialValues as any)?.footer ?? (isEditMode ? "" : documentDefaults.footer),
    signature: (initialValues as any)?.signature ?? (isEditMode ? "" : documentDefaults.signature),
    translations:
      (initialValues as any)?.translations ??
      (isEditMode
        ? {}
        : {
            note: documentDefaults.translations.note,
            payment_terms: documentDefaults.translations.payment_terms,
            footer: documentDefaults.translations.footer,
            signature: documentDefaults.translations.signature,
          }),
    date_due:
      initialValues?.date_due || (isEditMode ? undefined : calculateDueDate(resolvedDate, defaultInvoiceDueDays)),
    date_service: (initialValues as any)?.date_service ?? (isEditMode ? undefined : resolvedDate),
    date_service_to: (initialValues as any)?.date_service_to ?? undefined,
    linked_documents: (initialValues as any)?.linked_documents,
    pt: ((initialValues as any)?.pt as PtDocumentInputForm | undefined) ?? undefined,
  };
}

export default function CreateInvoiceForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onFindEstimatedTax,
  onHeaderActionChange,
  initialValues,
  businessUnits = [],
  showBusinessUnitSelect = businessUnits.length > 0 || !!(initialValues as any)?.business_unit_id,
  disableBusinessUnitSelect = false,
  sourceDocuments,
  forceLinkedDocuments,
  mode = "create",
  documentId,
  allowDrafts = true,
  detailsExtras,
  operatorPrefill,
  translationLocale,
  t: translateProp,
  namespace,
  locale,
}: DocumentAddFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  const isEditMode = mode === "edit";
  const { activeEntity } = useEntities();
  const countryCapabilities = useMemo(() => getEntityCountryCapabilities(activeEntity), [activeEntity]);
  const whiteLabel = useWhiteLabel();
  const queryClient = useQueryClient();
  const invalidateRevenueRecognitionReports = useCallback(() => {
    invalidateRevenueRecognitionQueries(queryClient);
  }, [queryClient]);
  const translationsFeatureEnabled = whiteLabel.isFeatureVisible(DOCUMENT_CONTENT_TRANSLATIONS_FEATURE);
  const defaultContentLocale = activeEntity?.locale || "en-US";
  const [contentLocale, setContentLocale] = useState<DocumentContentLocaleMode>(DEFAULT_CONTENT_LOCALE);
  const initialBusinessUnit = useMemo(
    () => businessUnits.find((unit) => unit.id === ((initialValues as any)?.business_unit_id ?? null)) ?? null,
    [businessUnits, initialValues],
  );
  const initialMergedSettings = useMemo(
    () => mergeEntityAndBusinessUnitSettings((activeEntity?.settings as any) ?? {}, initialBusinessUnit),
    [activeEntity?.settings, initialBusinessUnit],
  );

  // Get default invoice note and payment terms from entity settings
  const initialDocumentDefaults = getDocumentDefaultFields("invoice", initialMergedSettings);
  const defaultInvoiceDueDays = (initialMergedSettings as any)?.default_invoice_due_days ?? 30;

  // ============================================================================
  // FURS & FINA Premise Selection (shared hook)
  // ============================================================================
  const furs = usePremiseSelection({ entityId, type: "furs" });
  const fina = usePremiseSelection({ entityId, type: "fina" });
  const [skipFiscalization, setSkipFiscalization] = useState(false);
  const [skipPreferenceInitialized, setSkipPreferenceInitialized] = useState(isEditMode);

  // ============================================================================
  // e-SLOG Validation (shared hook)
  // ============================================================================
  const initialEslogEnabled = getInitialEslogValidationEnabled(isEditMode, (initialValues as any)?.eslog);
  const eslog = useEslogValidation(activeEntity, initialEslogEnabled);
  const eslogEntityErrorsRef = useRef(eslog.entityErrors);
  eslogEntityErrorsRef.current = eslog.entityErrors;
  const [eslogSetupDialogOpen, setEslogSetupDialogOpen] = useState(false);
  const isDraftSubmitRef = useRef(false);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentRows, setPaymentRows] = useState<DraftPaymentRow[]>([createEmptyPaymentRow()]);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState<string | undefined>();
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
  const customCreateTemplate = (initialValues as any)?._custom_create_template;
  const financialInputsMatchSource = useCallback(
    (values: { items?: any[]; currency_code?: string; calculation_mode?: string | null }) =>
      financialInputsMatchInitial({
        initialItems: initialValues?.items,
        currentItems: values.items,
        initialCurrencyCode: initialValues?.currency_code,
        currentCurrencyCode: values.currency_code,
        initialCalculationMode: (initialValues as any)?.calculation_mode ?? null,
        currentCalculationMode: values.calculation_mode ?? null,
        initialPriceModes,
        currentPriceModes: priceModesRef.current,
      }),
    [initialPriceModes, initialValues],
  );
  const getPreservedExpectedTotalWithTax = useCallback(
    (values: { items?: any[]; currency_code?: string; calculation_mode?: string | null }) =>
      resolvePreservedExpectedTotal({
        initialExpectedTotalWithTax: (initialValues as any)?._preserved_expected_total_with_tax,
        initialItems: initialValues?.items,
        currentItems: values.items,
        initialCurrencyCode: initialValues?.currency_code,
        currentCurrencyCode: values.currency_code,
        initialCalculationMode: (initialValues as any)?.calculation_mode ?? null,
        currentCalculationMode: values.calculation_mode ?? null,
        initialPriceModes,
        currentPriceModes: priceModesRef.current,
      }),
    [initialPriceModes, initialValues],
  );
  const fallbackNowIsoRef = useRef(normalizeDateOnlyInput(initialValues?.date || new Date().toISOString()) ?? "");

  const formDefaultValues = useMemo(
    () =>
      buildInvoiceFormValues({
        initialValues,
        currencyCode: activeEntity?.currency_code ?? undefined,
        documentDefaults: initialDocumentDefaults,
        defaultInvoiceDueDays,
        isEditMode,
        fallbackNowIso: fallbackNowIsoRef.current,
      }),
    [activeEntity?.currency_code, defaultInvoiceDueDays, initialDocumentDefaults, initialValues, isEditMode],
  );

  const baseResolver = useMemo(() => zodResolver(createInvoiceFormSchema) as Resolver<CreateInvoiceFormValues>, []);
  const eslogResolverStateRef = useRef({
    activeEntity,
    isEnabled: eslog.isEnabled === true,
    requiresUjpValidation: eslog.requiresUjpValidation,
    isEditMode,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  });
  eslogResolverStateRef.current = {
    activeEntity,
    isEnabled: eslog.isEnabled === true,
    requiresUjpValidation: eslog.requiresUjpValidation,
    isEditMode,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  };
  const resolver = useMemo<Resolver<CreateInvoiceFormValues>>(
    () => async (values, context, options) => {
      const result = await baseResolver(values, context, options);
      const resolverState = eslogResolverStateRef.current;
      const shouldValidateEslog = !isDraftSubmitRef.current && resolverState.isEnabled;

      if (!shouldValidateEslog) {
        eslogEntityErrorsRef.current = [];
        resolverState.setEntityErrors([]);
        return result;
      }

      const validationErrors = validateEslogForm(values as any, resolverState.activeEntity, {
        requireUjpRecipientRouting: resolverState.requiresUjpValidation,
      });
      const entityErrors = getEntityErrors(validationErrors);
      eslogEntityErrorsRef.current = entityErrors;
      resolverState.setEntityErrors(entityErrors);

      const fieldErrors = getFormFieldErrors(validationErrors);
      if (fieldErrors.length === 0) {
        return result;
      }

      const mergedErrors = mergeFieldErrors(
        result.errors,
        buildEslogFieldErrors<CreateInvoiceFormValues>(fieldErrors, resolverState.translate),
      );

      return {
        values: {},
        errors: mergedErrors,
      };
    },
    [baseResolver],
  );

  const form = useForm<CreateInvoiceFormValues>({
    resolver,
    defaultValues: formDefaultValues,
  });
  const autoDateDueRef = useRef<string | undefined>(
    !isEditMode && !initialValues?.date_due ? form.getValues("date_due") : undefined,
  );

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const documentTranslations = useWatch({ control: form.control, name: "translations" });
  const selectedBusinessUnitId = useWatch({ control: form.control, name: "business_unit_id" as any });
  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((unit) => unit.id === selectedBusinessUnitId) ?? null,
    [businessUnits, selectedBusinessUnitId],
  );
  const mergedSettings = useMemo(
    () => mergeEntityAndBusinessUnitSettings((activeEntity?.settings as any) ?? {}, selectedBusinessUnit),
    [activeEntity?.settings, selectedBusinessUnit],
  );
  const effectiveDefaultInvoiceDueDays = (mergedSettings as any)?.default_invoice_due_days ?? 30;
  const derivedDocumentDefaults = useMemo(() => getDocumentDefaultFields("invoice", mergedSettings), [mergedSettings]);
  const appliedDerivedDefaultsRef = useRef(derivedDocumentDefaults);
  const paymentDocumentTotal = useMemo(
    () => calculateDocumentTotal((watchedItems as any[]) ?? [], priceModesRef.current),
    [watchedItems],
  );
  const hasExplicitNonBankTransferPayment =
    markAsPaid && paymentRows.some((row) => row.type != null && row.type !== "bank_transfer");
  const skipPreferenceInitializedRef = useRef(isEditMode);
  const skipPaymentCoercionPendingRef = useRef(false);
  const previousSkipFiscalizationRef = useRef(skipFiscalization);
  const previousMarkAsPaidRef = useRef(markAsPaid);

  useEffect(() => {
    if (isEditMode) {
      skipPreferenceInitializedRef.current = true;
      setSkipPreferenceInitialized(true);
      return;
    }

    if (skipPreferenceInitializedRef.current || furs.isLoading) return;

    skipPreferenceInitializedRef.current = true;
    if (furs.settings?.default_skip_fiscalization === true) {
      setSkipFiscalization(true);
    }
    setSkipPreferenceInitialized(true);
  }, [furs.isLoading, furs.settings?.default_skip_fiscalization, isEditMode]);

  useEffect(() => {
    const skipJustEnabled = skipFiscalization && !previousSkipFiscalizationRef.current;
    const paidJustEnabled = markAsPaid && !previousMarkAsPaidRef.current;

    if (skipFiscalization && markAsPaid && (skipJustEnabled || paidJustEnabled)) {
      const nextPaymentRows = coercePaymentRowsToType(paymentRows, "bank_transfer");
      const hasChanged = nextPaymentRows.some((row, index) => row.type !== paymentRows[index]?.type);

      if (hasChanged) {
        skipPaymentCoercionPendingRef.current = true;
        setPaymentRows(nextPaymentRows);
      }
    }

    previousSkipFiscalizationRef.current = skipFiscalization;
    previousMarkAsPaidRef.current = markAsPaid;
  }, [markAsPaid, paymentRows, skipFiscalization]);

  // Auto-disable skip when the user explicitly changes payment away from bank transfer.
  useEffect(() => {
    if (skipPaymentCoercionPendingRef.current) return;

    if (hasExplicitNonBankTransferPayment && skipFiscalization) {
      setSkipFiscalization(false);
    }
  }, [hasExplicitNonBankTransferPayment, skipFiscalization]);

  useEffect(() => {
    if (!skipPaymentCoercionPendingRef.current) return;

    if (!markAsPaid || paymentRows.every((row) => row.type === "bank_transfer")) {
      skipPaymentCoercionPendingRef.current = false;
    }
  }, [markAsPaid, paymentRows]);

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
          const nextDueDate = calculateDueDate(currentDate, type);
          form.setValue("date_due", nextDueDate);
          autoDateDueRef.current = nextDueDate;
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
  const isFiscalizationDateLocked = !isEditMode && (isFursActive || useFinaNumbering);
  const fiscalizationDateLockReason = useFinaNumbering
    ? t("FINA fiscalized invoices always use the current date")
    : t("FURS fiscalized invoices always use the current date");

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
    business_unit_id: selectedBusinessUnitId ?? null,
    enabled:
      !!entityId &&
      !furs.isLoading &&
      skipPreferenceInitialized &&
      furs.isSelectionReady &&
      !fina.isLoading &&
      fina.isSelectionReady &&
      !isEditMode,
  });

  // Overall loading state - wait until we have FURS/FINA data, selection ready, and next number (only in create mode)
  const isFormDataLoading = isEditMode
    ? false // In edit mode, don't wait for next number
    : furs.isLoading ||
      !skipPreferenceInitialized ||
      !furs.isSelectionReady ||
      fina.isLoading ||
      !fina.isSelectionReady ||
      isNextNumberLoading;

  // Update header action with FURS and e-SLOG toggle buttons
  const headerActionSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!onHeaderActionChange) return;

    // In edit mode, e-SLOG validation remains editable but FURS/FINA controls are create-only.
    if (!isEditMode && (furs.isLoading || !skipPreferenceInitialized || fina.isLoading)) {
      if (headerActionSignatureRef.current === null) return;
      headerActionSignatureRef.current = null;
      onHeaderActionChange(null);
      return;
    }

    const showFursToggle = !isEditMode && furs.isEnabled && furs.hasPremises;
    const showEslogToggle = eslog.isAvailable;
    const isFursChecked = !skipFiscalization;
    const isEslogChecked = eslog.isEnabled === true;
    const headerActionSignature =
      showFursToggle || showEslogToggle
        ? JSON.stringify({
            showFursToggle,
            showEslogToggle,
            isFursChecked,
            isEslogChecked,
            eslogLabel: t("e-SLOG"),
            eslogEnabledDescription: t("Click to skip e-SLOG validation for this invoice"),
            eslogDisabledDescription: t("Click to enable e-SLOG validation"),
            fiscalizationLabel: t("Fiscally verify"),
            fiscalizationEnabledDescription: t("Click to skip fiscalization for this invoice"),
            fiscalizationDisabledDescription: t("Click to enable fiscalization"),
          })
        : null;

    if (headerActionSignatureRef.current === headerActionSignature) return;
    headerActionSignatureRef.current = headerActionSignature;

    if (showFursToggle || showEslogToggle) {
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
                      {isEslogChecked ? <Check className="size-3" /> : null}
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
                      !isFursChecked && "text-destructive hover:text-destructive",
                    )}
                    onClick={() => setSkipFiscalization(!skipFiscalization)}
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
                  {isFursChecked
                    ? t("Click to skip fiscalization for this invoice")
                    : t("Click to enable fiscalization")}
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
    skipPreferenceInitialized,
    fina.isLoading,
    furs.isEnabled,
    furs.hasPremises,
    skipFiscalization,
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

  useEffect(() => {
    if (isEditMode) {
      appliedDerivedDefaultsRef.current = derivedDocumentDefaults;
      return;
    }

    const previousDefaults = appliedDerivedDefaultsRef.current;

    for (const field of ["note", "payment_terms", "footer", "signature"] as const) {
      const currentValue = form.getValues(field);
      if (currentValue === "" || currentValue === previousDefaults[field]) {
        form.setValue(field, derivedDocumentDefaults[field], {
          shouldDirty: currentValue === previousDefaults[field] && currentValue !== derivedDocumentDefaults[field],
          shouldTouch: false,
          shouldValidate: false,
        });
      }

      const currentTranslations = (form.getValues("translations") as any)?.[field] ?? {};
      const previousTranslations = previousDefaults.translations[field] ?? {};
      const nextTranslations = derivedDocumentDefaults.translations[field] ?? {};
      const matchesPreviousTranslations = JSON.stringify(currentTranslations) === JSON.stringify(previousTranslations);
      const isEmptyTranslations = Object.keys(currentTranslations).length === 0;

      if (matchesPreviousTranslations || isEmptyTranslations) {
        form.setValue(`translations.${field}` as any, nextTranslations, {
          shouldDirty:
            matchesPreviousTranslations && JSON.stringify(previousTranslations) !== JSON.stringify(nextTranslations),
          shouldTouch: false,
          shouldValidate: false,
        });
      }
    }

    appliedDerivedDefaultsRef.current = derivedDocumentDefaults;
  }, [derivedDocumentDefaults, form, isEditMode]);

  useEffect(() => {
    if (!isFiscalizationDateLocked) return;

    const today = new Date();
    if (isSameCalendarDate(form.getValues("date"), today)) return;

    form.setValue("date", toLocalDateOnlyString(today), {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, isFiscalizationDateLocked]);

  // Watch fields needed for document note/payment terms preview
  const watchedNumber = useWatch({ control: form.control, name: "number" });
  const watchedDate = useWatch({ control: form.control, name: "date" });
  const watchedDateDue = useWatch({ control: form.control, name: "date_due" });
  const watchedCurrencyCode = useWatch({ control: form.control, name: "currency_code" });
  const watchedCustomer = useWatch({ control: form.control, name: "customer" });
  const watchedValidationSnapshot = useMemo(
    () =>
      JSON.stringify({
        date: watchedDate,
        date_due: watchedDateDue,
        currency_code: watchedCurrencyCode,
        customer: watchedCustomer,
        items: watchedItems,
      }),
    [watchedCurrencyCode, watchedCustomer, watchedDate, watchedDateDue, watchedItems],
  );
  const lastRevalidatedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!form.formState.isSubmitted || form.formState.isSubmitting) {
      return;
    }

    const hasErrors = Object.keys(form.formState.errors).length > 0 || eslog.entityErrors.length > 0;
    if (!hasErrors) {
      lastRevalidatedSnapshotRef.current = watchedValidationSnapshot;
      return;
    }

    if (lastRevalidatedSnapshotRef.current === watchedValidationSnapshot) {
      return;
    }

    lastRevalidatedSnapshotRef.current = watchedValidationSnapshot;
    const timeoutId = window.setTimeout(() => {
      void form.trigger();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    eslog.entityErrors.length,
    form,
    form.formState.errors,
    form.formState.isSubmitted,
    form.formState.isSubmitting,
    watchedValidationSnapshot,
  ]);

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
  const prevTaxClauseHydrationVersionRef = useRef<number | undefined>(undefined);
  const [taxClauseHydrationVersion, setTaxClauseHydrationVersion] = useState(0);
  useEffect(() => {
    if (isEditMode) return;
    const transactionTypeChanged = effectiveTransactionType !== prevTransactionTypeRef.current;
    const hydrationVersionChanged = taxClauseHydrationVersion !== prevTaxClauseHydrationVersionRef.current;
    if (!transactionTypeChanged && !hydrationVersionChanged) return;

    prevTransactionTypeRef.current = effectiveTransactionType;
    prevTaxClauseHydrationVersionRef.current = taxClauseHydrationVersion;

    const taxClauseDefaults = (activeEntity?.settings as any)?.tax_clause_defaults;
    if (!taxClauseDefaults) return;

    const clause = taxClauseDefaults[effectiveTransactionType] ?? "";
    form.setValue("tax_clause", clause);
  }, [activeEntity, effectiveTransactionType, form, isEditMode, taxClauseHydrationVersion]);

  // Extract customer management logic into a custom hook
  const {
    originalCustomer,
    showCustomerForm,
    setShowCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    initialCustomerName,
    handleCustomerSelect,
    handleCustomerClear,
    handleCustomerEdit,
  } = useInvoiceCustomerForm(form as any);

  useEffect(() => {
    if (!eslog.requiresUjpValidation || showCustomerForm) {
      return;
    }

    if (hasCustomerFieldErrors(form.formState.errors as any)) {
      setShowCustomerForm(true);
    }
  }, [eslog.requiresUjpValidation, form.formState.errors, setShowCustomerForm, showCustomerForm]);

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
      invalidateRevenueRecognitionReports();
      onSuccess?.(data);
    },
    onError,
  });

  const { mutate: createCustomInvoice, isPending: isCreateCustomPending } = useCreateCustomInvoice({
    entityId,
    onSuccess: (data) => {
      furs.saveCombo();
      fina.saveCombo();
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      invalidateRevenueRecognitionReports();
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
      invalidateRevenueRecognitionReports();
      onSuccess?.(data);
    },
    onError,
  });

  const isPending = isCreatePending || isCreateCustomPending || isUpdatePending;

  // Shared submit logic for both regular save and save as draft
  const submitInvoice = useCallback(
    (values: CreateInvoiceFormValues, isDraft: boolean) => {
      // Block Croatian domestic B2B and domestic B2C without FINA
      if (finaValidationError) return;

      if (!isDraft && eslog.isEnabled && eslogEntityErrorsRef.current.length > 0) {
        setEslogSetupDialogOpen(true);
        return;
      }

      // Build FURS options (skip for drafts and edit mode)
      const fursOptions = buildFursOptions({
        isDraft,
        isEnabled: furs.isEnabled,
        isEditMode,
        skipFiscalization,
        premiseName: furs.selectedPremiseName,
        deviceName: furs.selectedDeviceName,
        operator: operatorPrefill,
      });

      // Build FINA options (skip for drafts, edit mode, and non-domestic transactions)
      const finaOptions = buildFinaOptions({
        isDraft,
        useFinaNumbering,
        isEditMode,
        premiseName: fina.selectedPremiseName,
        deviceName: fina.selectedDeviceName,
        paymentType: getFirstValidPaymentType(paymentRows),
        operator: operatorPrefill,
      });

      // Build e-SLOG/UJP options for create and update.
      const eslogOptions = buildEslogOptions({
        isDraft,
        isAvailable: eslog.isAvailable,
        isEnabled: eslog.isEnabled,
      });
      const ujpOptions = buildUjpOptions({
        isAvailable: eslog.isAvailable,
        isEnabled: eslog.isEnabled,
        requiresUjpValidation: eslog.requiresUjpValidation,
      });
      const germanEInvoicingOptions = buildGermanEInvoicingOptions({
        isEditMode,
        isAvailable: countryCapabilities.showGermanEInvoicingExports,
        xrechnungEnabled: countryCapabilities.showXRechnungExport,
        zugferdEnabled: countryCapabilities.showZugferdExport,
      });
      const submissionValues: CreateInvoiceFormValues = eslog.isEnabled
        ? { ...values, calculation_mode: "b2b_standard" as const }
        : values;

      if (!isDraft && !isEditMode && markAsPaid) {
        const paymentValidation = validatePaymentRows(paymentRows, paymentDocumentTotal, "partial_allowed");
        const paymentMessage =
          paymentValidation.typeError ?? paymentValidation.amountError ?? paymentValidation.totalError;

        if (paymentMessage) {
          setPaymentValidationMessage(paymentMessage);
          return;
        }
      }

      if (isEditMode && documentId) {
        const updatePayload = prepareInvoiceUpdateSubmission(submissionValues as any, {
          originalCustomer,
          wasCustomerFormShown: showCustomerForm,
          eslog: eslogOptions,
          ujp: ujpOptions,
          priceModes: priceModesRef.current,
          initialValues: initialValues as any,
          initialPriceModes,
          initialEslog: (initialValues as any)?.eslog,
          initialUjp: (initialValues as any)?.ujp,
        }) as any;

        if (forceLinkedDocuments) {
          updatePayload.force_linked_documents = true;
        }

        updateInvoice({ id: documentId, data: updatePayload });
      } else {
        const payload = prepareInvoiceSubmission(submissionValues as any, {
          originalCustomer,
          wasCustomerFormShown: showCustomerForm,
          markAsPaid: isDraft ? false : markAsPaid,
          payments: serializePaymentRows(paymentRows, paymentDocumentTotal),
          furs: fursOptions,
          fina: finaOptions,
          eslog: eslogOptions,
          ujp: ujpOptions,
          germanEInvoicing: germanEInvoicingOptions,
          priceModes: priceModesRef.current,
          isDraft,
        });
        const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(submissionValues);
        if (preservedExpectedTotalWithTax !== undefined) {
          (payload as any).expected_total_with_tax = preservedExpectedTotalWithTax;
        } else {
          delete (payload as any).expected_total_with_tax;
        }

        if (forceLinkedDocuments) {
          (payload as any).force_linked_documents = true;
        }

        if (customCreateTemplate && financialInputsMatchSource(submissionValues)) {
          delete (payload as any).expected_total_with_tax;
          createCustomInvoice(applyCustomCreateTemplate(payload as any, customCreateTemplate));
        } else {
          createInvoice(payload);
        }
      }
    },
    [
      createInvoice,
      createCustomInvoice,
      updateInvoice,
      countryCapabilities.showGermanEInvoicingExports,
      countryCapabilities.showXRechnungExport,
      countryCapabilities.showZugferdExport,
      customCreateTemplate,
      documentId,
      eslog,
      finaValidationError,
      fina,
      forceLinkedDocuments,
      furs,
      initialPriceModes,
      initialValues,
      isEditMode,
      useFinaNumbering,
      markAsPaid,
      originalCustomer,
      paymentDocumentTotal,
      paymentRows,
      showCustomerForm,
      skipFiscalization,
      operatorPrefill,
      financialInputsMatchSource,
      getPreservedExpectedTotalWithTax,
    ],
  );

  // Handle save as draft - triggers form validation then submits with isDraft=true
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    isDraftSubmitRef.current = true;
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitInvoice(values, true);
      } else {
        scrollToFirstInvalidField(FORM_ID);
      }
    } finally {
      isDraftSubmitRef.current = false;
      setIsDraftPending(false);
    }
  }, [form, submitInvoice]);

  // Memoize secondary action to prevent infinite loops in useFormFooterRegistration
  // Don't show "Save as Draft" in edit mode
  const draftLabel = t("Save as Draft");
  const saveLabel = isEditMode ? t("Update") : t("Save");
  const secondaryAction = useMemo(
    () =>
      isEditMode || !allowDrafts
        ? undefined
        : {
            label: draftLabel,
            onClick: handleSaveAsDraft,
            isPending: isDraftPending,
          },
    [allowDrafts, draftLabel, handleSaveAsDraft, isDraftPending, isEditMode],
  );
  const handleFooterSubmit = useCallback(() => {
    (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit();
  }, []);

  // Watch isDirty to get stable reference
  // When form is pre-populated via initialValues (duplicate/merge), treat as dirty immediately
  const isDirty = form.formState.isDirty || !!initialValues;

  useFormFooterRegistration({
    formId: FORM_ID,
    isPending,
    isDirty,
    label: saveLabel,
    onSubmit: handleFooterSubmit,
    secondaryAction,
  });

  // Track if initial setup has been done
  const initialSetupDoneRef = useRef(false);
  const hasInitialValues = !!initialValues;
  const hasInitialDueDate = !!initialValues?.date_due;
  const duplicateHydrationStartedAtRef = useRef<number | null>(hasInitialValues ? performance.now() : null);
  const duplicateHydrationLoggedRef = useRef(false);
  const appliedInitialValuesHydrationKeyRef = useRef<string | null>(null);
  const initialValuesHydrationKey = useMemo(() => {
    if (!initialValues) return null;
    return (
      ((initialValues as any)._duplicate_source_id
        ? `duplicate:${(initialValues as any)._duplicate_source_id}:${(initialValues as any)._duplicate_target_type ?? _type}`
        : null) ?? JSON.stringify(formDefaultValues)
    );
  }, [formDefaultValues, initialValues, _type]);

  useEffect(() => {
    if (isEditMode || hasInitialDueDate) return;

    const currentDate = form.getValues("date");
    if (currentDate) {
      const currentDueDate = form.getValues("date_due");
      if (currentDueDate && autoDateDueRef.current && currentDueDate !== autoDateDueRef.current) {
        return;
      }

      const nextDueDate = calculateDueDate(currentDate, effectiveDefaultInvoiceDueDays);
      form.setValue("date_due", nextDueDate, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      autoDateDueRef.current = nextDueDate;
    }
    setDueDaysType(
      (DUE_DAYS_PRESETS as readonly number[]).includes(effectiveDefaultInvoiceDueDays)
        ? effectiveDefaultInvoiceDueDays
        : "custom",
    );
  }, [effectiveDefaultInvoiceDueDays, form, hasInitialDueDate, isEditMode]);

  useEffect(() => {
    if (!hasInitialValues) return;

    if (!initialValuesHydrationKey) return;
    if (appliedInitialValuesHydrationKeyRef.current === initialValuesHydrationKey) return;
    if (appliedInitialValuesHydrationKeyRef.current !== null && form.formState.isDirty) return;

    appliedInitialValuesHydrationKeyRef.current = initialValuesHydrationKey;
    initialSetupDoneRef.current = false;
    duplicateHydrationStartedAtRef.current = performance.now();
    duplicateHydrationLoggedRef.current = false;
    form.reset(formDefaultValues);
    setTaxClauseHydrationVersion((currentVersion) => currentVersion + 1);
    priceModesRef.current = initialPriceModes;
  }, [form, formDefaultValues, hasInitialValues, initialPriceModes, initialValuesHydrationKey]);

  // Set default note and payment terms from entity settings when entity data is available
  // This handles the case where activeEntity loads asynchronously
  useEffect(() => {
    if (initialSetupDoneRef.current) return;
    if (!activeEntity) return;

    if (isEditMode) {
      initialSetupDoneRef.current = true;
      if (hasInitialValues && duplicateHydrationStartedAtRef.current && !duplicateHydrationLoggedRef.current) {
        duplicateHydrationLoggedRef.current = true;
        emitInvoiceCreateDebug({
          stage: "entity_defaults_applied",
          hasInitialValues: true,
          elapsedMs: Number((performance.now() - duplicateHydrationStartedAtRef.current).toFixed(1)),
        });
      }
      return;
    }

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

    initialSetupDoneRef.current = true;
    if (hasInitialValues && duplicateHydrationStartedAtRef.current && !duplicateHydrationLoggedRef.current) {
      duplicateHydrationLoggedRef.current = true;
      emitInvoiceCreateDebug({
        stage: "entity_defaults_applied",
        hasInitialValues: true,
        elapsedMs: Number((performance.now() - duplicateHydrationStartedAtRef.current).toFixed(1)),
      });
    }
  }, [activeEntity, form, hasInitialValues, isEditMode]);

  // Recalculate due date when document date changes (skip in edit mode and custom due days)
  const prevDateRef = useRef(form.getValues("date"));
  useEffect(() => {
    if (isEditMode) return;
    if (!watchedDate || watchedDate === prevDateRef.current) return;
    prevDateRef.current = watchedDate;
    if (dueDaysType !== "custom") {
      const currentDueDate = form.getValues("date_due");
      if (currentDueDate && autoDateDueRef.current && currentDueDate !== autoDateDueRef.current) {
        return;
      }

      const nextDueDate = calculateDueDate(watchedDate, dueDaysType);
      form.setValue("date_due", nextDueDate);
      autoDateDueRef.current = nextDueDate;
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

  const buildPreviewPayload = useCallback(
    (formValues: any): InvoicePreviewPayload => {
      const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(formValues);
      const previewItems = formValues.items?.map((item: any) => {
        const { id: _id, ...rest } = item;
        return rest;
      });
      const previewPayload = {
        number: isNextNumberLoading ? undefined : formValues.number,
        business_unit_id: formValues.business_unit_id ?? null,
        date: formValues.date,
        date_due: formValues.date_due,
        date_service: formValues.date_service,
        date_service_to: formValues.date_service_to,
        customer_id: selectedCustomerId ? formValues.customer_id : undefined,
        customer: formValues.customer,
        items: prepareDocumentItems(previewItems, priceModesRef.current),
        currency_code: formValues.currency_code,
        calculation_mode: eslog.isEnabled ? "b2b_standard" : formValues.calculation_mode,
        linked_documents: formValues.linked_documents,
        ...(forceLinkedDocuments ? { force_linked_documents: true } : {}),
        reference: formValues.reference,
        note: formValues.note,
        payment_terms: formValues.payment_terms,
        tax_clause: formValues.tax_clause,
        footer: formValues.footer,
        signature: formValues.signature,
        ...(!isEditMode && furs.isEnabled && furs.hasPremises
          ? {
              furs: skipFiscalization
                ? { skip: true }
                : activePremiseName && activeDeviceNameForNumber
                  ? {
                      business_premise_name: activePremiseName,
                      electronic_device_name: activeDeviceNameForNumber,
                    }
                  : undefined,
            }
          : {}),
        ...(preservedExpectedTotalWithTax !== undefined
          ? { expected_total_with_tax: preservedExpectedTotalWithTax }
          : {}),
        ...(normalizePtDocumentInput(formValues.pt) ? { pt: normalizePtDocumentInput(formValues.pt) } : {}),
      };

      if (customCreateTemplate && financialInputsMatchSource(formValues)) {
        return applyCustomCreatePreviewTemplate(previewPayload as any, customCreateTemplate);
      }

      return previewPayload;
    },
    [
      activeDeviceNameForNumber,
      activePremiseName,
      customCreateTemplate,
      eslog.isEnabled,
      financialInputsMatchSource,
      forceLinkedDocuments,
      furs.hasPremises,
      furs.isEnabled,
      getPreservedExpectedTotalWithTax,
      isEditMode,
      isNextNumberLoading,
      selectedCustomerId,
      skipFiscalization,
    ],
  );

  const emitCurrentPreviewPayload = useCallback(() => {
    if (!onChange) return;
    const payload = buildPreviewPayload(form.getValues());
    prevPayloadRef.current = JSON.stringify(payload);
    onChange(payload);
  }, [buildPreviewPayload, form, onChange]);

  const previousFiscalPreviewSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    const fiscalPreviewSignature = JSON.stringify({
      skipFiscalization,
      activePremiseName,
      activeDeviceNameForNumber,
      isNextNumberLoading,
    });

    if (previousFiscalPreviewSignatureRef.current === null) {
      previousFiscalPreviewSignatureRef.current = fiscalPreviewSignature;
      return;
    }

    if (previousFiscalPreviewSignatureRef.current === fiscalPreviewSignature) return;
    previousFiscalPreviewSignatureRef.current = fiscalPreviewSignature;

    if (hasInitialValues && !hasEmittedSettledInitialPreviewRef.current) return;
    emitCurrentPreviewPayload();
  }, [
    activeDeviceNameForNumber,
    activePremiseName,
    emitCurrentPreviewPayload,
    hasInitialValues,
    isNextNumberLoading,
    skipFiscalization,
  ]);

  useEffect(() => {
    if (!onChange) return;

    const clearSettledInitialPreview = () => {
      if (initialPreviewTimeoutRef.current) {
        clearTimeout(initialPreviewTimeoutRef.current);
        initialPreviewTimeoutRef.current = null;
      }
      pendingInitialPreviewPayloadRef.current = null;
    };

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
    const subscription = form.watch((formValues, info) => {
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
        const isUserEdit = info.type === "change" || form.formState.isDirty;
        if (hasInitialValues && !hasEmittedSettledInitialPreviewRef.current && !isUserEdit) {
          emitSettledInitialPreview(payload);
        } else {
          if (hasInitialValues && !hasEmittedSettledInitialPreviewRef.current) {
            hasEmittedSettledInitialPreviewRef.current = true;
            clearSettledInitialPreview();
          }
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
  const onInvalidSubmit = (errors: any) => {
    if (eslog.requiresUjpValidation && hasCustomerFieldErrors(errors)) {
      setShowCustomerForm(true);
    }
    scrollToFirstInvalidField(FORM_ID);
  };

  // Show skeleton while loading FURS data and next number
  if (isFormDataLoading) {
    return (
      <div className="space-y-8">
        {/* Recipient + Details columns */}
        <div className="flex w-full flex-col gap-8 md:flex-row md:gap-6">
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
      <FormRoot id={FORM_ID} onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-8">
        <EslogSetupErrorsDialog
          open={eslogSetupDialogOpen}
          onOpenChange={setEslogSetupDialogOpen}
          errors={eslog.entityErrors}
          t={t}
        />

        {/* Croatian domestic invoice validation errors */}
        {finaValidationError && (
          <Alert variant="destructive" data-form-error-summary="true">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{finaValidationError}</AlertTitle>
          </Alert>
        )}

        {/* e-SLOG entity-level validation errors */}
        {eslog.entityErrors.length > 0 && (
          <Alert variant="destructive" data-form-error-summary="true">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("Missing required details")}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{t("The following e-SLOG details need to be updated:")}</p>
              <ul className="list-disc space-y-1 pl-4">
                {eslog.entityErrors.map((error) => (
                  <li key={error.field} className="text-sm">
                    {translateEslogValidationError(error, t)}
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
            onCustomerEdit={handleCustomerEdit}
            showCustomerForm={showCustomerForm}
            shouldFocusName={shouldFocusName}
            selectedCustomerId={selectedCustomerId}
            entityCountryCode={activeEntity?.country_code}
            initialCustomerName={initialCustomerName}
            showEndConsumerToggle={isCroatianEntity && (isDomesticTransaction || is3wTransaction)}
            showBusinessRecipientFields={eslog.isEnabled === true && eslog.requiresUjpValidation}
            showUjpRoutingFields={eslog.isEnabled === true && eslog.requiresUjpValidation}
            showEInvoicingBuyerReference={countryCapabilities.showGermanEInvoicingExports}
            t={t}
            locale={locale}
          />
          <DocumentDetailsSection
            control={form.control}
            documentType={_type}
            t={t}
            locale={locale}
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
            dateLock={{
              isLocked: isFiscalizationDateLocked,
              reason: fiscalizationDateLockReason,
            }}
          >
            {showBusinessUnitSelect && (
              <BusinessUnitSelectField
                control={form.control as any}
                t={t}
                options={businessUnits}
                disabled={disableBusinessUnitSelect}
              />
            )}
            {/* Invoice-specific: Mark as paid section (UI-only state, not in form schema) */}
            {/* Hide in edit mode - payments are managed separately */}
            {!isEditMode && (
              <MarkAsPaidSection
                checked={markAsPaid}
                onCheckedChange={(checked) => {
                  setMarkAsPaid(checked);
                  setPaymentValidationMessage(undefined);
                }}
                paymentRows={paymentRows}
                onPaymentRowsChange={(rows) => {
                  setPaymentRows(rows);
                  setPaymentValidationMessage(undefined);
                }}
                documentTotal={paymentDocumentTotal}
                t={t}
                alwaysShowPaymentType={!!fina.isActive && requiresFinaFiscalization}
                validationMessage={paymentValidationMessage}
              />
            )}
            {detailsExtras}
          </DocumentDetailsSection>
        </div>

        <DocumentItemsSection
          control={form.control}
          documentType={_type}
          watch={form.watch}
          setValue={form.setValue}
          clearErrors={form.clearErrors}
          trigger={form.trigger}
          isSubmitted={form.formState.isSubmitted}
          getValues={form.getValues}
          entityId={entityId}
          currencyCode={activeEntity?.currency_code ?? undefined}
          onAddNewTax={onAddNewTax}
          onFindEstimatedTax={onFindEstimatedTax}
          t={t}
          locale={locale}
          taxesDisabled={reverseChargeApplies}
          taxesDisabledMessage={
            reverseChargeApplies ? t("Reverse charge - tax exempt EU B2B sale") : viesWarning ? viesWarning : undefined
          }
          isTaxSubject={activeEntity?.is_tax_subject ?? false}
          maxTaxesPerItem={activeEntity?.country_rules?.max_taxes_per_item}
          priceModesRef={priceModesRef}
          initialPriceModes={initialPriceModes}
          onItemsStateChange={emitCurrentPreviewPayload}
          translationsEnabled={translationsFeatureEnabled}
          contentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          onContentLocaleChange={setContentLocale}
        />

        <DocumentNoteField
          control={form.control}
          t={t}
          uiLocale={locale}
          entity={activeEntity}
          document={{
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
          translationsEnabled={translationsFeatureEnabled}
          activeContentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          fieldTranslations={(documentTranslations as any)?.note}
          onContentLocaleChange={setContentLocale}
          onFieldTranslationsChange={(next) =>
            form.setValue("translations", { ...(form.getValues("translations") ?? {}), note: next })
          }
        />

        <DocumentTaxClauseField
          control={form.control}
          t={t}
          uiLocale={locale}
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
          translationsEnabled={translationsFeatureEnabled}
          activeContentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          fieldTranslations={(documentTranslations as any)?.tax_clause}
          onContentLocaleChange={setContentLocale}
          onFieldTranslationsChange={(next) =>
            form.setValue("translations", { ...(form.getValues("translations") ?? {}), tax_clause: next })
          }
        />

        <DocumentPaymentTermsField
          control={form.control}
          t={t}
          uiLocale={locale}
          entity={activeEntity}
          document={{
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
          translationsEnabled={translationsFeatureEnabled}
          activeContentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          fieldTranslations={(documentTranslations as any)?.payment_terms}
          onContentLocaleChange={setContentLocale}
          onFieldTranslationsChange={(next) =>
            form.setValue("translations", { ...(form.getValues("translations") ?? {}), payment_terms: next })
          }
        />

        <DocumentSignatureField
          control={form.control}
          t={t}
          uiLocale={locale}
          entity={activeEntity}
          document={{
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
          translationsEnabled={translationsFeatureEnabled}
          activeContentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          fieldTranslations={(documentTranslations as any)?.signature}
          onContentLocaleChange={setContentLocale}
          onFieldTranslationsChange={(next) =>
            form.setValue("translations", { ...(form.getValues("translations") ?? {}), signature: next })
          }
        />

        <DocumentFooterField
          control={form.control}
          t={t}
          uiLocale={locale}
          entity={activeEntity}
          document={{
            number: watchedNumber,
            date: watchedDate,
            date_due: watchedDateDue,
            currency_code: watchedCurrencyCode,
            customer: watchedCustomer as any,
          }}
          translationsEnabled={translationsFeatureEnabled}
          activeContentLocale={contentLocale}
          defaultContentLocale={defaultContentLocale}
          fieldTranslations={(documentTranslations as any)?.footer}
          onContentLocaleChange={setContentLocale}
          onFieldTranslationsChange={(next) =>
            form.setValue("translations", { ...(form.getValues("translations") ?? {}), footer: next })
          }
        />

        {sourceDocuments && sourceDocuments.length > 0 && (
          <LinkedDocumentsInfo documents={sourceDocuments} locale={locale || "en"} t={t} />
        )}
      </FormRoot>
    </Form>
  );
}
