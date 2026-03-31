import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateCreditNoteRequest, CreditNote } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/ui/components/ui/button";
import { Form } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createCreditNoteSchema } from "@/ui/generated/schemas";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { usePremiseSelection } from "@/ui/hooks/use-premise-selection";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import { buildFinaOptions, buildFursOptions, type FiscalizationOperatorOverride } from "@/ui/lib/fiscalization-options";
import {
  normalizePtDocumentInput,
  type PtDocumentInputForm,
  ptDocumentInputFormSchema,
} from "@/ui/lib/pt-document-input";
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
  serializePaymentRows,
  validatePaymentRows,
} from "../../documents/create/payment-rows";
import { useDocumentCustomerForm } from "../../documents/create/use-document-customer-form";
import type { DocumentTypes } from "../../documents/types";
import { useCreateCreditNote } from "../credit-notes.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareCreditNoteSubmission } from "./prepare-credit-note-submission";

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
const createCreditNoteFormSchema = withRequiredDocumentItemFields(
  createCreditNoteSchema.extend({
    pt: ptDocumentInputFormSchema.optional(),
  }),
);

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

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateCreditNoteFormValues = z.infer<typeof createCreditNoteFormSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type CreditNotePreviewPayload = Partial<CreateCreditNoteRequest> & { number?: string; pt?: PtDocumentInputForm };

type CreateCreditNoteFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: CreditNote) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: CreditNotePreviewPayload) => void;
  onAddNewTax?: () => void;
  onHeaderActionChange?: (action: ReactNode | null) => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateCreditNoteRequest>;
  /** Whether draft actions should be available in the UI */
  allowDrafts?: boolean;
  /** Optional app-level content rendered inside the details section. */
  detailsExtras?: ReactNode;
  /** Request-scoped operator override for embed fiscalization flows. */
  operatorPrefill?: FiscalizationOperatorOverride;
  translationLocale?: string;
} & ComponentTranslationProps;

export default function CreateCreditNoteForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onHeaderActionChange,
  initialValues,
  allowDrafts = true,
  detailsExtras,
  operatorPrefill,
  translationLocale,
  t: translateProp,
  namespace,
  locale,
}: CreateCreditNoteFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();

  // ============================================================================
  // FURS & FINA Premise Selection (shared hook)
  // ============================================================================
  const furs = usePremiseSelection({ entityId, type: "furs" });
  const fina = usePremiseSelection({ entityId, type: "fina" });
  const [skipFiscalization, setSkipFiscalization] = useState(false);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentRows, setPaymentRows] = useState<DraftPaymentRow[]>([createEmptyPaymentRow()]);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState<string | undefined>();
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Service date type state (single date or range)
  const [serviceDateType, setServiceDateType] = useState<"single" | "range">(
    initialValues && (initialValues as any).date_service_to ? "range" : "single",
  );

  // Price modes per item (gross vs net) - collected from component state at submit
  const initialPriceModes = useMemo(() => {
    if (!initialValues?.items) return {};
    return initialValues.items.reduce((acc, item, index) => {
      acc[index] = item.gross_price != null;
      return acc;
    }, {} as PriceModesMap);
  }, [initialValues?.items]);
  const priceModesRef = useRef<PriceModesMap>(initialPriceModes);

  // Get default payment terms and footer from entity settings
  const defaultPaymentTerms = (activeEntity?.settings as any)?.default_credit_note_payment_terms || "";
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";

  const form = useForm<CreateCreditNoteFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createCreditNoteFormSchema) as Resolver<CreateCreditNoteFormValues>,
    defaultValues: {
      number: "",
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateCreditNoteFormValues["customer"]) ?? undefined,
      items: initialValues?.items?.length
        ? initialValues.items.map((item: any) => ({
            type: item.type,
            name: item.name || "",
            description: item.description || "",
            ...(item.type !== "separator"
              ? {
                  quantity: item.quantity ?? 1,
                  // Use gross_price if set, otherwise use price
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
      date_service: (initialValues as any)?.date_service || new Date().toISOString(),
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      reference: (initialValues as any)?.reference ?? "",
      note: initialValues?.note ?? "",
      tax_clause: (initialValues as any)?.tax_clause ?? "",
      payment_terms: initialValues?.payment_terms ?? defaultPaymentTerms,
      footer: (initialValues as any)?.footer ?? defaultFooter,
      pt: ((initialValues as any)?.pt as PtDocumentInputForm | undefined) ?? undefined,
    },
  });

  const formValues = useWatch({
    control: form.control,
  });
  const paymentDocumentTotal = useMemo(
    () => calculateDocumentTotal((formValues as any)?.items ?? [], priceModesRef.current),
    [formValues],
  );
  const hasExplicitNonBankTransferPayment =
    markAsPaid && paymentRows.some((row) => row.type != null && row.type !== "bank_transfer");
  const skipPreferenceInitializedRef = useRef(false);
  const skipPaymentCoercionPendingRef = useRef(false);
  const previousSkipFiscalizationRef = useRef(skipFiscalization);
  const previousMarkAsPaidRef = useRef(markAsPaid);
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
  const isFursActive = furs.isActive && !skipFiscalization;
  const isFiscalizationDateLocked = isFursActive || useFinaNumbering;
  const fiscalizationDateLockReason = useFinaNumbering
    ? t("FINA fiscalized invoices always use the current date")
    : t("FURS fiscalized invoices always use the current date");

  useEffect(() => {
    if (skipPreferenceInitializedRef.current || furs.isLoading) return;

    skipPreferenceInitializedRef.current = true;
    if (furs.settings?.default_skip_fiscalization === true) {
      setSkipFiscalization(true);
    }
  }, [furs.isLoading, furs.settings?.default_skip_fiscalization]);

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

  // ============================================================================
  // Next Credit Note Number Preview
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

  const { data: nextNumberData, isLoading: isNextNumberLoading } = useNextDocumentNumber(entityId, "credit_note", {
    businessPremiseName: activePremiseNameForNumber,
    electronicDeviceName: activeDeviceNameForNumber,
    enabled: !!entityId && !furs.isLoading && furs.isSelectionReady && !fina.isLoading && fina.isSelectionReady,
  });

  // Overall loading state
  const isFormDataLoading =
    furs.isLoading || !furs.isSelectionReady || fina.isLoading || !fina.isSelectionReady || isNextNumberLoading;

  useEffect(() => {
    if (!onHeaderActionChange) return;

    if (furs.isLoading || fina.isLoading) {
      onHeaderActionChange(null);
      return;
    }

    const showFursToggle = furs.isEnabled && furs.hasPremises;
    if (!showFursToggle) {
      onHeaderActionChange(null);
      return;
    }

    const isFursChecked = !skipFiscalization;

    onHeaderActionChange(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isFursChecked ? "outline" : "ghost"}
              size="sm"
              className={cn("h-8 cursor-pointer gap-2", !isFursChecked && "text-destructive hover:text-destructive")}
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
            {isFursChecked ? t("Click to skip fiscalization for this credit note") : t("Click to enable fiscalization")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  }, [fina.isLoading, furs.hasPremises, furs.isEnabled, furs.isLoading, onHeaderActionChange, skipFiscalization, t]);

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

  // Clear date_service_to when switching from range to single
  useEffect(() => {
    if (serviceDateType === "single") {
      form.setValue("date_service_to", undefined);
    }
  }, [serviceDateType, form]);

  // Extract customer management logic into a shared hook
  const {
    originalCustomer,
    showCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    initialCustomerName,
    handleCustomerSelect,
    handleCustomerClear,
  } = useDocumentCustomerForm(form);

  // Pre-fill credit note number from preview
  useEffect(() => {
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form]);

  useEffect(() => {
    if (!isFiscalizationDateLocked) return;

    const today = new Date();
    if (isSameCalendarDate(form.getValues("date"), today)) return;

    form.setValue("date", today.toISOString(), {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, isFiscalizationDateLocked]);

  const { mutate: createCreditNote, isPending } = useCreateCreditNote({
    entityId,
    onSuccess: (data) => {
      // Save FURS/FINA combos to localStorage on successful creation
      furs.saveCombo();
      fina.saveCombo();
      // Invalidate customers cache when a customer was created/linked
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      onSuccess?.(data);
    },
    onError,
  });

  // Shared submit logic for both regular save and save as draft
  const submitCreditNote = useCallback(
    (values: CreateCreditNoteFormValues, isDraft: boolean) => {
      // Build FURS options (skip for drafts; user can also skip fiscalization explicitly)
      const fursOptions = buildFursOptions({
        isDraft,
        isEnabled: furs.isEnabled,
        skipFiscalization,
        premiseName: furs.selectedPremiseName,
        deviceName: furs.selectedDeviceName,
        operator: operatorPrefill,
      });

      // Build FINA options (skip for drafts; FINA can't be skipped)
      const finaOptions = buildFinaOptions({
        isDraft,
        useFinaNumbering,
        premiseName: fina.selectedPremiseName,
        deviceName: fina.selectedDeviceName,
        paymentType: getFirstValidPaymentType(paymentRows),
        operator: operatorPrefill,
      });

      if (!isDraft && markAsPaid) {
        const paymentValidation = validatePaymentRows(paymentRows, paymentDocumentTotal, "partial_allowed");
        const paymentMessage =
          paymentValidation.typeError ?? paymentValidation.amountError ?? paymentValidation.totalError;

        if (paymentMessage) {
          setPaymentValidationMessage(paymentMessage);
          return;
        }
      }

      const payload = prepareCreditNoteSubmission(values, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft ? false : markAsPaid,
        payments: serializePaymentRows(paymentRows, paymentDocumentTotal),
        priceModes: priceModesRef.current,
        isDraft,
      });

      // Add FURS data to payload
      if (fursOptions) {
        (payload as any).furs = fursOptions;
      }

      // Add FINA data to payload
      if (finaOptions) {
        (payload as any).fina = finaOptions;
      }

      createCreditNote(payload as CreateCreditNoteRequest);
    },
    [
      createCreditNote,
      fina,
      furs,
      markAsPaid,
      originalCustomer,
      paymentDocumentTotal,
      paymentRows,
      showCustomerForm,
      skipFiscalization,
      operatorPrefill,
      useFinaNumbering,
    ],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitCreditNote(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitCreditNote]);

  useFormFooterRegistration({
    formId: "create-credit-note-form",
    isPending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: t("Save"),
    secondaryAction: allowDrafts
      ? {
          label: t("Save as Draft"),
          onClick: handleSaveAsDraft,
          isPending: isDraftPending,
        }
      : undefined,
  });

  // Set default note and payment terms from entity settings when entity data is available
  useEffect(() => {
    const entityDefaultNote = (activeEntity?.settings as any)?.default_credit_note_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
    const entityDefaultPaymentTerms = (activeEntity?.settings as any)?.default_credit_note_payment_terms;
    if (entityDefaultPaymentTerms && !form.getValues("payment_terms")) {
      form.setValue("payment_terms", entityDefaultPaymentTerms);
    }
    const entityDefaultFooter = (activeEntity?.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
    }
    const entityDefaultSignature = (activeEntity?.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
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

  const buildPreviewPayload = useCallback((values: CreateCreditNoteFormValues): CreditNotePreviewPayload => {
    const currentItems = values.items || [];

    const transformedItems = currentItems.map((item: any, index: number) => {
      const { price, ...rest } = item;
      const isGross = priceModesRef.current[index] ?? false;
      return isGross ? { ...rest, gross_price: price } : { ...rest, price };
    });

    return {
      number: values.number,
      date: values.date,
      date_service: (values as any).date_service,
      date_service_to: (values as any).date_service_to,
      customer_id: values.customer_id,
      customer: values.customer,
      items: transformedItems,
      currency_code: values.currency_code,
      reference: values.reference,
      note: values.note,
      payment_terms: values.payment_terms,
      signature: values.signature,
      ...(normalizePtDocumentInput(values.pt) ? { pt: normalizePtDocumentInput(values.pt) } : {}),
    };
  }, []);

  const emitPreviewPayload = useCallback((payload: CreditNotePreviewPayload) => {
    const callback = onChangeRef.current;
    if (!callback) return;

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === prevPayloadRef.current) return;
    prevPayloadRef.current = payloadStr;

    callback(payload);
  }, []);

  useEffect(() => {
    emitPreviewPayload(buildPreviewPayload(formValues as CreateCreditNoteFormValues));
  }, [buildPreviewPayload, emitPreviewPayload, formValues]);

  const emitCurrentPreviewPayload = useCallback(() => {
    emitPreviewPayload(buildPreviewPayload(form.getValues()));
  }, [buildPreviewPayload, emitPreviewPayload, form]);

  const onSubmit = (values: CreateCreditNoteFormValues) => {
    submitCreditNote(values, false);
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
      <form id="create-credit-note-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              furs.isEnabled && furs.hasPremises
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
            serviceDate={{
              dateType: serviceDateType,
              onDateTypeChange: setServiceDateType,
            }}
            finaInline={
              useFinaNumbering
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
            dateLock={{
              isLocked: isFiscalizationDateLocked,
              reason: fiscalizationDateLockReason,
            }}
          >
            {/* Credit note specific: Mark as paid section (UI-only state, not in form schema) */}
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
              validationMessage={paymentValidationMessage}
            />
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
          maxTaxesPerItem={activeEntity?.country_rules?.max_taxes_per_item}
          priceModesRef={priceModesRef}
          initialPriceModes={initialPriceModes}
          onItemsStateChange={emitCurrentPreviewPayload}
          taxesDisabled={reverseChargeApplies}
          taxesDisabledMessage={
            reverseChargeApplies ? t("Reverse charge - tax exempt EU B2B sale") : viesWarning ? viesWarning : undefined
          }
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

        <DocumentPaymentTermsField
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
      </form>
    </Form>
  );
}
