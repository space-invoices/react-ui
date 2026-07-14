import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateEstimate, Estimate, Tax, UpdateEstimate } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Form } from "@/ui/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createEstimateSchema } from "@/ui/generated/schemas";
import { getInitialEslogValidationEnabled, useEslogValidation } from "@/ui/hooks/use-eslog-validation";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATIONS_FEATURE,
  type DocumentContentLocaleMode,
} from "@/ui/lib/document-content-translations";
import { buildEslogOptions } from "@/ui/lib/fiscalization-options";
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
import {
  financialInputsMatchInitial,
  resolvePreservedExpectedTotal,
} from "../../documents/create/preserved-expected-total";
import type { DocumentTypes } from "../../documents/types";
import { EslogSetupErrorsDialog } from "../../invoices/create/eslog-setup-errors-dialog";
import {
  buildEslogFieldErrors,
  getEntityErrors,
  getFormFieldErrors,
  mergeFieldErrors,
  translateEslogValidationError,
  validateEslogForm,
} from "../../invoices/create/eslog-validation";
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
      business_unit_id: z.string().nullish(),
      pt: ptDocumentInputFormSchema.optional(),
    }),
  ),
);

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateEstimateFormValues = z.infer<typeof createEstimateFormSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type EstimatePreviewPayload = Partial<CreateEstimate> & {
  number?: string;
  pt?: PtDocumentInputForm;
  business_unit_id?: string | null;
};

type CreateEstimateFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: Estimate) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: EstimatePreviewPayload) => void;
  onAddNewTax?: () => void;
  onFindEstimatedTax?: () => Promise<Tax | null | undefined> | Tax | null | undefined;
  /** Callback to update header action (title toggle) */
  onHeaderActionChange?: (action: ReactNode) => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateEstimate> & {
    number?: string;
    business_unit_id?: string | null;
    title_type?: "estimate" | "proforma_invoice" | null;
  };
  businessUnits?: BusinessUnitOption[];
  showBusinessUnitSelect?: boolean;
  disableBusinessUnitSelect?: boolean;
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
  onFindEstimatedTax,
  onHeaderActionChange,
  initialValues,
  businessUnits = [],
  showBusinessUnitSelect = businessUnits.length > 0 || !!(initialValues as any)?.business_unit_id,
  disableBusinessUnitSelect = false,
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
  const whiteLabel = useWhiteLabel();
  const queryClient = useQueryClient();
  const isEditMode = mode === "edit";
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

  // Title type state: "estimate" (default) or "proforma_invoice"
  const [titleType, setTitleType] = useState<"estimate" | "proforma_invoice">(
    (initialValues as any)?.title_type || "estimate",
  );

  // Draft submission state
  const [isDraftPending, setIsDraftPending] = useState(false);
  const initialEslogEnabled = getInitialEslogValidationEnabled(isEditMode, (initialValues as any)?.eslog);
  const eslog = useEslogValidation(activeEntity, initialEslogEnabled);
  const eslogEntityErrorsRef = useRef(eslog.entityErrors);
  eslogEntityErrorsRef.current = eslog.entityErrors;
  const [eslogSetupDialogOpen, setEslogSetupDialogOpen] = useState(false);
  const eslogResolverStateRef = useRef({
    activeEntity,
    isEnabled: eslog.isEnabled === true,
    isEditMode,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  });
  eslogResolverStateRef.current = {
    activeEntity,
    isEnabled: eslog.isEnabled === true,
    isEditMode,
    translate: t,
    setEntityErrors: eslog.setEntityErrors,
  };

  // Get default estimate note from entity settings
  const initialDocumentDefaults = getDocumentDefaultFields("estimate", initialMergedSettings);
  const defaultEstimateValidDays = (initialMergedSettings as any)?.default_estimate_valid_days ?? 30;

  const baseResolver = useMemo(() => zodResolver(createEstimateFormSchema) as Resolver<CreateEstimateFormValues>, []);
  const resolver = useMemo<Resolver<CreateEstimateFormValues>>(
    () => async (values, context, options) => {
      const result = await baseResolver(values, context, options);
      const resolverState = eslogResolverStateRef.current;
      const shouldValidateEslog = resolverState.isEnabled;

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
          buildEslogFieldErrors<CreateEstimateFormValues>(fieldErrors, resolverState.translate),
        ),
      };
    },
    [baseResolver],
  );

  const form = useForm<CreateEstimateFormValues>({
    resolver,
    defaultValues: {
      number: initialValues?.number ?? "",
      business_unit_id: (initialValues as any)?.business_unit_id ?? null,
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
            translations: item.translations ?? {},
            ...(item.type !== "separator"
              ? {
                  item_id: item.item_id ?? undefined,
                  classification: item.classification ?? undefined,
                  unit: item.unit ?? undefined,
                  financial_category_id: item.financial_category_id ?? undefined,
                  e_invoicing: item.e_invoicing ?? undefined,
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
              translations: {},
              quantity: 1,
              price: undefined,
              taxes: [],
            },
          ],
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      reference: (initialValues as any)?.reference ?? "",
      note: initialValues?.note ?? (isEditMode ? "" : initialDocumentDefaults.note),
      tax_clause: (initialValues as any)?.tax_clause ?? "",
      payment_terms: initialValues?.payment_terms ?? (isEditMode ? "" : initialDocumentDefaults.payment_terms),
      signature: (initialValues as any)?.signature ?? (isEditMode ? "" : initialDocumentDefaults.signature),
      footer: (initialValues as any)?.footer ?? (isEditMode ? "" : initialDocumentDefaults.footer),
      translations:
        (initialValues as any)?.translations ??
        (isEditMode
          ? {}
          : {
              note: initialDocumentDefaults.translations.note,
              payment_terms: initialDocumentDefaults.translations.payment_terms,
              footer: initialDocumentDefaults.translations.footer,
              signature: initialDocumentDefaults.translations.signature,
            }),
      date_valid_till:
        initialValues?.date_valid_till ||
        (isEditMode
          ? undefined
          : calculateDueDate(initialValues?.date || new Date().toISOString(), defaultEstimateValidDays)),
      pt: ((initialValues as any)?.pt as PtDocumentInputForm | undefined) ?? undefined,
    },
  });
  const autoDateValidTillRef = useRef<string | undefined>(
    !isEditMode && !initialValues?.date_valid_till ? form.getValues("date_valid_till") : undefined,
  );
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
  const effectiveDefaultEstimateValidDays = (mergedSettings as any)?.default_estimate_valid_days ?? 30;
  const derivedDocumentDefaults = useMemo(() => getDocumentDefaultFields("estimate", mergedSettings), [mergedSettings]);
  const appliedDerivedDefaultsRef = useRef(derivedDocumentDefaults);

  // Fetch next estimate number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "estimate", {
    businessUnitId: selectedBusinessUnitId ?? null,
    enabled: !!entityId && !isEditMode,
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

  // Update default note/signature/footer/payment terms when unit selection changes
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

  // Update valid-till date when entity or business-unit defaults change, unless the user changed it manually.
  useEffect(() => {
    if (isEditMode) return;
    if (!initialValues?.date_valid_till) {
      const currentDate = form.getValues("date");
      if (currentDate) {
        const currentValidTill = form.getValues("date_valid_till");
        if (currentValidTill && autoDateValidTillRef.current && currentValidTill !== autoDateValidTillRef.current) {
          return;
        }

        const nextValidTill = calculateDueDate(currentDate, effectiveDefaultEstimateValidDays);
        form.setValue("date_valid_till", nextValidTill, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
        autoDateValidTillRef.current = nextValidTill;
      }
    }
  }, [effectiveDefaultEstimateValidDays, form, initialValues?.date_valid_till, isEditMode]);

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
    handleCustomerEdit,
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
        const submissionValues: CreateEstimateFormValues = eslog.isEnabled
          ? { ...values, calculation_mode: "b2b_standard" as const }
          : values;
        const eslogOptions = buildEslogOptions({
          isDraft,
          isAvailable: eslog.isAvailable,
          isEnabled: eslog.isEnabled,
        });

        if (eslog.isEnabled && eslogEntityErrorsRef.current.length > 0) {
          setEslogSetupDialogOpen(true);
          return;
        }

        if (isEditMode) {
          if (!documentId) {
            throw new Error("Estimate edit mode requires a documentId");
          }

          const submission = prepareEstimateUpdateSubmission(submissionValues as any, {
            originalCustomer,
            priceModes: priceModesRef.current,
            titleType,
            eslog: eslogOptions,
          }) as UpdateEstimate;

          updateEstimate({ id: documentId, data: submission });
          return;
        }

        const submission = prepareEstimateSubmission(submissionValues, {
          originalCustomer,
          priceModes: priceModesRef.current,
          titleType,
          isDraft,
          eslog: eslogOptions,
        });
        const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(submissionValues);
        if (preservedExpectedTotalWithTax !== undefined) {
          (submission as any).expected_total_with_tax = preservedExpectedTotalWithTax;
        } else {
          delete (submission as any).expected_total_with_tax;
        }
        if (customCreateTemplate && financialInputsMatchSource(submissionValues)) {
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
      eslog,
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
    const currentValidTill = form.getValues("date_valid_till");
    if (currentValidTill && autoDateValidTillRef.current && currentValidTill !== autoDateValidTillRef.current) {
      return;
    }

    const nextValidTill = calculateDueDate(currentDate, effectiveDefaultEstimateValidDays);
    form.setValue("date_valid_till", nextValidTill);
    autoDateValidTillRef.current = nextValidTill;
  }, [formValues.date, effectiveDefaultEstimateValidDays, form, isEditMode]);

  const buildPreviewPayload = useCallback(
    (values: CreateEstimateFormValues): EstimatePreviewPayload => {
      const preservedExpectedTotalWithTax = getPreservedExpectedTotalWithTax(values);
      const previewPayload = {
        number: values.number,
        business_unit_id: values.business_unit_id ?? null,
        date: values.date,
        customer_id: values.customer_id,
        customer: values.customer,
        items: prepareDocumentItems(values.items, priceModesRef.current),
        currency_code: values.currency_code,
        calculation_mode: eslog.isEnabled ? "b2b_standard" : values.calculation_mode,
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

      if (customCreateTemplate && financialInputsMatchSource(values)) {
        return applyCustomCreatePreviewTemplate(previewPayload as any, customCreateTemplate) as EstimatePreviewPayload;
      }

      return previewPayload;
    },
    [customCreateTemplate, eslog.isEnabled, financialInputsMatchSource, getPreservedExpectedTotalWithTax, titleType],
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
        <EslogSetupErrorsDialog
          open={eslogSetupDialogOpen}
          onOpenChange={setEslogSetupDialogOpen}
          errors={eslog.entityErrors}
          t={t}
        />

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

        <div className="flex w-full flex-col gap-8 md:flex-row md:gap-6">
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
            t={t}
            locale={locale}
          />

          <DocumentDetailsSection control={form.control} documentType={type} t={t} locale={locale}>
            {showBusinessUnitSelect && (
              <BusinessUnitSelectField
                control={form.control as any}
                t={t}
                options={businessUnits}
                disabled={disableBusinessUnitSelect}
              />
            )}
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
          onFindEstimatedTax={onFindEstimatedTax}
          t={t}
          locale={locale}
          isTaxSubject={activeEntity?.is_tax_subject ?? false}
          maxTaxesPerItem={activeEntity?.country_rules?.max_taxes_per_item}
          priceModesRef={priceModesRef}
          initialPriceModes={initialPriceModes}
          onItemsStateChange={emitCurrentPreviewPayload}
          taxesDisabled={reverseChargeApplies}
          taxesDisabledMessage={
            reverseChargeApplies ? t("Reverse charge - tax exempt EU B2B sale") : viesWarning ? viesWarning : undefined
          }
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
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
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
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
          transactionType={transactionType}
          isTransactionTypeFetching={isViesFetching}
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
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
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
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
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
            number: formValues.number,
            date: formValues.date,
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
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
      </form>
    </Form>
  );
}
