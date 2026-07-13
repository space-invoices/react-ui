/**
 * Shared document recipient section for invoices and estimates
 * Handles customer selection and inline customer form
 */
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useController } from "react-hook-form";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Label } from "@/ui/components/ui/label";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { CustomerAutocomplete } from "../../customers/customer-autocomplete";
import { CustomerBankAccountFields } from "../../customers/customer-bank-account-fields";
import type { AnyControl } from "./form-types";

type DocumentRecipientSectionProps = {
  control: AnyControl;
  entityId: string;

  onCustomerSelect: (customerId: string, customer: any) => void;
  onCustomerClear: () => void;
  onCustomerEdit?: (options?: { detachCustomer?: boolean }) => void;
  showCustomerForm: boolean;
  shouldFocusName: boolean;
  selectedCustomerId?: string;
  entityCountryCode?: string | null;
  /** Initial customer name for display (used when duplicating documents) */
  initialCustomerName?: string;
  /** Show end consumer (B2C) toggle next to tax number (Croatian entity + domestic transaction) */
  showEndConsumerToggle?: boolean;
  /** Show business recipient routing fields, e.g. when UJP validation is active. */
  showBusinessRecipientFields?: boolean;
  /** Show customer bank account routing fields for UJP validation. */
  showUjpRoutingFields?: boolean;
  /** Show EN 16931 buyer reference field for German XRechnung/ZUGFeRD. */
  showEInvoicingBuyerReference?: boolean;
  t: (key: string) => string;
  locale?: string;
};

const documentRecipientFieldTranslations = {
  bg: {
    "Company Number": "Фирмен номер",
  },
  cs: {
    "Company Number": "IČO",
  },
  de: {
    "Company Number": "Unternehmensnummer",
  },
  en: {
    "Company Number": "Company Number",
  },
  es: {
    "Company Number": "Número de empresa",
  },
  et: {
    "Company Number": "Ettevõtte registrikood",
  },
  fi: {
    "Company Number": "Yritystunnus",
  },
  fr: {
    "Company Number": "Numéro d'entreprise",
  },
  hr: {
    "Company Number": "Matični broj tvrtke",
  },
  is: {
    "Company Number": "Fyrirtækjanúmer",
  },
  it: {
    "Company Number": "Numero aziendale",
  },
  nb: {
    "Company Number": "Organisasjonsnummer",
  },
  nl: {
    "Company Number": "Bedrijfsnummer",
  },
  pl: {
    "Company Number": "Numer firmy",
  },
  pt: {
    "Company Number": "Número da empresa",
  },
  sk: {
    "Company Number": "IČO",
  },
  sl: {
    "Company Number": "Matična številka",
  },
  sv: {
    "Company Number": "Företagsnummer",
  },
} as const;

export function DocumentRecipientSection({
  control,
  entityId,
  onCustomerSelect,
  onCustomerClear,
  onCustomerEdit,
  showCustomerForm,
  shouldFocusName,
  selectedCustomerId,
  entityCountryCode,
  initialCustomerName,
  showEndConsumerToggle,
  showBusinessRecipientFields,
  showUjpRoutingFields,
  showEInvoicingBuyerReference,
  t,
  locale = "en",
}: DocumentRecipientSectionProps) {
  const translateRecipientField = createTranslation({
    t,
    locale,
    translations: documentRecipientFieldTranslations,
  });
  const nameInputRef = useRef<HTMLInputElement>(null);

  const endConsumerController = useController({
    control: control as any,
    name: "customer.is_end_consumer" as any,
  });
  const customerNameController = useController({
    control: control as any,
    name: "customer.name" as any,
  });
  const customerNameError = customerNameController.fieldState.error?.message;
  const taxNumberController = useController({
    control: control as any,
    name: "customer.tax_number" as any,
  });
  const showBusinessFields = showCustomerForm && showBusinessRecipientFields;
  const showBankRoutingFields = showUjpRoutingFields || !!taxNumberController.field.value?.trim();

  useEffect(() => {
    if (showCustomerForm && shouldFocusName) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [showCustomerForm, shouldFocusName]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xl">{t("Recipient")}</h2>
        {showCustomerForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCustomerClear}
            className={cn("h-7 cursor-pointer px-2 text-xs")}
          >
            <X className="size-3" />
            {t("Clear")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className={cn(customerNameError && "text-destructive")}>{t("Name")}</Label>
        <CustomerAutocomplete
          entityId={entityId}
          value={selectedCustomerId}
          committedDisplayName={customerNameController.field.value ?? initialCustomerName}
          onValueChange={onCustomerSelect}
          onCommitInlineName={(nextName) => {
            onCustomerEdit?.({ detachCustomer: true });
            customerNameController.field.onChange(nextName);
          }}
          onClear={onCustomerClear}
          placeholder="Search or create customer..."
          initialDisplayName={initialCustomerName}
          inputTestId="document-customer-input"
          inputDataDemo="marketing-demo-customer-input"
          inputRef={nameInputRef}
          commitOnBlurMode={showCustomerForm ? "update-inline" : "create"}
          companyRegistryCountryCode={entityCountryCode}
          t={t}
          locale={locale}
          ariaInvalid={!!customerNameError}
        />
        {customerNameError && <p className="font-normal text-destructive text-xs">{customerNameError}</p>}
      </div>

      {showCustomerForm && (
        <>
          <FormInput
            control={control}
            name="customer.address"
            placeholder={t("Address")}
            label=""
            onChange={onCustomerEdit}
          />

          <FormInput
            control={control}
            name="customer.address_2"
            placeholder={t("Address 2")}
            label=""
            onChange={onCustomerEdit}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              control={control}
              name="customer.post_code"
              placeholder={t("Post Code")}
              label=""
              onChange={onCustomerEdit}
            />
            <FormInput
              control={control}
              name="customer.city"
              placeholder={t("City")}
              label=""
              onChange={onCustomerEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              control={control}
              name="customer.state"
              placeholder={t("State")}
              label=""
              onChange={onCustomerEdit}
            />
            <FormInput
              control={control}
              name="customer.country"
              placeholder={t("Country")}
              label=""
              onChange={onCustomerEdit}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <FormInput
                control={control}
                name="customer.tax_number"
                placeholder={t("Tax Number")}
                label=""
                onChange={onCustomerEdit}
              />
            </div>
            {showEndConsumerToggle && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Checkbox
                  id="is_end_consumer"
                  checked={endConsumerController.field.value === true}
                  onCheckedChange={(checked) => endConsumerController.field.onChange(checked === true)}
                />
                <Label
                  htmlFor="is_end_consumer"
                  className="cursor-pointer whitespace-nowrap font-normal text-muted-foreground text-sm"
                >
                  {t("End consumer")}
                </Label>
              </div>
            )}
          </div>

          {showBusinessFields && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <FormInput
                control={control}
                name="customer.company_number"
                placeholder={translateRecipientField("Company Number")}
                label=""
                onChange={onCustomerEdit}
              />
              {showBankRoutingFields && (
                <CustomerBankAccountFields
                  control={control}
                  t={t}
                  locale={locale}
                  namePrefix="customer.bank_accounts"
                  compact
                />
              )}
            </div>
          )}

          {showEInvoicingBuyerReference && (
            <FormInput
              control={control}
              name="customer.e_invoicing.buyer_reference"
              placeholder={t("Buyer reference / Leitweg-ID")}
              label=""
            />
          )}
        </>
      )}
    </div>
  );
}
