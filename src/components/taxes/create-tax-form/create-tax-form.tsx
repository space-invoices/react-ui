import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateTaxRequest, Tax } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/ui/components/form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { createTaxSchema as baseCreateTaxSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

// Extend base schema with is_default field
const createTaxSchema = baseCreateTaxSchema.extend({
  is_default: z.boolean().optional(),
});
type CreateTaxSchema = z.infer<typeof createTaxSchema>;

import { useCreateTax } from "../taxes.hooks";
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

type CreateTaxFormProps = {
  entityId: string;
  onSuccess?: (tax: Tax) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function CreateTaxForm({
  entityId,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: CreateTaxFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const form = useForm<CreateTaxSchema>({
    resolver: zodResolver(createTaxSchema),
    defaultValues: {
      name: "",
      tax_rates: [{ rate: undefined }],
      is_default: false,
    },
  });

  const { mutate: createTax, isPending } = useCreateTax({
    entityId,
    onSuccess: (tax, _variables, _context) => {
      onSuccess?.(tax);
      form.reset();
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error creating the tax"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateTaxSchema) => {
    // SDK accepts both Date and string for date fields, no conversion needed
    createTax(values as CreateTaxRequest);
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />

        <FormInput
          control={form.control}
          name="tax_rates.0.rate"
          label={t("Rate (%)")}
          placeholder={t("Enter rate")}
          type="number"
        />

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">{t("Set as default tax")}</FormLabel>
            </FormItem>
          )}
        />

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
