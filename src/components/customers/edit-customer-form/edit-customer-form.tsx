import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, Customer, UpdateCustomerBody } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { CompanyRegistryAutocomplete } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Form } from "@/ui/components/ui/form";
import type { CreateCustomerSchema } from "@/ui/generated/schemas";
import { createCustomerSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import createBg from "../create-customer-form/locales/bg";
import createCs from "../create-customer-form/locales/cs";
import createDe from "../create-customer-form/locales/de";
import createEs from "../create-customer-form/locales/es";
import createEt from "../create-customer-form/locales/et";
import createFi from "../create-customer-form/locales/fi";
import createFr from "../create-customer-form/locales/fr";
import createHr from "../create-customer-form/locales/hr";
import createIs from "../create-customer-form/locales/is";
import createIt from "../create-customer-form/locales/it";
import createNb from "../create-customer-form/locales/nb";
import createNl from "../create-customer-form/locales/nl";
import createPl from "../create-customer-form/locales/pl";
import createPt from "../create-customer-form/locales/pt";
import createSk from "../create-customer-form/locales/sk";
import createSl from "../create-customer-form/locales/sl";
import createSv from "../create-customer-form/locales/sv";
import {
  CustomerBankAccountFields,
  customerBankAccountsFormSchema,
  normalizeCustomerBankAccounts,
} from "../customer-bank-account-fields";
import { CustomerClassificationFields, CustomerContactFields } from "../customer-profile-fields";
import { customerProfileTranslations } from "../customer-profile-locales";
import { useUpdateCustomer } from "../customers.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
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
  bg: { ...createBg, ...bg, ...customerProfileTranslations.bg },
  cs: { ...createCs, ...cs, ...customerProfileTranslations.cs },
  sl: { ...createSl, ...sl, ...customerProfileTranslations.sl },
  de: { ...createDe, ...de, ...customerProfileTranslations.de },
  it: { ...createIt, ...it, ...customerProfileTranslations.it },
  fr: { ...createFr, ...fr, ...customerProfileTranslations.fr },
  es: { ...createEs, ...es, ...customerProfileTranslations.es },
  et: { ...createEt, ...et, ...customerProfileTranslations.et },
  fi: { ...createFi, ...fi, ...customerProfileTranslations.fi },
  pt: { ...createPt, ...pt, ...customerProfileTranslations.pt },
  is: { ...createIs, ...is, ...customerProfileTranslations.is },
  nb: { ...createNb, ...nb, ...customerProfileTranslations.nb },
  nl: { ...createNl, ...nl, ...customerProfileTranslations.nl },
  pl: { ...createPl, ...pl, ...customerProfileTranslations.pl },
  sk: { ...createSk, ...sk, ...customerProfileTranslations.sk },
  sv: { ...createSv, ...sv, ...customerProfileTranslations.sv },
  hr: { ...createHr, ...hr, ...customerProfileTranslations.hr },
} as const;

type EditCustomerFormProps = {
  entityId: string;
  customer: Customer;
  /**
   * Entity's ISO 3166-1 alpha-2 country code (e.g., "SI", "AT")
   * Used to enable company registry autocomplete for supported countries
   */
  entityCountryCode?: string;
  onSuccess?: (customer: Customer) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

const customerFormSchema = createCustomerSchema.extend({
  bank_accounts: customerBankAccountsFormSchema,
});

type CustomerFormSchema = CreateCustomerSchema & {
  bank_accounts?: Array<Record<string, unknown>>;
};

function CustomerFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-lg border bg-muted/10 p-4">
      <legend className="px-1 font-medium text-sm">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export default function EditCustomerForm({
  entityId,
  customer,
  entityCountryCode,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: EditCustomerFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const handleCompanySelect = (company: CompanyRegistryResult) => {
    form.setValue("name", company.name, { shouldDirty: true });
    if (company.address) form.setValue("address", company.address, { shouldDirty: true });
    if (company.post_code) form.setValue("post_code", company.post_code, { shouldDirty: true });
    if (company.city) form.setValue("city", company.city, { shouldDirty: true });
    if (company.tax_number) form.setValue("tax_number", company.tax_number, { shouldDirty: true });
    if (company.registration_number) {
      form.setValue("company_number", company.registration_number, { shouldDirty: true });
    }
    if (company.bank_accounts?.[0]) {
      form.setValue("bank_accounts", [company.bank_accounts[0] as any], { shouldDirty: true });
    }
  };

  const contactType =
    customer.contact_type === "supplier" || customer.contact_type === "both" ? customer.contact_type : "buyer";

  const form = useForm<CustomerFormSchema>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer.name ?? "",
      address: customer.address ?? "",
      address_2: customer.address_2 ?? "",
      post_code: customer.post_code ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      country: customer.country ?? "",
      tax_number: customer.tax_number ?? "",
      company_number: customer.company_number ?? "",
      email: customer.email ?? "",
      contact_type: contactType,
      is_tax_subject: customer.is_tax_subject ?? true,
      is_end_consumer: customer.is_end_consumer ?? false,
      bank_accounts: (customer.bank_accounts as Array<Record<string, unknown>> | null | undefined) ?? [
        { type: "iban" },
      ],
    },
  });

  const { mutate: updateCustomer, isPending } = useUpdateCustomer({
    entityId,
    onSuccess: (updatedCustomer, _variables, _context) => {
      onSuccess?.(updatedCustomer);
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error updating the customer"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: CustomerFormSchema) => {
    const dirtyValues = Object.fromEntries(
      Object.entries(values).filter(([field]) =>
        Boolean(form.formState.dirtyFields[field as keyof CustomerFormSchema]),
      ),
    ) as Partial<CustomerFormSchema>;
    const data = "bank_accounts" in dirtyValues ? normalizeCustomerBankAccounts(dirtyValues) : dirtyValues;

    updateCustomer({
      id: customer.id,
      data: data as UpdateCustomerBody,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit as any)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
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
