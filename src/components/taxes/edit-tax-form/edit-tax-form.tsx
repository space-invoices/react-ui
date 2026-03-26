import { zodResolver } from "@hookform/resolvers/zod";
import type { Tax } from "@spaceinvoices/js-sdk";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/ui/components/form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { createTaxSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
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

  const form = useForm<EditTaxSchema>({
    resolver: zodResolver(editTaxSchema),
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
  const showPtFields = showPortugalExemptionFields && Number(rate ?? 0) === 0;

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />

        <FormInput
          control={form.control}
          name="tax_rates.0.rate"
          label={t("Rate (%)")}
          placeholder={t("Enter rate")}
          type="number"
        />

        {showPtFields && (
          <div className="space-y-4 rounded-lg border border-dashed p-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">{t("Portugal exemption metadata")}</p>
              <p className="text-muted-foreground text-sm">
                {t("0% Portugal taxes require an exemption code and legal reason for SAF-T and certified documents.")}
              </p>
            </div>

            <FormInput
              control={form.control}
              name="pt_exemption_code"
              label={t("Exemption code")}
              placeholder={t("Enter exemption code")}
            />

            <FormField
              control={form.control}
              name="pt_exemption_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Exemption reason")}</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder={t("Enter exemption reason")}
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value || undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("Keep this aligned with the legal basis used on issued Portugal documents.")}
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )}

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
