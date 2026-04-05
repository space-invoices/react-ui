import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateEstimateRequest, Estimate, UpdateEstimate } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Form } from "@/ui/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createEstimateSchema } from "@/ui/generated/schemas";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import {
  normalizePtDocumentInput,
  type PtDocumentInputForm,
  ptDocumentInputFormSchema,
} from "@/ui/lib/pt-document-input";
import { normalizeLineItemDiscountsForForm } from "@/ui/lib/schemas/shared";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { CUSTOMERS_CACHE_KEY } from "../../customers/customers.hooks";
import { withEstimateIssueDateValidation } from "../../documents/create/document-date-validation";
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
import { prepareDocumentItems } from "../../documents/create/prepare-document-submission";
import { applyCustomCreateTemplate } from "../../documents/create/custom-create-template";
import { financialInputsMatchInitial, resolvePreservedExpectedTotal } from "../../documents/create/preserved-expected-total";
import type { DocumentTypes } from "../../documents/types";
import { useCreateCustomEstimate, useCreateEstimate, useUpdateEstimate } from "../estimates.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareEstimateSubmission, prepareEstimateUpdateSubmission } from "./prepare-estimate-submission";
import { useEstimateCustomerForm } from "./use-estimate-customer-form";

function calculateDueDate(dateIso: string, days: number): string {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

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
const createEstimateFormSchema = withEstimateIssueDateValidation(
  withRequiredDocumentItemFields(
    createEstimateSchema.extend({
      pt: ptDocumentInputFormSchema.optional(),
    }),
  ),
);

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateEstimateFormValues = z.infer<typeof createEstimateFormSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type EstimatePreviewPayload = Partial<CreateEstimateRequest> & { number?: string; pt?: PtDocumentInputForm };

type CreateEstimateFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: Estimate) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: EstimatePreviewPayload) => void;
  onAddNewTax?: () => void;
  /** Callback to update header action (title toggle) */
  onHeaderActionChange?: (action: ReactNode) => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateEstimateRequest> & {
    number?: string;
    title_type?: "estimate" | "proforma_invoice" | null;
  };
  mode?: "create" | "edit";
  documentId?: string;
  /** Whether draft actions should be available in the UI */
  allowDrafts?: boolean;
  /** Optional app-level content rendered inside the details section. */
  detailsExtras?: ReactNode;
  translationLocale?: string;
} & ComponentTranslationProps;

export default function CreateEstimateForm({
  type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  onHeaderActionChange,
  initialValues,
  mode = "create",
  documentId,
  allowDrafts = true,
  detailsExtras,
  translationLocale,
  t: translateProp,
  namespace,
  locale,
}: CreateEstimateFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();
  const isEditMode = mode === "edit";

  // Title type state: "estimate" (default) or "proforma_invoice"
  const [titleType, setTitleType] = useState<"estimate" | "proforma_invoice">(
    (initialValues as any)?.title_type || "estimate",
  );

  // Draft submission state
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Get default estimate note from entity settings
  const defaultEstimateNote = (activeEntity?.settings as any)?.default_estimate_note || "";
  const defaultEstimateValidDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;

  // Fetch next estimate number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "estimate", {
    enabled: !!entityId && !isEditMode,
  });

  // Get default payment terms and footer from entity settings
  const defaultPaymentTerms = (activeEntity?.settings as any)?.default_estimate_payment_terms || "";
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";

  const form = useForm<CreateEstimateFormValues>({
    resolver: zodResolver(createEstimateFormSchema) as Resolver<CreateEstimateFormValues>,
    defaultValues: {
      number: initialValues?.number ?? "",
      calculation_mode: (initialValues as any)?.calculation_mode ?? undefined,
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateEstimateFormValues["customer"]) ?? undefined,
      items: initialValues?.items?.length
        ? initialValues.items.map((item: any) => ({
            type: item.type ?? undefined,
            name: item.name || "",
            description: item.description || "",
            ...(item.type !== "separator"
              ? {
                  item_id: item.item_id ?? undefined,
                  classification: item.classification ?? undefined,
                  unit: item.unit ?? undefined,
                  quantity: item.quantity ?? 1,
                  // Use gross_price if set, otherwise use price
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
              quantity: 1,
              price: undefined,
              taxes: [],
            },
          ],
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      reference: (initialValues as any)?.reference ?? "",
      note: initialValues?.note ?? (isEditMode ? "" : defaultEstimateNote),
      tax_clause: (initialValues as any)?.tax_clause ?? "",
      payment_terms: initialValues?.payment_terms ?? (isEditMode ? "" : defaultPaymentTerms),
      signature: (initialValues as any)?.signature ?? "",
      footer: (initialValues as any)?.footer ?? (isEditMode ? "" : defaultFooter),
      date_valid_till:
        initialValues?.date_valid_till ||
        (isEditMode
          ? undefined
          : calculateDueDate(initialValues?.date || new Date().toISOString(), defaultEstimateValidDays)),
      pt: ((initialValues as any)?.pt as PtDocumentInputForm | undefined) ?? undefined,
    },
  });

  // Price modes per item (gross vs net) - collected from component state at submit
  const onHeaderActionChangeRef = useRef(onHeaderActionChange);
  onHeaderActionChangeRef.current = onHeaderActionChange;
  const headerActionSignatureRef = useRef<string | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

  // Update number when fetched
  useEffect(() => {
    if (isEditMode) return;
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [form, isEditMode, nextNumberData?.number]);

  // Update default note and valid-till date when entity loads
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultNote = (activeEntity?.settings as any)?.default_estimate_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
    const entityDefaultSignature = (activeEntity?.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
    }
    if (!initialValues?.date_valid_till) {
      const validDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;
      const currentDate = form.getValues("date");
      if (currentDate) {
        form.setValue("date_valid_till", calculateDueDate(currentDate, validDays));
      }
    }
  }, [activeEntity, form, initialValues?.date_valid_till, isEditMode]);

  // Auto-add tax field for tax subject entities
  useEffect(() => {
    if (activeEntity?.is_tax_subject) {
      const items = form.getValues("items") || [];
      if (items.length > 0 && (!items[0].taxes || items[0].taxes.length === 0)) {
        form.setValue("items.0.taxes", [{ tax_id: undefined }]);
      }
    }
  }, [activeEntity?.is_tax_subject, form]);

  // Update header with clickable title toggle
  useEffect(() => {
    const callback = onHeaderActionChangeRef.current;
    if (!callback) {
      headerActionSignatureRef.current = null;
      return;
    }

    const toggleTitle = () => {
      setTitleType((prev) => (prev === "estimate" ? "proforma_invoice" : "estimate"));
    };

    const titleLabel = isEditMode
      ? titleType === "estimate"
        ? t("Estimate")
        : t("Proforma invoice")
      : titleType === "estimate"
        ? t("Create Estimate")
        : t("Create Proforma invoice");
    const tooltipLabel = isEditMode
      ? titleType === "estimate"
        ? t("Click to switch to Proforma invoice")
        : t("Click to switch to Estimate")
      : titleType === "estimate"
        ? t("Click to switch to Proforma invoice")
        : t("Click to switch to Estimate");
    const headerActionSignature = JSON.stringify({
      titleLabel,
      tooltipLabel,
      isEditMode,
      titleType,
    });

    if (headerActionSignatureRef.current === headerActionSignature) return;
    headerActionSignatureRef.current = headerActionSignature;

    callback(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTitle}
              className="flex cursor-pointer items-center gap-2 font-bold text-2xl hover:text-primary"
            >
              {titleLabel}
              <ArrowUpDown className="size-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  }, [isEditMode, t, titleType]);

  useEffect(() => {
    const callback = onHeaderActionChangeRef.current;
    return () => {
      if (!callback || headerActionSignatureRef.current === null) return;
      headerActionSignatureRef.current = null;
      callback(null);
    };
  }, []);

  const formValues = useWatch({
    control: form.control,
  });
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

  // Extract customer management logic into a custom hook
  const {
    originalCustomer,
    showCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    initialCustomerName,
    handleCustomerSelect,
    handleCustomerClear,
  } = useEstimateCustomerForm(form as any);

  const { mutate: createEstimate, isPending } = useCreateEstimate({
    entityId,
    onSuccess: (data) => {
      // Invalidate customers cache when a customer was created/linked
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      onSuccess?.(data);
    },
    onError,
  });
  const { mutate: createCustomEstimate, isPending: isCreateCustomPending } = useCreateCustomEstimate({
    entityId,
    onSuccess: (data) => {
      if (data.customer_id) {
        queryClient.invalidateQueries({ queryKey: [CUSTOMERS_CACHE_KEY] });
      }
      onSuccess?.(data);
    },
    onError,
  });
  const { mutate: updateEstimate, isPending: isUpdatePending } = useUpdateEstimate({
    entityId,
    onSuccess,
    onError,
  });

  // Shared submit logic for both regular save and save as draft
  const submitEstimate = useCallback(
    (values: CreateEstimateFormValues, isDraft: boolean) => {
      try {
        if (isEditMode) {
          if (!documentId) {
            throw new Error("Estimate edit mode requires a documentId");
          }

          const submission = prepareEstimateUpdateSubmission(values as any, {
            originalCustomer,
            priceModes: priceModesRef.current,
            titleType,
          }) as UpdateEstimate;

          updateEstimate({ id: documentId, data: submission });
          return;
        }

        const submission = prepareEstimateSubmission(values, {
          originalCustomer,
          priceModes: priceModesRef.current,
          titleType,
          isDraft,
        });
        const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(values);
        if (preservedExpectedTotalWithTax !== undefined) {
          (submission as any).expected_total_with_tax = preservedExpectedTotalWithTax;
        } else {
          delete (submission as any).expected_total_with_tax;
        }
        if (customCreateTemplate && financialInputsMatchSource(values)) {
          delete (submission as any).expected_total_with_tax;
          createCustomEstimate(applyCustomCreateTemplate(submission as any, customCreateTemplate));
        } else {
          createEstimate(submission);
        }
      } catch (error) {
        console.error("Estimate submission error:", error);
        if (onError) {
          onError(error);
        }
      }
    },
    [
      createEstimate,
      createCustomEstimate,
      customCreateTemplate,
      documentId,
      financialInputsMatchSource,
      getPreservedExpectedTotalWithTax,
      isEditMode,
      onError,
      originalCustomer,
      titleType,
      updateEstimate,
    ],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitEstimate(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitEstimate]);

  const secondaryAction = useMemo(
    () =>
      allowDrafts && !isEditMode
        ? {
            label: t("Save as Draft"),
            onClick: handleSaveAsDraft,
            isPending: isDraftPending,
          }
        : undefined,
    [allowDrafts, t, handleSaveAsDraft, isDraftPending, isEditMode],
  );

  useFormFooterRegistration({
    formId: "create-estimate-form",
    isPending: isPending || isCreateCustomPending || isUpdatePending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: isEditMode ? t("Update") : titleType === "estimate" ? t("Create Estimate") : t("Create Proforma invoice"),
    secondaryAction,
  });

  // Set default payment terms and footer from entity settings when entity data is available
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultPaymentTerms = (activeEntity?.settings as any)?.default_estimate_payment_terms;
    if (entityDefaultPaymentTerms && !form.getValues("payment_terms")) {
      form.setValue("payment_terms", entityDefaultPaymentTerms);
    }
    const entityDefaultFooter = (activeEntity?.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
    }
  }, [activeEntity, form, isEditMode]);

  // Recalculate valid-till date when document date changes
  const prevDateRef = useRef(form.getValues("date"));
  useEffect(() => {
    if (isEditMode) return;
    const currentDate = formValues.date;
    if (!currentDate || currentDate === prevDateRef.current) return;
    prevDateRef.current = currentDate;
    const validDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;
    form.setValue("date_valid_till", calculateDueDate(currentDate, validDays));
  }, [formValues.date, activeEntity, form, isEditMode]);

  const buildPreviewPayload = useCallback(
    (values: CreateEstimateFormValues): EstimatePreviewPayload => {
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
        payment_terms: values.payment_terms,
        signature: values.signature,
        footer: values.footer,
        date_valid_till: values.date_valid_till,
        title_type: titleType,
        ...(preservedExpectedTotalWithTax !== undefined
          ? { expected_total_with_tax: preservedExpectedTotalWithTax }
          : {}),
        ...(normalizePtDocumentInput(values.pt) ? { pt: normalizePtDocumentInput(values.pt) } : {}),
      };
    },
    [getPreservedExpectedTotalWithTax, titleType],
  );

  const emitPreviewPayload = useCallback((payload: EstimatePreviewPayload) => {
    const callback = onChangeRef.current;
    if (!callback) return;

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === prevPayloadRef.current) return;
    prevPayloadRef.current = payloadStr;

    callback(payload);
  }, []);

  useEffect(() => {
    emitPreviewPayload(buildPreviewPayload(formValues as CreateEstimateFormValues));
  }, [buildPreviewPayload, emitPreviewPayload, formValues]);

  const emitCurrentPreviewPayload = useCallback(() => {
    emitPreviewPayload(buildPreviewPayload(form.getValues()));
  }, [buildPreviewPayload, emitPreviewPayload, form]);

  const onSubmit = (values: CreateEstimateFormValues) => {
    submitEstimate(values, false);
  };

  return (
    <Form {...form}>
      <form id="create-estimate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex w-full flex-col gap-8 md:flex-row md:gap-6">
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

          <DocumentDetailsSection control={form.control} documentType={type} t={t} locale={locale}>
            {detailsExtras}
          </DocumentDetailsSection>
        </div>

        <DocumentItemsSection
          control={form.control}
          documentType={type}
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
            date_valid_till: formValues.date_valid_till,
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
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
          transactionType={transactionType}
          isTransactionTypeFetching={isViesFetching}
        />

        <DocumentPaymentTermsField
          control={form.control}
          t={t}
          entity={activeEntity}
          document={{
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
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
            date_valid_till: formValues.date_valid_till,
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
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />
      </form>
    </Form>
  );
}
