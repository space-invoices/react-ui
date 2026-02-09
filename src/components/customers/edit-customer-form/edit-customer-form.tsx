import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, Customer } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { CompanyRegistryAutocomplete } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Form } from "@/ui/components/ui/form";
import type { CreateCustomerSchema } from "@/ui/generated/schemas";
import { createCustomerSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useUpdateCustomer } from "../customers.hooks";
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
    form.setValue("name", company.name);
    if (company.address) form.setValue("address", company.address);
    if (company.post_code) form.setValue("post_code", company.post_code);
    if (company.city) form.setValue("city", company.city);
    if (company.tax_number) form.setValue("tax_number", company.tax_number);
  };

  const form = useForm<CreateCustomerSchema>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: customer.name ?? "",
      address: customer.address ?? "",
      post_code: customer.post_code ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      country: customer.country ?? "",
      tax_number: customer.tax_number ?? "",
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

  const onSubmit = async (values: CreateCustomerSchema) => {
    updateCustomer({
      id: customer.id,
      data: values,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {entityCountryCode && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-4">
            <CompanyRegistryAutocomplete
              countryCode={entityCountryCode}
              onSelect={handleCompanySelect}
              placeholder={t("Search by company name or tax number")}
            />
          </div>
        )}

        <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />

        <FormInput control={form.control} name="address" label={t("Address")} placeholder={t("Enter address")} />

        <div className="grid grid-cols-2 gap-4">
          <FormInput control={form.control} name="post_code" label={t("Post Code")} />
          <FormInput control={form.control} name="city" label={t("City")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput control={form.control} name="state" label={t("State")} />
          <FormInput control={form.control} name="country" label={t("Country")} />
        </div>

        <FormInput control={form.control} name="tax_number" label={t("Tax Number")} />

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
