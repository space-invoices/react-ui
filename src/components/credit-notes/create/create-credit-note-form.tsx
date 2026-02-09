import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateCreditNoteRequest, CreditNote } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Form } from "@/ui/components/ui/form";
import { createCreditNoteSchema } from "@/ui/generated/schemas";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
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
import { prepareDocumentSubmission } from "../../documents/create/prepare-document-submission";
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
type CreateCreditNoteFormValues = z.infer<typeof createCreditNoteSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type CreditNotePreviewPayload = Partial<CreateCreditNoteRequest> & { number?: string };

type CreateCreditNoteFormProps = {
  type: DocumentTypes;
  entityId: string;
  onSuccess?: (data: CreditNote) => void;
  onError?: (error: unknown) => void;
  onChange?: (data: CreditNotePreviewPayload) => void;
  onAddNewTax?: () => void;
  /** Initial values for form fields (used for document duplication) */
  initialValues?: Partial<CreateCreditNoteRequest>;
} & ComponentTranslationProps;

export default function CreateCreditNoteForm({
  type: _type,
  entityId,
  onSuccess,
  onError,
  onChange,
  onAddNewTax,
  initialValues,
  t: translateProp,
  namespace,
  locale,
}: CreateCreditNoteFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();

  // Fetch next credit note number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "credit_note", {
    enabled: !!entityId,
  });

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<string[]>(["bank_transfer"]);
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

  // Get default payment terms from entity settings
  const defaultPaymentTerms = (activeEntity?.settings as any)?.default_credit_note_payment_terms || "";

  const form = useForm<CreateCreditNoteFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createCreditNoteSchema) as Resolver<CreateCreditNoteFormValues>,
    defaultValues: {
      number: "",
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateCreditNoteFormValues["customer"]) ?? undefined,
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
      note: initialValues?.note ?? "",
      payment_terms: initialValues?.payment_terms ?? defaultPaymentTerms,
    },
  });

  const formValues = useWatch({
    control: form.control,
  });

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

  const { mutate: createCreditNote, isPending } = useCreateCreditNote({
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
  const submitCreditNote = useCallback(
    (values: CreateCreditNoteFormValues, isDraft: boolean) => {
      const payload = prepareDocumentSubmission(values, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft ? false : markAsPaid,
        paymentTypes,
        documentType: "credit_note",
        priceModes: priceModesRef.current,
        isDraft,
      });
      createCreditNote(payload as CreateCreditNoteRequest);
    },
    [createCreditNote, markAsPaid, originalCustomer, paymentTypes, showCustomerForm],
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
    isDirty: form.formState.isDirty,
    label: t("Save"),
    secondaryAction: {
      label: t("Save as Draft"),
      onClick: handleSaveAsDraft,
      isPending: isDraftPending,
    },
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

      // Build preview payload (includes number for display)
      const payload: CreditNotePreviewPayload = {
        number: formValues.number,
        date: formValues.date,
        customer_id: formValues.customer_id,
        customer: formValues.customer,
        items: transformedItems,
        currency_code: formValues.currency_code,
        note: formValues.note,
        payment_terms: formValues.payment_terms,
      };
      onChange(payload);
    }
  }, [formValues, onChange, form]);

  const onSubmit = (values: CreateCreditNoteFormValues) => {
    submitCreditNote(values, false);
  };

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
          />
          <DocumentDetailsSection control={form.control} documentType={_type} t={t}>
            {/* Credit note specific: Mark as paid section (UI-only state, not in form schema) */}
            <MarkAsPaidSection
              checked={markAsPaid}
              onCheckedChange={setMarkAsPaid}
              paymentTypes={paymentTypes}
              onPaymentTypesChange={setPaymentTypes}
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
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
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
      </form>
    </Form>
  );
}
