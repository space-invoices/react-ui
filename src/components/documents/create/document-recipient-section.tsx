/**
 * Shared document recipient section for invoices and estimates
 * Handles customer selection and inline customer form
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useController, useWatch } from "react-hook-form";
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
  /** Show end consumer (B2C) toggle next to the tax number for country flows that distinguish consumers. */
  showEndConsumerToggle?: boolean;
  /** Show business recipient routing fields, e.g. when UJP validation is active. */
  showBusinessRecipientFields?: boolean;
  /** Show customer bank account routing fields for UJP validation. */
  showUjpRoutingFields?: boolean;
  /** Show the EN 16931 buyer reference required by the active country profile. */
  showEInvoicingBuyerReference?: boolean;
  /** Show Peppol address fields for AR sending. */
  showPeppolRecipientFields?: boolean;
  /** Show the French legal delivery-address snapshot fields. */
  showDeliveryAddressFields?: boolean;
  t: (key: string) => string;
  locale?: string;
};

const documentRecipientFieldTranslations = {
  bg: {
    "Company Number": "Фирмен номер",
    "SIREN (French businesses, 9 digits)": "SIREN (френски фирми, 9 цифри)",
  },
  cs: {
    "Company Number": "IČO",
    "SIREN (French businesses, 9 digits)": "SIREN (francouzské firmy, 9 číslic)",
  },
  de: {
    "Company Number": "Unternehmensnummer",
    "SIREN (French businesses, 9 digits)": "SIREN (französische Unternehmen, 9 Ziffern)",
  },
  en: {
    "Company Number": "Company Number",
    "SIREN (French businesses, 9 digits)": "SIREN (French businesses, 9 digits)",
  },
  es: {
    "Company Number": "Número de empresa",
    "SIREN (French businesses, 9 digits)": "SIREN (empresas francesas, 9 dígitos)",
  },
  et: {
    "Company Number": "Ettevõtte registrikood",
    "SIREN (French businesses, 9 digits)": "SIREN (Prantsuse ettevõtted, 9 numbrit)",
  },
  fi: {
    "Company Number": "Yritystunnus",
    "SIREN (French businesses, 9 digits)": "SIREN (ranskalaiset yritykset, 9 numeroa)",
  },
  fr: {
    "Company Number": "Numéro d'entreprise",
    "SIREN (French businesses, 9 digits)": "SIREN (entreprises françaises, 9 chiffres)",
  },
  hr: {
    "Company Number": "Matični broj tvrtke",
    "SIREN (French businesses, 9 digits)": "SIREN (francuske tvrtke, 9 znamenki)",
  },
  is: {
    "Company Number": "Fyrirtækjanúmer",
    "SIREN (French businesses, 9 digits)": "SIREN (frönsk fyrirtæki, 9 tölustafir)",
  },
  it: {
    "Company Number": "Numero aziendale",
    "SIREN (French businesses, 9 digits)": "SIREN (aziende francesi, 9 cifre)",
  },
  nb: {
    "Company Number": "Organisasjonsnummer",
    "SIREN (French businesses, 9 digits)": "SIREN (franske selskaper, 9 sifre)",
  },
  nl: {
    "Company Number": "Bedrijfsnummer",
    "SIREN (French businesses, 9 digits)": "SIREN (Franse bedrijven, 9 cijfers)",
  },
  pl: {
    "Company Number": "Numer firmy",
    "SIREN (French businesses, 9 digits)": "SIREN (francuskie firmy, 9 cyfr)",
  },
  pt: {
    "Company Number": "Número da empresa",
    "SIREN (French businesses, 9 digits)": "SIREN (empresas francesas, 9 dígitos)",
  },
  sk: {
    "Company Number": "IČO",
    "SIREN (French businesses, 9 digits)": "SIREN (francúzske firmy, 9 číslic)",
  },
  sl: {
    "Company Number": "Matična številka",
    "SIREN (French businesses, 9 digits)": "SIREN (francoska podjetja, 9 števk)",
  },
  sv: {
    "Company Number": "Företagsnummer",
    "SIREN (French businesses, 9 digits)": "SIREN (franska företag, 9 siffror)",
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
  showPeppolRecipientFields,
  showDeliveryAddressFields,
  t,
  locale = "en",
}: DocumentRecipientSectionProps) {
  const translateRecipientField = createTranslation({
    t,
    locale,
    translations: documentRecipientFieldTranslations,
  });
  const isFrenchEntity = entityCountryCode?.toUpperCase() === "FR";
  const companyNumberLabel = translateRecipientField(
    isFrenchEntity ? "SIREN (French businesses, 9 digits)" : "Company Number",
  );
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
  const deliveryAddress = useWatch({
    control: control as any,
    name: "customer.delivery_address.address" as any,
  });
  const [showDeliveryAddress, setShowDeliveryAddress] = useState(Boolean(deliveryAddress));
  const isBusinessRecipient = endConsumerController.field.value !== true;
  const showBusinessFields = showCustomerForm && showBusinessRecipientFields && isBusinessRecipient;
  const showBankRoutingFields = showUjpRoutingFields || !!taxNumberController.field.value?.trim();
  const showPeppolAddressFields = showCustomerForm && showPeppolRecipientFields && isBusinessRecipient;

  useEffect(() => {
    if (showCustomerForm && shouldFocusName) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [showCustomerForm, shouldFocusName]);

  useEffect(() => {
    if (deliveryAddress) setShowDeliveryAddress(true);
  }, [deliveryAddress]);

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
          contactType="buyer"
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
                placeholder={companyNumberLabel}
                label={isFrenchEntity ? companyNumberLabel : ""}
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

          {showPeppolAddressFields && (
            <fieldset className="space-y-1 rounded-md border bg-muted/20 p-3">
              <legend className="px-1 font-medium text-sm">{t("Peppol")}</legend>
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <FormInput
                  control={control}
                  name="customer.peppol_scheme_id"
                  placeholder={t("Peppol Scheme")}
                  label=""
                  onChange={onCustomerEdit}
                />
                <FormInput
                  control={control}
                  name="customer.peppol_id"
                  placeholder={t("Peppol ID")}
                  label=""
                  onChange={onCustomerEdit}
                />
              </div>
            </fieldset>
          )}

          {showEInvoicingBuyerReference && (
            <FormInput
              control={control}
              name="customer.e_invoicing.buyer_reference"
              placeholder={t(
                entityCountryCode?.toUpperCase() === "FR" ? "Buyer reference" : "Buyer reference / Leitweg-ID",
              )}
              label={t(entityCountryCode?.toUpperCase() === "FR" ? "Buyer reference" : "Buyer reference / Leitweg-ID")}
            />
          )}

          {showDeliveryAddressFields ? (
            <div className="space-y-3">
              {!showDeliveryAddress ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => setShowDeliveryAddress(true)}
                >
                  {t("Add a different delivery address")}
                </Button>
              ) : (
                <fieldset className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <legend className="px-1 font-medium text-sm">{t("Delivery address")}</legend>
                  <p className="text-muted-foreground text-xs">
                    {t("Complete this only when goods are delivered somewhere other than the billing address.")}
                  </p>
                  <FormInput
                    control={control}
                    name="customer.delivery_address.address"
                    placeholder={t("Address")}
                    label={t("Address")}
                    onChange={onCustomerEdit}
                  />
                  <FormInput
                    control={control}
                    name="customer.delivery_address.address_2"
                    placeholder={t("Address 2")}
                    label={t("Address 2")}
                    onChange={onCustomerEdit}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      control={control}
                      name="customer.delivery_address.post_code"
                      placeholder={t("Post Code")}
                      label={t("Post Code")}
                      onChange={onCustomerEdit}
                    />
                    <FormInput
                      control={control}
                      name="customer.delivery_address.city"
                      placeholder={t("City")}
                      label={t("City")}
                      onChange={onCustomerEdit}
                    />
                  </div>
                  <FormInput
                    control={control}
                    name="customer.delivery_address.country_code"
                    placeholder={t("Country code")}
                    label={t("Country code")}
                    onChange={onCustomerEdit}
                  />
                </fieldset>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
