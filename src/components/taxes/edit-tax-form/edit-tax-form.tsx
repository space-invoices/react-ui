import { zodResolver } from "@hookform/resolvers/zod";
import type { Tax } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { FormInput } from "@/ui/components/form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import type { UpdateTaxSchema } from "@/ui/generated/schemas";
import { updateTaxSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useUpdateTax } from "../taxes.hooks";
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

type EditTaxFormProps = {
  entityId: string;
  tax: Tax;
  onSuccess?: (tax: Tax) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function EditTaxForm({
  entityId,
  tax,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: EditTaxFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const form = useForm<UpdateTaxSchema>({
    resolver: zodResolver(updateTaxSchema),
    defaultValues: {
      tax_rates: tax.tax_rates?.map((tr) => ({ rate: tr.rate })) ?? [{ rate: 0 }],
      is_default: tax.is_default ?? false,
    },
  });

  const { mutate: updateTax, isPending } = useUpdateTax({
    entityId,
    onSuccess: (updatedTax, _variables, _context) => {
      onSuccess?.(updatedTax);
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error updating the tax"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: UpdateTaxSchema) => {
    updateTax({
      id: tax.id,
      data: values,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
