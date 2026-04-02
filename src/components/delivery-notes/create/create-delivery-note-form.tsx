import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateDeliveryNoteRequest, DeliveryNote, UpdateDeliveryNote } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form } from "@/ui/components/ui/form";
import { Label } from "@/ui/components/ui/label";
import { createDeliveryNoteSchema } from "@/ui/generated/schemas";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import { normalizeLineItemDiscountsForForm } from "@/ui/lib/schemas/shared";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { CUSTOMERS_CACHE_KEY } from "../../customers/customers.hooks";
import {
  DocumentDetailsSection,
  DocumentFooterField,
  DocumentNoteField,
  DocumentSignatureField,
  DocumentTaxClauseField,
} from "../../documents/create/document-details-section";
import { withRequiredDocumentItemFields } from "../../documents/create/document-item-validation";
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { prepareDocumentItems } from "../../documents/create/prepare-document-submission";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import type { DocumentTypes } from "../../documents/types";
import { useCreateDeliveryNote, useUpdateDeliveryNote } from "../delivery-notes.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareDeliveryNoteSubmission, prepareDeliveryNoteUpdateSubmission } from "./prepare-delivery-note-submission";
import { useDeliveryNoteCustomerForm } from "./use-delivery-note-customer-form";

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
type CreateDeliveryNoteFormValues = z.infer<typeof createDeliveryNoteSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type DeliveryNotePreviewPayload = Partial<CreateDeliveryNoteRequest> & { number?: string };

type CreateDeliveryNoteFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: DeliveryNote) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: DeliveryNotePreviewPayload) => void;
  onAddNewTax?: () => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateDeliveryNoteRequest>;
  /** Whether draft actions should be available in the UI */
  allowDrafts?: boolean;
  mode?: "create" | "edit";
  documentId?: string;
  translationLocale?: string;
} & ComponentTranslationProps;

export default function CreateDeliveryNoteForm({
  type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  initialValues,
  allowDrafts = true,
  mode = "create",
  documentId,
  translationLocale,
  t: translateProp,
  namespace,
  locale,
}: CreateDeliveryNoteFormProps) {
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

  // Draft submission state
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Hide prices state (delivery note specific)
  const defaultHidePrices = (activeEntity?.settings as any)?.delivery_note_hide_prices ?? false;
  const defaultNote = (activeEntity?.settings as any)?.default_delivery_note_note || "";
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";
  const [hidePrices, setHidePrices] = useState<boolean>((initialValues as any)?.hide_prices ?? defaultHidePrices);

  // Fetch next delivery note number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "delivery_note", {
    enabled: !!entityId && !isEditMode,
  });

  const form = useForm<CreateDeliveryNoteFormValues>({
    resolver: zodResolver(
      withRequiredDocumentItemFields(createDeliveryNoteSchema),
    ) as Resolver<CreateDeliveryNoteFormValues>,
    defaultValues: {
      number: (initialValues as any)?.number ?? "",
      calculation_mode: (initialValues as any)?.calculation_mode ?? undefined,
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateDeliveryNoteFormValues["customer"]) ?? undefined,
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
      signature: (initialValues as any)?.signature ?? (isEditMode ? "" : (activeEntity?.settings as any)?.default_document_signature || ""),
    },
  });

  // Price modes per item (gross vs net) - collected from component state at submit
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

  // Update number when fetched
  useEffect(() => {
    if (isEditMode) return;
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form, isEditMode]);

  // Set default footer from entity settings when entity data is available
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultFooter = (activeEntity?.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
    }
  }, [activeEntity, form, isEditMode]);

  // Set default note from entity settings when entity data is available
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultNote = (activeEntity?.settings as any)?.default_delivery_note_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
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

  // Set default signature from entity settings
  useEffect(() => {
    if (isEditMode) return;
    const entityDefaultSignature = (activeEntity?.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
    }
  }, [activeEntity, form, isEditMode]);

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
  } = useDeliveryNoteCustomerForm(form as any);

  const { mutate: createDeliveryNote, isPending } = useCreateDeliveryNote({
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
  const { mutate: updateDeliveryNote, isPending: isUpdatePending } = useUpdateDeliveryNote({
    entityId,
    onSuccess,
    onError,
  });

  // Shared submit logic for both regular save and save as draft
  const submitDeliveryNote = useCallback(
    (values: CreateDeliveryNoteFormValues, isDraft: boolean) => {
      try {
        if (isEditMode) {
          if (!documentId) {
            throw new Error("Delivery note edit mode requires a documentId");
          }

          const updatePayload = prepareDeliveryNoteUpdateSubmission(values, {
            originalCustomer,
            priceModes: priceModesRef.current,
            hidePrices,
          }) as UpdateDeliveryNote;
          updateDeliveryNote({ id: documentId, data: updatePayload });
          return;
        }

        const submission = prepareDeliveryNoteSubmission(values, {
          originalCustomer,
          priceModes: priceModesRef.current,
          isDraft,
          hidePrices,
        });
        createDeliveryNote(submission);
      } catch (error) {
        console.error("Delivery note submission error:", error);
        if (onError) {
          onError(error);
        }
      }
    },
    [createDeliveryNote, documentId, hidePrices, isEditMode, onError, originalCustomer, updateDeliveryNote],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitDeliveryNote(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitDeliveryNote]);

  const secondaryAction = useMemo(
    () =>
      allowDrafts && !isEditMode
        ? {
            label: t("Save as Draft"),
            onClick: handleSaveAsDraft,
            isPending: isDraftPending,
          }
        : undefined,
    [allowDrafts, isEditMode, t, handleSaveAsDraft, isDraftPending],
  );

  useFormFooterRegistration({
    formId: "create-delivery-note-form",
    isPending: isPending || isUpdatePending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: isEditMode ? t("Update") : t("Create Delivery Note"),
    secondaryAction,
  });

  const buildPreviewPayload = useCallback(
    (values: CreateDeliveryNoteFormValues): DeliveryNotePreviewPayload => {
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
        hide_prices: hidePrices,
      };
    },
    [hidePrices],
  );

  const emitPreviewPayload = useCallback((payload: DeliveryNotePreviewPayload) => {
    const callback = onChangeRef.current;
    if (!callback) return;

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === prevPayloadRef.current) return;
    prevPayloadRef.current = payloadStr;

    callback(payload);
  }, []);

  useEffect(() => {
    emitPreviewPayload(buildPreviewPayload(formValues as CreateDeliveryNoteFormValues));
  }, [buildPreviewPayload, emitPreviewPayload, formValues]);

  const emitCurrentPreviewPayload = useCallback(() => {
    emitPreviewPayload(buildPreviewPayload(form.getValues()));
  }, [buildPreviewPayload, emitPreviewPayload, form]);

  const onSubmit = (values: CreateDeliveryNoteFormValues) => {
    submitDeliveryNote(values, false);
  };

  return (
    <Form {...form}>
      <form id="create-delivery-note-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

          <DocumentDetailsSection control={form.control} documentType={type} t={t} locale={locale}>
            {/* Delivery note specific: Hide prices toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-prices"
                checked={hidePrices}
                onCheckedChange={(checked) => setHidePrices(checked === true)}
              />
              <Label htmlFor="hide-prices" className="cursor-pointer font-normal text-sm">
                {t("Hide prices")}
              </Label>
            </div>
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
