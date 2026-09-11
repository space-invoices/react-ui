import { zodResolver } from "@hookform/resolvers/zod";
import type { Tax } from "@spaceinvoices/js-sdk";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/ui/components/form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { createTaxSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import {
  createPortugalExemptionReasonRule,
  isPortugalExemptionRate,
  PortugalExemptionFields,
} from "../portugal-exemption/portugal-exemption-fields";
import { useReplaceTax } from "../taxes.hooks";
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
  showPortugalExemptionFields?: boolean;
} & ComponentTranslationProps;

const editTaxSchema = createTaxSchema.extend({
  is_default: z.boolean().optional(),
});
type EditTaxSchema = z.infer<typeof editTaxSchema>;
type PortugalAwareTax = Tax & {
  pt_exemption_code?: string | null;
  pt_exemption_reason?: string | null;
};

export default function EditTaxForm({
  entityId,
  tax,
  onSuccess,
  onError,
  renderSubmitButton,
  showPortugalExemptionFields = false,
  ...i18nProps
}: EditTaxFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const portugalAwareTax = tax as PortugalAwareTax;
  const portugalExemptionReasonRule = createPortugalExemptionReasonRule({
    enabled: showPortugalExemptionFields,
    ...i18nProps,
  });

  const form = useForm<EditTaxSchema>({
    resolver: zodResolver(editTaxSchema.superRefine(portugalExemptionReasonRule)),
    defaultValues: {
      name: tax.name ?? "",
      tax_rates: tax.tax_rates?.map((tr) => ({ rate: tr.rate })) ?? [{ rate: 0 }],
      is_default: tax.is_default ?? false,
      classification: tax.classification ?? undefined,
      pt_exemption_code: portugalAwareTax.pt_exemption_code ?? undefined,
      pt_exemption_reason: portugalAwareTax.pt_exemption_reason ?? undefined,
    },
  });
  const rate = useWatch({
    control: form.control,
    name: "tax_rates.0.rate",
  });
  const showPtFields = showPortugalExemptionFields && isPortugalExemptionRate(rate);

  const { mutate: replaceTax, isPending } = useReplaceTax({
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

  const onSubmit = async (values: EditTaxSchema) => {
    replaceTax({
      id: tax.id,
      data: {
        name: values.name,
        tax_rates: values.tax_rates,
        is_default: values.is_default,
        classification: values.classification,
        pt_exemption_code: values.pt_exemption_code,
        pt_exemption_reason: values.pt_exemption_reason,
      } as any,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />

        <FormInput
          control={form.control}
          name="tax_rates.0.rate"
          label={t("Rate (%)")}
          placeholder={t("Enter rate")}
          type="number"
        />

        {showPtFields && <PortugalExemptionFields {...i18nProps} />}

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
