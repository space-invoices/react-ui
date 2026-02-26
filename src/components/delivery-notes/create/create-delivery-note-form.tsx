import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateDeliveryNoteRequest, DeliveryNote } from "@spaceinvoices/js-sdk";
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
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import type { DocumentTypes } from "../../documents/types";
import { useCreateDeliveryNote } from "../delivery-notes.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareDeliveryNoteSubmission } from "./prepare-delivery-note-submission";
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
} & ComponentTranslationProps;

export default function CreateDeliveryNoteForm({
  type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  initialValues,
  t: translateProp,
  namespace,
  locale,
}: CreateDeliveryNoteFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();

  // Draft submission state
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Hide prices state (delivery note specific)
  const defaultHidePrices = (activeEntity?.settings as any)?.delivery_note_hide_prices ?? false;
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";
  const [hidePrices, setHidePrices] = useState<boolean>((initialValues as any)?.hide_prices ?? defaultHidePrices);

  // Fetch next delivery note number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "delivery_note", {
    enabled: !!entityId,
  });

  const form = useForm<CreateDeliveryNoteFormValues>({
    resolver: zodResolver(createDeliveryNoteSchema) as Resolver<CreateDeliveryNoteFormValues>,
    defaultValues: {
      number: "",
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateDeliveryNoteFormValues["customer"]) ?? undefined,
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
      currency_code: initialValues?.currency_code || activeEntity?.currency_code || "EUR",
      reference: (initialValues as any)?.reference ?? "",
      note: initialValues?.note ?? "",
      tax_clause: (initialValues as any)?.tax_clause ?? "",
      footer: (initialValues as any)?.footer ?? defaultFooter,
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
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form]);

  // Set default footer from entity settings when entity data is available
  useEffect(() => {
    const entityDefaultFooter = (activeEntity?.settings as any)?.document_footer;
    if (entityDefaultFooter && !form.getValues("footer")) {
      form.setValue("footer", entityDefaultFooter);
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

  // Set default signature from entity settings
  useEffect(() => {
    const entityDefaultSignature = (activeEntity?.settings as any)?.default_document_signature;
    if (entityDefaultSignature && !form.getValues("signature")) {
      form.setValue("signature", entityDefaultSignature);
    }
  }, [activeEntity, form]);

  const formValues = useWatch({
    control: form.control,
  });

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

  // Shared submit logic for both regular save and save as draft
  const submitDeliveryNote = useCallback(
    (values: CreateDeliveryNoteFormValues, isDraft: boolean) => {
      try {
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
    [createDeliveryNote, onError, originalCustomer, hidePrices],
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
    () => ({
      label: t("Save as Draft"),
      onClick: handleSaveAsDraft,
      isPending: isDraftPending,
    }),
    [t, handleSaveAsDraft, isDraftPending],
  );

  useFormFooterRegistration({
    formId: "create-delivery-note-form",
    isPending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: t("Create Delivery Note"),
    secondaryAction,
  });

  useEffect(() => {
    const callback = onChangeRef.current;
    if (!callback) return;

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

    const payload: DeliveryNotePreviewPayload = {
      number: formValues.number,
      date: formValues.date,
      customer_id: formValues.customer_id,
      customer: formValues.customer,
      items: transformedItems,
      currency_code: formValues.currency_code,
      reference: formValues.reference,
      note: formValues.note,
      signature: formValues.signature,
      hide_prices: hidePrices,
    };
    callback(payload);
  }, [formValues, form, hidePrices]);

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
          />

          <DocumentDetailsSection control={form.control} documentType={type} t={t}>
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
          watch={form.watch}
          setValue={form.setValue}
          getValues={form.getValues}
          entityId={entityId}
          currencyCode={activeEntity?.currency_code ?? undefined}
          onAddNewTax={onAddNewTax}
          t={t}
          maxTaxesPerItem={activeEntity?.country_rules?.max_taxes_per_item}
          priceModesRef={priceModesRef}
          initialPriceModes={initialPriceModes}
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
