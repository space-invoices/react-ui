import { zodResolver } from "@hookform/resolvers/zod";
import type { AdvanceInvoice, CreateAdvanceInvoiceRequest, UpdateAdvanceInvoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, Check, FileCode2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Form, FormRoot } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { useEslogValidation } from "@/ui/hooks/use-eslog-validation";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { usePremiseSelection } from "@/ui/hooks/use-premise-selection";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import {
  buildEslogOptions,
  buildFinaOptions,
  buildFursOptions,
  type FiscalizationOperatorOverride,
} from "@/ui/lib/fiscalization-options";
import {
  normalizePtDocumentInput,
  type PtDocumentInputForm,
  ptDocumentInputFormSchema,
} from "@/ui/lib/pt-document-input";
import { normalizeLineItemDiscountsForForm } from "@/ui/lib/schemas/shared";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import {
  DocumentDetailsSection,
  DocumentFooterField,
  DocumentNoteField,
  DocumentSignatureField,
  DocumentTaxClauseField,
} from "../../documents/create/document-details-section";
import { withRequiredDocumentItemFields } from "../../documents/create/document-item-validation";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import {
  calculateDocumentTotal,
  coercePaymentRowsToType,
  createEmptyPaymentRow,
  type DraftPaymentRow,
  getFirstValidPaymentType,
  serializePaymentRowsForApi,
  validatePaymentRows,
} from "../../documents/create/payment-rows";
import { prepareDocumentItems } from "../../documents/create/prepare-document-submission";
import { applyCustomCreateTemplate } from "../../documents/create/custom-create-template";
import { financialInputsMatchInitial, resolvePreservedExpectedTotal } from "../../documents/create/preserved-expected-total";
import { scrollToFirstInvalidField } from "../../documents/create/scroll-to-first-invalid-field";
import { useDocumentCustomerForm } from "../../documents/create/use-document-customer-form";
import type { DocumentTypes } from "../../documents/types";
import {
  buildEslogFieldErrors,
  getEntityErrors,
  getFormFieldErrors,
  mergeFieldErrors,
  translateEslogValidationError,
  validateEslogForm,
} from "../../invoices/create/eslog-validation";
import invoiceDe from "../../invoices/create/locales/de";
import invoiceEs from "../../invoices/create/locales/es";
import invoiceFr from "../../invoices/create/locales/fr";
import invoiceHr from "../../invoices/create/locales/hr";
import invoiceIt from "../../invoices/create/locales/it";
import invoiceNl from "../../invoices/create/locales/nl";
import invoicePl from "../../invoices/create/locales/pl";
import invoicePt from "../../invoices/create/locales/pt";
import invoiceSl from "../../invoices/create/locales/sl";
import { useCreateAdvanceInvoice, useCreateCustomAdvanceInvoice, useUpdateAdvanceInvoice } from "../advance-invoices.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import {
  prepareAdvanceInvoiceSubmission,
  prepareAdvanceInvoiceUpdateSubmission,
} from "./prepare-advance-invoice-submission";

const translations = {
  sl: { ...invoiceSl, ...sl },
  de: { ...invoiceDe, ...de },
  it: { ...invoiceIt, ...it },
  fr: { ...invoiceFr, ...fr },
  es: { ...invoiceEs, ...es },
  pt: { ...invoicePt, ...pt },
  nl: { ...invoiceNl, ...nl },
  pl: { ...invoicePl, ...pl },
  hr: { ...invoiceHr, ...hr },
} as const;
const FORM_ID = "create-advance-invoice-form";
const createAdvanceInvoiceFormSchema = withRequiredDocumentItemFields(
  createAdvanceInvoiceSchema.extend({
    pt: ptDocumentInputFormSchema.optional(),
  }),
);

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateAdvanceInvoiceFormValues = z.infer<typeof createAdvanceInvoiceFormSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type AdvanceInvoicePreviewPayload = Partial<CreateAdvanceInvoiceRequest> & {
  number?: string;
  pt?: PtDocumentInputForm;
};

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
  /** Whether draft actions should be available in the UI */
  allowDrafts?: boolean;
  mode?: "create" | "edit";
  documentId?: string;
  /** Optional app-level content rendered inside the details section. */
  detailsExtras?: ReactNode;
  /** Request-scoped operator override for embed fiscalization flows. */
  operatorPrefill?: FiscalizationOperatorOverride;
  translationLocale?: string;
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
  allowDrafts = true,
  mode = "create",
  documentId,
  detailsExtras,
  operatorPrefill,
  translationLocale,
  t: translateProp,
  namespace,
  locale,
}: CreateAdvanceInvoiceFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  const { activeEntity } = useEntities();
  const isEditMode = mode === "edit";

  // Advance invoices have their own default note setting.
  // Note: Advance invoices don't have payment terms - they are documents requesting payment.
  const defaultNote =
    (activeEntity?.settings as any)?.default_advance_invoice_note ||
    (activeEntity?.settings as any)?.default_invoice_note ||
    "";
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";

  // ============================================================================
  // FURS & FINA Premise Selection (shared hook)
  // ============================================================================
  const furs = usePremiseSelection({ entityId, type: "furs" });
  const fina = usePremiseSelection({ entityId, type: "fina" });
  const eslog = useEslogValidation(activeEntity);
  const eslogValidationModeRef = useRef<"submit" | "draft">("submit");
  const eslogEntityErrorsRef = useRef(eslog.entityErrors);
  eslogEntityErrorsRef.current = eslog.entityErrors;
  const [skipFiscalization, setSkipFiscalization] = useState(false);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [paymentRows, setPaymentRows] = useState<DraftPaymentRow[]>([createEmptyPaymentRow()]);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState<string | undefined>();
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

  const baseResolver = useMemo(
    () => zodResolver(createAdvanceInvoiceFormSchema) as Resolver<CreateAdvanceInvoiceFormValues>,
    [],
  );
  const eslogResolverStateRef = useRef({
    activeEntity,
    isEditMode,
    isEnabled: eslog.isEnabled === true,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  });
  eslogResolverStateRef.current = {
    activeEntity,
    isEditMode,
    isEnabled: eslog.isEnabled === true,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  };
  const resolver = useMemo<Resolver<CreateAdvanceInvoiceFormValues>>(
    () => async (values, context, options) => {
      const result = await baseResolver(values, context, options);
      const resolverState = eslogResolverStateRef.current;
      const shouldValidateEslog =
        eslogValidationModeRef.current === "submit" && !resolverState.isEditMode && resolverState.isEnabled;

      if (!shouldValidateEslog) {
        eslogEntityErrorsRef.current = [];
        resolverState.setEntityErrors([]);
        return result;
      }

      const validationErrors = validateEslogForm(values as any, resolverState.activeEntity);
      const entityErrors = getEntityErrors(validationErrors);
      eslogEntityErrorsRef.current = entityErrors;
      resolverState.setEntityErrors(entityErrors);

      const fieldErrors = getFormFieldErrors(validationErrors);
      if (fieldErrors.length === 0) {
        return result;
      }

      return {
        values: {},
        errors: mergeFieldErrors(
          result.errors,
          buildEslogFieldErrors<CreateAdvanceInvoiceFormValues>(fieldErrors, resolverState.translate),
        ),
      };
    },
    [baseResolver],
  );

  const form = useForm<CreateAdvanceInvoiceFormValues>({
    resolver,
    defaultValues: {
      number: (initialValues as any)?.number ?? "",
      calculation_mode: (initialValues as any)?.calculation_mode ?? undefined,
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateAdvanceInvoiceFormValues["customer"]) ?? undefined,
      items: initialValues?.items?.length
        ? initialValues.items.map((item: any) => ({
            type: item.type ?? undefined,
            name: item.name || "",
            description: item.description || "",
            ...(item.type !== "separator"
              ? {
                  item_id: item.item_id ?? undefined,
                  quantity: item.quantity ?? 1,
                  price: item.gross_price ?? item.price,
                  gross_price: item.gross_price ?? undefined,
                  unit: item.unit ?? undefined,
                  classification: item.classification ?? undefined,
                  taxes: item.taxes || [],
                  discounts: normalizeLineItemDiscountsForForm(item.discounts),
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
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      reference: (initialValues as any)?.reference ?? "",
      note: initialValues?.note ?? (isEditMode ? "" : defaultNote),
      tax_clause: (initialValues as any)?.tax_clause ?? "",
      footer: (initialValues as any)?.footer ?? (isEditMode ? "" : defaultFooter),
      signature:
        (initialValues as any)?.signature ??
        (isEditMode ? "" : (activeEntity?.settings as any)?.default_document_signature || ""),
      pt: ((initialValues as any)?.pt as PtDocumentInputForm | undefined) ?? undefined,
    },
  });

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const paymentDocumentTotal = useMemo(
    () => calculateDocumentTotal((watchedItems as any[]) ?? [], priceModesRef.current),
    [watchedItems],
  );
  const hasExplicitNonBankTransferPayment =
    markAsPaid && paymentRows.some((row) => row.type != null && row.type !== "bank_transfer");
  const skipPreferenceInitializedRef = useRef(false);
  const skipPaymentCoercionPendingRef = useRef(false);
  const previousSkipFiscalizationRef = useRef(skipFiscalization);
  const previousMarkAsPaidRef = useRef(markAsPaid);

  useEffect(() => {
    if (skipPreferenceInitializedRef.current || furs.isLoading || isEditMode) return;

    skipPreferenceInitializedRef.current = true;
    if (furs.settings?.default_skip_fiscalization === true) {
      setSkipFiscalization(true);
    }
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

  // FURS is "active" for this advance invoice if enabled and we have a valid selection (and not skipped)
  const isFursActive = furs.isActive && !skipFiscalization;

  // Update header action with FURS and e-SLOG toggle buttons
  useEffect(() => {
    if (!onHeaderActionChange) return;
    if (isEditMode) {
      onHeaderActionChange(null);
      return;
    }

    if (furs.isLoading || fina.isLoading) {
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
                    ? t("Click to skip fiscalization for this advance invoice")
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

  const formValues = useWatch({
    control: form.control,
  });
  const watchedValidationSnapshot = useMemo(
    () =>
      JSON.stringify({
        date: formValues.date,
        currency_code: formValues.currency_code,
        customer: formValues.customer,
        items: formValues.items,
      }),
    [formValues.customer, formValues.currency_code, formValues.date, formValues.items],
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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const prevPayloadRef = useRef("");

  // ============================================================================
  // VIES Check - determine if reverse charge applies
  // ============================================================================
  const {
    reverseChargeApplies,
    transactionType,
    isFetching: isViesFetching,
    warning: viesWarning,
  } = useTransactionTypeCheck({
    issuerCountryCode: activeEntity?.country_code,
    isTaxSubject: activeEntity?.is_tax_subject ?? true,
    customerCountry: formValues.customer?.country,
    customerCountryCode: formValues.customer?.country_code,
    customerTaxNumber: formValues.customer?.tax_number,
    customerIsEndConsumer: (formValues.customer as any)?.is_end_consumer,
    enabled: !!activeEntity,
  });

  // FINA numbering guard: use FINA numbering for domestic transactions (or all if unified numbering is on)
  const finaUnifiedNumbering = fina.settings?.unified_numbering !== false;
  const useFinaNumbering =
    !!fina.isActive && (finaUnifiedNumbering || transactionType == null || transactionType === "domestic");
  const isFinaNonDomestic = !!fina.isActive && !useFinaNumbering;

  // ============================================================================
  // Next Advance Invoice Number Preview
  // ============================================================================
  // Use same premise/device params for both FURS and FINA (entity is either one, never both)
  const activePremiseNameForNumber = isFursActive
    ? furs.selectedPremiseName
    : useFinaNumbering
      ? fina.selectedPremiseName
      : undefined;
  const activeDeviceNameForNumber = isFursActive
    ? furs.selectedDeviceName
    : useFinaNumbering
      ? fina.selectedDeviceName
      : undefined;

  const { data: nextNumberData, isLoading: isNextNumberLoading } = useNextDocumentNumber(entityId, "advance_invoice", {
    businessPremiseName: activePremiseNameForNumber,
    electronicDeviceName: activeDeviceNameForNumber,
    enabled:
      !!entityId && !furs.isLoading && furs.isSelectionReady && !fina.isLoading && fina.isSelectionReady && !isEditMode,
  });

  // Overall loading state
  const isFormDataLoading = isEditMode
    ? false
    : furs.isLoading || !furs.isSelectionReady || fina.isLoading || !fina.isSelectionReady || isNextNumberLoading;

  // Pre-fill advance invoice number from preview
  useEffect(() => {
    if (isEditMode) return;
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form, isEditMode]);

  // Auto-populate tax_clause from entity settings when transaction type changes
  const effectiveTransactionType = transactionType ?? "domestic";
  const prevTransactionTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (effectiveTransactionType === prevTransactionTypeRef.current) return;
    prevTransactionTypeRef.current = effectiveTransactionType;
    if (isEditMode) return;

    const taxClauseDefaults = (activeEntity?.settings as any)?.tax_clause_defaults;
    if (!taxClauseDefaults) return;

    const clause = taxClauseDefaults[effectiveTransactionType] ?? "";
    form.setValue("tax_clause", clause);
  }, [effectiveTransactionType, activeEntity, form, isEditMode]);

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
      // Save premise combos to localStorage on successful creation
      furs.saveCombo();
      fina.saveCombo();
      onSuccess?.(data);
    },
    onError,
  });
  const { mutate: createCustomAdvanceInvoice, isPending: isCreateCustomPending } = useCreateCustomAdvanceInvoice({
    entityId,
    onSuccess: (data) => {
      furs.saveCombo();
      fina.saveCombo();
      onSuccess?.(data);
    },
    onError,
  });
  const { mutate: updateAdvanceInvoice, isPending: isUpdatePending } = useUpdateAdvanceInvoice({
    entityId,
    onSuccess,
    onError,
  });

  // Shared submit logic for both regular save and save as draft
  const submitAdvanceInvoice = useCallback(
    (values: CreateAdvanceInvoiceFormValues, isDraft: boolean) => {
      if (!isEditMode && !isDraft && eslog.isEnabled && eslogEntityErrorsRef.current.length > 0) {
        return;
      }

      if (isEditMode) {
        if (!documentId) {
          throw new Error("Advance invoice edit mode requires a documentId");
        }

        const updatePayload = prepareAdvanceInvoiceUpdateSubmission(values, {
          originalCustomer,
          wasCustomerFormShown: showCustomerForm,
          priceModes: priceModesRef.current,
        }) as UpdateAdvanceInvoice;

        updateAdvanceInvoice({ id: documentId, data: updatePayload });
        return;
      }

      const fursOptions = buildFursOptions({
        isDraft,
        isEnabled: furs.isEnabled,
        skipFiscalization,
        premiseName: furs.selectedPremiseName,
        deviceName: furs.selectedDeviceName,
        operator: operatorPrefill,
      });

      const finaOptions = buildFinaOptions({
        isDraft,
        useFinaNumbering,
        premiseName: fina.selectedPremiseName,
        deviceName: fina.selectedDeviceName,
        paymentType: getFirstValidPaymentType(paymentRows),
        operator: operatorPrefill,
      });

      const eslogOptions = buildEslogOptions({
        isDraft,
        isAvailable: eslog.isAvailable,
        isEnabled: eslog.isEnabled,
      });

      if (!isDraft && markAsPaid) {
        const paymentValidation = validatePaymentRows(paymentRows, paymentDocumentTotal, "full_required");
        const paymentMessage =
          paymentValidation.typeError ?? paymentValidation.amountError ?? paymentValidation.totalError;

        if (paymentMessage) {
          setPaymentValidationMessage(paymentMessage);
          return;
        }
      }

      const payload = prepareAdvanceInvoiceSubmission(values, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft ? false : markAsPaid,
        payments: serializePaymentRowsForApi(paymentRows, paymentDocumentTotal, {
          preserveUntouchedAmounts: true,
        }),
        furs: fursOptions,
        fina: finaOptions,
        eslog: eslogOptions,
        priceModes: priceModesRef.current,
        isDraft,
      });
      const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(values);
      if (preservedExpectedTotalWithTax !== undefined) {
        (payload as any).expected_total_with_tax = preservedExpectedTotalWithTax;
      } else {
        delete (payload as any).expected_total_with_tax;
      }

      if (customCreateTemplate && financialInputsMatchSource(values)) {
        delete (payload as any).expected_total_with_tax;
        createCustomAdvanceInvoice(applyCustomCreateTemplate(payload as any, customCreateTemplate));
      } else {
        createAdvanceInvoice(payload);
      }
    },
    [
      createAdvanceInvoice,
      createCustomAdvanceInvoice,
      customCreateTemplate,
      documentId,
      eslog,
      furs,
      fina,
      financialInputsMatchSource,
      getPreservedExpectedTotalWithTax,
      isEditMode,
      useFinaNumbering,
      markAsPaid,
      originalCustomer,
      paymentDocumentTotal,
      paymentRows,
      showCustomerForm,
      skipFiscalization,
      operatorPrefill,
      updateAdvanceInvoice,
    ],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      eslogValidationModeRef.current = "draft";
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitAdvanceInvoice(values, true);
      } else {
        scrollToFirstInvalidField(FORM_ID);
      }
    } finally {
      eslogValidationModeRef.current = "submit";
      setIsDraftPending(false);
    }
  }, [form, submitAdvanceInvoice]);

  useFormFooterRegistration({
    formId: "create-advance-invoice-form",
    isPending: isPending || isCreateCustomPending || isUpdatePending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: isEditMode ? t("Update") : t("Save"),
    secondaryAction:
      allowDrafts && !isEditMode
        ? {
            label: t("Save as Draft"),
            onClick: handleSaveAsDraft,
            isPending: isDraftPending,
          }
        : undefined,
  });

  // Set default note, footer, and signature from entity settings (advance invoices don't have payment terms)
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultNote =
      (activeEntity?.settings as any)?.default_advance_invoice_note ||
      (activeEntity?.settings as any)?.default_invoice_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
    const entityDefaultFooter = (activeEntity?.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
    }
    const entityDefaultSignature = (activeEntity?.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
    }
  }, [activeEntity, form, isEditMode]);

  // Auto-add tax field for tax subject entities
  useEffect(() => {
    if (activeEntity?.is_tax_subject) {
      const items = form.getValues("items") || [];
      if (items.length > 0 && (!items[0].taxes || items[0].taxes.length === 0)) {
        form.setValue("items.0.taxes", [{ tax_id: undefined }]);
      }
    }
  }, [activeEntity?.is_tax_subject, form]);

  const buildPreviewPayload = useCallback(
    (values: CreateAdvanceInvoiceFormValues): AdvanceInvoicePreviewPayload => {
      const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(values);
      return {
        number: values.number,
        date: values.date,
        customer_id: values.customer_id,
        customer: values.customer,
        items: prepareDocumentItems(values.items, priceModesRef.current),
        currency_code: values.currency_code,
        reference: values.reference,
        note: values.note,
        tax_clause: values.tax_clause,
        signature: values.signature,
        footer: values.footer,
        ...(preservedExpectedTotalWithTax !== undefined
          ? { expected_total_with_tax: preservedExpectedTotalWithTax }
          : {}),
        ...(normalizePtDocumentInput(values.pt) ? { pt: normalizePtDocumentInput(values.pt) } : {}),
      };
    },
    [getPreservedExpectedTotalWithTax],
  );

  const emitPreviewPayload = useCallback((payload: AdvanceInvoicePreviewPayload) => {
    const callback = onChangeRef.current;
    if (!callback) return;

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === prevPayloadRef.current) return;
    prevPayloadRef.current = payloadStr;

    callback(payload);
  }, []);

  useEffect(() => {
    emitPreviewPayload(buildPreviewPayload(formValues as CreateAdvanceInvoiceFormValues));
  }, [buildPreviewPayload, emitPreviewPayload, formValues]);

  const emitCurrentPreviewPayload = useCallback(() => {
    emitPreviewPayload(buildPreviewPayload(form.getValues()));
  }, [buildPreviewPayload, emitPreviewPayload, form]);

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
      </div>
    );
  }

  return (
    <Form {...form}>
      <FormRoot id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* e-SLOG entity-level validation errors */}
        {eslog.entityErrors.length > 0 && (
          <Alert variant="destructive" data-form-error-summary="true">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("e-SLOG Validation Failed")}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{t("The following entity settings need to be updated:")}</p>
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
            showCustomerForm={showCustomerForm}
            shouldFocusName={shouldFocusName}
            selectedCustomerId={selectedCustomerId}
            initialCustomerName={initialCustomerName}
            t={t}
            locale={locale}
          />
          <DocumentDetailsSection
            control={form.control}
            documentType={_type}
            t={t}
            locale={locale}
            fursInline={
              !isEditMode && furs.isEnabled && furs.hasPremises
                ? {
                    premises: furs.activePremises.map((p) => ({
                      id: p.id,
                      business_premise_name: p.business_premise_name,
                    })),
                    devices: furs.activeDevices.map((d) => ({
                      id: (d as any).id,
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
          >
            {/* Mark as paid section (UI-only state, not in form schema) */}
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
                alwaysShowPaymentType={!!fina.isActive}
                forced
                validationMessage={paymentValidationMessage}
                requireFullPayment
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
          t={t}
          locale={locale}
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
            number: formValues.number,
            date: formValues.date,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />

        <DocumentTaxClauseField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: formValues.number,
            date: formValues.date,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
          transactionType={transactionType}
          isTransactionTypeFetching={isViesFetching}
          isFinaNonDomestic={isFinaNonDomestic}
        />

        <DocumentSignatureField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: formValues.number,
            date: formValues.date,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />

        <DocumentFooterField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: formValues.number,
            date: formValues.date,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />
      </FormRoot>
    </Form>
  );
}
