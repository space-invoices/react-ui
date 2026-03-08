import { zodResolver } from "@hookform/resolvers/zod";
import type { AdvanceInvoice, CreateAdvanceInvoiceRequest } from "@spaceinvoices/js-sdk";
import { AlertCircle, Check, FileCode2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Form } from "@/ui/components/ui/form";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { CreateAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { createAdvanceInvoiceSchema } from "@/ui/generated/schemas";
import { useEslogValidation } from "@/ui/hooks/use-eslog-validation";
import { useNextDocumentNumber } from "@/ui/hooks/use-next-document-number";
import { usePremiseSelection } from "@/ui/hooks/use-premise-selection";
import { useTransactionTypeCheck } from "@/ui/hooks/use-transaction-type-check";
import { buildEslogOptions, buildFinaOptions, buildFursOptions } from "@/ui/lib/fiscalization-options";
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
import { DocumentItemsSection, type PriceModesMap } from "../../documents/create/document-items-section";
import { DocumentRecipientSection } from "../../documents/create/document-recipient-section";
import { MarkAsPaidSection } from "../../documents/create/mark-as-paid-section";
import { useDocumentCustomerForm } from "../../documents/create/use-document-customer-form";
import type { DocumentTypes } from "../../documents/types";
import { getEntityErrors, getFormFieldErrors, validateEslogForm } from "../../invoices/create/eslog-validation";
import { useCreateAdvanceInvoice } from "../advance-invoices.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { prepareAdvanceInvoiceSubmission } from "./prepare-advance-invoice-submission";

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
type CreateAdvanceInvoiceFormValues = CreateAdvanceInvoiceSchema & {
  number?: string;
};

/** Preview payload extends request with display-only fields */
type AdvanceInvoicePreviewPayload = Partial<CreateAdvanceInvoiceRequest> & { number?: string };

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
  t: translateProp,
  namespace,
  locale,
}: CreateAdvanceInvoiceFormProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  const { activeEntity } = useEntities();

  // Get default note from entity settings (use invoice defaults)
  // Note: Advance invoices don't have payment terms - they are documents requesting payment
  const defaultNote = (activeEntity?.settings as any)?.default_invoice_note || "";
  const defaultFooter = (activeEntity?.settings as any)?.document_footer || "";

  // ============================================================================
  // FURS & FINA Premise Selection (shared hook)
  // ============================================================================
  const furs = usePremiseSelection({ entityId, type: "furs" });
  const fina = usePremiseSelection({ entityId, type: "fina" });
  const eslog = useEslogValidation(activeEntity);
  const [skipFiscalization, setSkipFiscalization] = useState(false);

  // UI-only state (not part of API schema)
  const [markAsPaid, setMarkAsPaid] = useState(true);
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

  const form = useForm<CreateAdvanceInvoiceFormValues>({
    // Cast resolver to accept extended form type (includes UI-only fields)
    resolver: zodResolver(createAdvanceInvoiceSchema) as Resolver<CreateAdvanceInvoiceFormValues>,
    defaultValues: {
      number: "", // Will be set by useNextAdvanceInvoiceNumber
      date: initialValues?.date || new Date().toISOString(),
      customer_id: initialValues?.customer_id ?? undefined,
      // Cast customer to form schema type (API type may have additional fields)
      customer: (initialValues?.customer as CreateAdvanceInvoiceFormValues["customer"]) ?? undefined,
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
      note: initialValues?.note ?? defaultNote,
      tax_clause: "",
      footer: (initialValues as any)?.footer ?? defaultFooter,
    },
  });

  // Skip fiscalization is only allowed for bank transfers or unpaid invoices
  const canSkipFiscalization = !markAsPaid || paymentTypes.every((type) => type === "bank_transfer");

  // Auto-disable skip when it becomes invalid (e.g., user changes payment type to cash)
  useEffect(() => {
    if (!canSkipFiscalization && skipFiscalization) {
      setSkipFiscalization(false);
    }
  }, [canSkipFiscalization, skipFiscalization]);

  // FURS is "active" for this advance invoice if enabled and we have a valid selection (and not skipped)
  const isFursActive = furs.isActive && !skipFiscalization;

  // Update header action with FURS and e-SLOG toggle buttons
  useEffect(() => {
    if (!onHeaderActionChange) return;

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
                      ? t("Click to skip fiscalization for this advance invoice")
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
    onHeaderActionChange,
    t,
  ]);

  const formValues = useWatch({
    control: form.control,
  });
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
    enabled: !!entityId && !furs.isLoading && furs.isSelectionReady && !fina.isLoading && fina.isSelectionReady,
  });

  // Overall loading state
  const isFormDataLoading =
    furs.isLoading || !furs.isSelectionReady || fina.isLoading || !fina.isSelectionReady || isNextNumberLoading;

  // Pre-fill advance invoice number from preview
  useEffect(() => {
    if (nextNumberData?.number) {
      form.setValue("number", nextNumberData.number);
    }
  }, [nextNumberData?.number, form]);

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

  // Shared submit logic for both regular save and save as draft
  const submitAdvanceInvoice = useCallback(
    (values: CreateAdvanceInvoiceFormValues, isDraft: boolean) => {
      // Skip e-SLOG and FURS validation for drafts
      if (!isDraft && eslog.isEnabled) {
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

      const fursOptions = buildFursOptions({
        isDraft,
        isEnabled: furs.isEnabled,
        skipFiscalization,
        premiseName: furs.selectedPremiseName,
        deviceName: furs.selectedDeviceName,
      });

      const finaOptions = buildFinaOptions({
        isDraft,
        useFinaNumbering,
        premiseName: fina.selectedPremiseName,
        deviceName: fina.selectedDeviceName,
        paymentType: paymentTypes[0],
      });

      const eslogOptions = buildEslogOptions({
        isDraft,
        isAvailable: eslog.isAvailable,
        isEnabled: eslog.isEnabled,
      });

      const payload = prepareAdvanceInvoiceSubmission(values, {
        originalCustomer,
        wasCustomerFormShown: showCustomerForm,
        markAsPaid: isDraft ? false : markAsPaid,
        paymentTypes,
        furs: fursOptions,
        fina: finaOptions,
        eslog: eslogOptions,
        priceModes: priceModesRef.current,
        isDraft,
      });

      createAdvanceInvoice(payload);
    },
    [
      activeEntity,
      createAdvanceInvoice,
      eslog,
      furs,
      fina,
      form,
      useFinaNumbering,
      markAsPaid,
      originalCustomer,
      paymentTypes,
      showCustomerForm,
      skipFiscalization,
    ],
  );

  // Handle save as draft
  const handleSaveAsDraft = useCallback(async () => {
    setIsDraftPending(true);
    try {
      const isValid = await form.trigger();
      if (isValid) {
        const values = form.getValues();
        submitAdvanceInvoice(values, true);
      }
    } finally {
      setIsDraftPending(false);
    }
  }, [form, submitAdvanceInvoice]);

  useFormFooterRegistration({
    formId: "create-advance-invoice-form",
    isPending,
    isDirty: form.formState.isDirty || !!initialValues,
    label: t("Save"),
    secondaryAction: {
      label: t("Save as Draft"),
      onClick: handleSaveAsDraft,
      isPending: isDraftPending,
    },
  });

  // Set default note, footer, and signature from entity settings (advance invoices don't have payment terms)
  useEffect(() => {
    const entityDefaultNote = (activeEntity?.settings as any)?.default_invoice_note;
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

  const buildPreviewPayload = useCallback((values: CreateAdvanceInvoiceFormValues): AdvanceInvoicePreviewPayload => {
    const currentItems = values.items || [];

    const transformedItems = currentItems.map((item: any, index: number) => {
      const { price, ...rest } = item;
      const isGross = priceModesRef.current[index] ?? false;
      return isGross ? { ...rest, gross_price: price } : { ...rest, price };
    });

    return {
      number: values.number,
      date: values.date,
      customer_id: values.customer_id,
      customer: values.customer,
      items: transformedItems,
      currency_code: values.currency_code,
      reference: values.reference,
      note: values.note,
      signature: values.signature,
    };
  }, []);

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
      <form id="create-advance-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            t={t}
          />
          <DocumentDetailsSection
            control={form.control}
            documentType={_type}
            t={t}
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
          >
            {/* Mark as paid section (UI-only state, not in form schema) */}
            <MarkAsPaidSection
              checked={markAsPaid}
              onCheckedChange={setMarkAsPaid}
              paymentTypes={paymentTypes}
              onPaymentTypesChange={setPaymentTypes}
              t={t}
              alwaysShowPaymentType={!!fina.isActive}
              forced
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
      </form>
    </Form>
  );
}
