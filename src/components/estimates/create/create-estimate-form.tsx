import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateEstimateRequest, Estimate } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Form } from "@/ui/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { createEstimateSchema } from "@/ui/generated/schemas";
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
import type { DocumentTypes } from "../../documents/types";
import { useCreateEstimate } from "../estimates.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareEstimateSubmission } from "./prepare-estimate-submission";
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

// Form values: extend schema with local-only fields (number is for display, not sent to API)
type CreateEstimateFormValues = z.infer<typeof createEstimateSchema> & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type EstimatePreviewPayload = Partial<CreateEstimateRequest> & { number?: string };

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
  initialValues?: Partial<CreateEstimateRequest>;
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
  t: translateProp,
  namespace,
  locale,
}: CreateEstimateFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const { activeEntity } = useEntities();
  const queryClient = useQueryClient();

  // Title type state: "estimate" (default) or "quote"
  const [titleType, setTitleType] = useState<"estimate" | "quote">((initialValues as any)?.title_type || "estimate");

  // Draft submission state
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Get default estimate note from entity settings
  const defaultEstimateNote = (activeEntity?.settings as any)?.default_estimate_note || "";
  const defaultEstimateValidDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;

  // Fetch next estimate number
  const { data: nextNumberData } = useNextDocumentNumber(entityId, "estimate", {
    enabled: !!entityId,
  });

  // Get default payment terms from entity settings
  const defaultPaymentTerms = (activeEntity?.settings as any)?.default_estimate_payment_terms || "";

  const form = useForm<CreateEstimateFormValues>({
    resolver: zodResolver(createEstimateSchema) as Resolver<CreateEstimateFormValues>,
    defaultValues: {
      number: "",
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateEstimateFormValues["customer"]) ?? undefined,
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
      note: initialValues?.note ?? defaultEstimateNote,
      payment_terms: initialValues?.payment_terms ?? defaultPaymentTerms,
      date_valid_till:
        initialValues?.date_valid_till ||
        calculateDueDate(initialValues?.date || new Date().toISOString(), defaultEstimateValidDays),
    },
  });

  // Price modes per item (gross vs net) - collected from component state at submit
  const onHeaderActionChangeRef = useRef(onHeaderActionChange);
  onHeaderActionChangeRef.current = onHeaderActionChange;

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

  // Update default note and valid-till date when entity loads
  useEffect(() => {
    const entityDefaultNote = (activeEntity?.settings as any)?.default_estimate_note;
    if (entityDefaultNote && !form.getValues("note")) {
      form.setValue("note", entityDefaultNote);
    }
    if (!initialValues?.date_valid_till) {
      const validDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;
      const currentDate = form.getValues("date");
      if (currentDate) {
        form.setValue("date_valid_till", calculateDueDate(currentDate, validDays));
      }
    }
  }, [activeEntity, form, initialValues?.date_valid_till]);

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
    if (!callback) return;

    const toggleTitle = () => {
      setTitleType((prev) => (prev === "estimate" ? "quote" : "estimate"));
    };

    callback(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTitle}
              className="flex cursor-pointer items-center gap-2 font-bold text-2xl hover:text-primary"
            >
              {titleType === "estimate" ? t("Create Estimate") : t("Create Quote")}
              <RefreshCw className="size-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {titleType === "estimate" ? t("Click to switch to Quote") : t("Click to switch to Estimate")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  }, [titleType, t]);

  const formValues = useWatch({
    control: form.control,
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

  // Shared submit logic for both regular save and save as draft
  const submitEstimate = useCallback(
    (values: CreateEstimateFormValues, isDraft: boolean) => {
      try {
        const submission = prepareEstimateSubmission(values, {
          originalCustomer,
          priceModes: priceModesRef.current,
          titleType,
          isDraft,
        });
        createEstimate(submission);
      } catch (error) {
        console.error("Estimate submission error:", error);
        if (onError) {
          onError(error);
        }
      }
    },
    [createEstimate, onError, originalCustomer, titleType],
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
    () => ({
      label: t("Save as Draft"),
      onClick: handleSaveAsDraft,
      isPending: isDraftPending,
    }),
    [t, handleSaveAsDraft, isDraftPending],
  );

  useFormFooterRegistration({
    formId: "create-estimate-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: titleType === "estimate" ? t("Create Estimate") : t("Create Quote"),
    secondaryAction,
  });

  // Set default payment terms from entity settings when entity data is available
  useEffect(() => {
    const entityDefaultPaymentTerms = (activeEntity?.settings as any)?.default_estimate_payment_terms;
    if (entityDefaultPaymentTerms && !form.getValues("payment_terms")) {
      form.setValue("payment_terms", entityDefaultPaymentTerms);
    }
  }, [activeEntity, form]);

  // Recalculate valid-till date when document date changes
  const prevDateRef = useRef(form.getValues("date"));
  useEffect(() => {
    const currentDate = formValues.date;
    if (!currentDate || currentDate === prevDateRef.current) return;
    prevDateRef.current = currentDate;
    const validDays = (activeEntity?.settings as any)?.default_estimate_valid_days ?? 30;
    form.setValue("date_valid_till", calculateDueDate(currentDate, validDays));
  }, [formValues.date, activeEntity, form]);

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

    const payload: EstimatePreviewPayload = {
      number: formValues.number,
      date: formValues.date,
      customer_id: formValues.customer_id,
      customer: formValues.customer,
      items: transformedItems,
      currency_code: formValues.currency_code,
      note: formValues.note,
      payment_terms: formValues.payment_terms,
      title_type: titleType,
    };
    callback(payload);
  }, [formValues, form, titleType]);

  const onSubmit = (values: CreateEstimateFormValues) => {
    submitEstimate(values, false);
  };

  return (
    <Form {...form}>
      <form id="create-estimate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

          <DocumentDetailsSection control={form.control} documentType={type} t={t} />
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
            date_valid_till: formValues.date_valid_till,
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
            date_valid_till: formValues.date_valid_till,
            currency_code: formValues.currency_code,
            customer: formValues.customer as any,
          }}
        />
      </form>
    </Form>
  );
}
