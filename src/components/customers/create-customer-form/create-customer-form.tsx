import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, CreateCustomerBody, Customer } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CompanyRegistryAutocomplete } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Form } from "@/ui/components/ui/form";
import type { CreateCustomerSchema } from "@/ui/generated/schemas";
import { createCustomerSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import {
  CustomerBankAccountFields,
  customerBankAccountsFormSchema,
  normalizeCustomerBankAccounts,
} from "../customer-bank-account-fields";
import { CustomerClassificationFields, CustomerContactFields } from "../customer-profile-fields";
import { customerProfileTranslations } from "../customer-profile-locales";
import { useCreateCustomer } from "../customers.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

const translations = {
  en,
  bg: { ...bg, ...customerProfileTranslations.bg },
  cs: { ...cs, ...customerProfileTranslations.cs },
  sl: { ...sl, ...customerProfileTranslations.sl },
  de: { ...de, ...customerProfileTranslations.de },
  it: { ...it, ...customerProfileTranslations.it },
  fr: { ...fr, ...customerProfileTranslations.fr },
  es: { ...es, ...customerProfileTranslations.es },
  et: { ...et, ...customerProfileTranslations.et },
  fi: { ...fi, ...customerProfileTranslations.fi },
  pt: { ...pt, ...customerProfileTranslations.pt },
  is: { ...is, ...customerProfileTranslations.is },
  nb: { ...nb, ...customerProfileTranslations.nb },
  nl: { ...nl, ...customerProfileTranslations.nl },
  pl: { ...pl, ...customerProfileTranslations.pl },
  sk: { ...sk, ...customerProfileTranslations.sk },
  sv: { ...sv, ...customerProfileTranslations.sv },
  hr: { ...hr, ...customerProfileTranslations.hr },
} as const;

type CreateCustomerFormProps = {
  entityId: string;
  /**
   * Entity's ISO 3166-1 alpha-2 country code (e.g., "SI", "AT")
   * Used to enable company registry autocomplete for supported countries
   */
  entityCountryCode?: string;
  eInvoicingEnabled?: boolean;
  onSuccess?: (customer: Customer) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

const customerFormSchema = createCustomerSchema.extend({
  bank_accounts: customerBankAccountsFormSchema,
  peppol_id: z.string().optional().nullable(),
  peppol_scheme_id: z.string().max(10).optional().nullable(),
});

type CustomerFormSchema = CreateCustomerSchema & {
  bank_accounts?: Array<Record<string, unknown>>;
  peppol_id?: string | null;
  peppol_scheme_id?: string | null;
};

function CustomerFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-lg border bg-muted/10 p-4">
      <legend className="px-1 font-medium text-sm">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export default function CreateCustomerForm({
  entityId,
  entityCountryCode,
  eInvoicingEnabled = false,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: CreateCustomerFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  /**
   * Handle company selection from registry autocomplete
   * Auto-fills form fields with company data
   */
  const handleCompanySelect = (company: CompanyRegistryResult) => {
    form.setValue("name", company.name);
    if (company.address) form.setValue("address", company.address);
    if (company.post_code) form.setValue("post_code", company.post_code);
    if (company.city) form.setValue("city", company.city);
    if (company.tax_number) form.setValue("tax_number", company.tax_number);
    if (company.registration_number) form.setValue("company_number", company.registration_number);
    if (company.bank_accounts?.[0]) form.setValue("bank_accounts", [company.bank_accounts[0] as any]);
    // Note: country is intentionally not set - keep entity's country or let user choose
  };

  const form = useForm<CustomerFormSchema>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      address: "",
      address_2: "",
      post_code: "",
      city: "",
      state: "",
      country: "",
      tax_number: "",
      company_number: "",
      email: "",
      contact_type: "both",
      is_tax_subject: true,
      is_end_consumer: false,
      bank_accounts: [{ type: "iban" }],
    },
  });
  const taxNumber = form.watch("tax_number");
  const companyNumber = form.watch("company_number");
  const showPeppolFields = eInvoicingEnabled && (!!taxNumber || !!companyNumber);

  const { mutate: createCustomer, isPending } = useCreateCustomer({
    entityId,
    onSuccess: (customer, _variables, _context) => {
      onSuccess?.(customer);
      form.reset(); // Reset form after successful submission
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error creating the customer"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: CustomerFormSchema) => {
    // Zod validation ensures required fields are present before this is called
    // The type cast is safe because React Hook Form's DeepPartial doesn't reflect runtime validation
    createCustomer(normalizeCustomerBankAccounts(values) as CreateCustomerBody);
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit as any)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        {/* Company Registry Autocomplete - only shown for supported countries */}
        {entityCountryCode && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-4">
            <CompanyRegistryAutocomplete
              countryCode={entityCountryCode}
              onSelect={handleCompanySelect}
              placeholder={t("Search by company name or tax number")}
            />
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-2" data-testid="customer-form-sections">
          <CustomerFormSection title={t("Contact Details")}>
            <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />
            <CustomerContactFields control={form.control} t={t} />
          </CustomerFormSection>

          <CustomerFormSection title={t("Address")}>
            <FormInput control={form.control} name="address" label={t("Address")} placeholder={t("Enter address")} />
            <FormInput control={form.control} name="address_2" label={t("Address 2")} />
            <div className="grid grid-cols-2 gap-4">
              <FormInput control={form.control} name="post_code" label={t("Post Code")} />
              <FormInput control={form.control} name="city" label={t("City")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput control={form.control} name="state" label={t("State")} />
              <FormInput control={form.control} name="country" label={t("Country")} />
            </div>
          </CustomerFormSection>

          <CustomerFormSection title={t("Tax Details")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput control={form.control} name="tax_number" label={t("Tax Number")} />
              <FormInput control={form.control} name="company_number" label={t("Company Number")} />
            </div>
            <CustomerClassificationFields control={form.control} t={t} />
          </CustomerFormSection>

          {showPeppolFields && (
            <CustomerFormSection title={t("E-invoicing")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput control={form.control} name="peppol_scheme_id" label={t("Peppol Scheme")} />
                <FormInput control={form.control} name="peppol_id" label={t("Peppol ID")} />
              </div>
            </CustomerFormSection>
          )}

          <CustomerFormSection title={t("Bank Account")}>
            <CustomerBankAccountFields
              control={form.control}
              t={t}
              locale={i18nProps.locale}
              translationLocale={i18nProps.translationLocale}
              compact
            />
          </CustomerFormSection>
        </div>

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
