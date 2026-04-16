import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;
const DOCUMENT_FORMAT_TYPES = ["invoice", "estimate", "credit_note", "advance_invoice", "delivery_note"] as const;
const DEFAULT_MAIN_FORMAT = "{yyyy}-{nnnnn}";
const DEFAULT_UNIT_FORMAT = "{yyyy}-{u}-{nnnnn}";

const numberFormatSettingsSchema = z.object({
  invoice_format: z.union([z.string(), z.null()]).optional(),
  estimate_format: z.union([z.string(), z.null()]).optional(),
  credit_note_format: z.union([z.string(), z.null()]).optional(),
  advance_invoice_format: z.union([z.string(), z.null()]).optional(),
  delivery_note_format: z.union([z.string(), z.null()]).optional(),
  unit_invoice_format: z.union([z.string(), z.null()]).optional(),
  unit_estimate_format: z.union([z.string(), z.null()]).optional(),
  unit_credit_note_format: z.union([z.string(), z.null()]).optional(),
  unit_advance_invoice_format: z.union([z.string(), z.null()]).optional(),
  unit_delivery_note_format: z.union([z.string(), z.null()]).optional(),
});

type NumberFormatSettingsSchema = z.infer<typeof numberFormatSettingsSchema>;
type FormatType = (typeof DOCUMENT_FORMAT_TYPES)[number];

export type NumberFormatSettingsFormProps = {
  entity: Entity;
  hasBusinessUnits?: boolean;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

function getFormatPreview(format: string | null | undefined): string {
  if (!format) return "";

  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const exampleUnitIndex = 2;

  let preview = format;
  preview = preview.replace("{yyyy}", year.toString());
  preview = preview.replace("{yy}", shortYear);
  preview = preview.replace(/\{u+\}/g, (match) => {
    const digits = match.length - 2;
    return String(exampleUnitIndex).padStart(digits, "0");
  });
  preview = preview.replace(/\{n+\}/g, (match) => {
    const digits = match.length - 2;
    return "1".padStart(digits, "0");
  });

  return preview;
}

function formatFieldName(type: FormatType) {
  return `${type}_format` as const;
}

function unitFormatFieldName(type: FormatType) {
  return `unit_${type}_format` as const;
}

function normalizeFormat(value: string | null | undefined) {
  return value?.trim() || "";
}

function getDocumentLabel(type: FormatType, t: (value: string) => string) {
  switch (type) {
    case "invoice":
      return t("Invoice");
    case "estimate":
      return t("Estimate");
    case "credit_note":
      return t("Credit Note");
    case "advance_invoice":
      return t("Advance Invoice");
    case "delivery_note":
      return t("Delivery Note");
  }
}

export function NumberFormatSettingsForm({
  entity,
  hasBusinessUnits = false,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: NumberFormatSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });

  const currentSettings = (entity.settings as any) || {};
  const numberFormats = currentSettings.number_formats || {};
  const unitNumberFormats = currentSettings.unit_number_formats || {};

  const form = useForm<NumberFormatSettingsSchema>({
    resolver: zodResolver(numberFormatSettingsSchema),
    defaultValues: {
      invoice_format: numberFormats.invoice || DEFAULT_MAIN_FORMAT,
      estimate_format: numberFormats.estimate || DEFAULT_MAIN_FORMAT,
      credit_note_format: numberFormats.credit_note || DEFAULT_MAIN_FORMAT,
      advance_invoice_format: numberFormats.advance_invoice || DEFAULT_MAIN_FORMAT,
      delivery_note_format: numberFormats.delivery_note || DEFAULT_MAIN_FORMAT,
      unit_invoice_format: unitNumberFormats.invoice || DEFAULT_UNIT_FORMAT,
      unit_estimate_format: unitNumberFormats.estimate || DEFAULT_UNIT_FORMAT,
      unit_credit_note_format: unitNumberFormats.credit_note || DEFAULT_UNIT_FORMAT,
      unit_advance_invoice_format: unitNumberFormats.advance_invoice || DEFAULT_UNIT_FORMAT,
      unit_delivery_note_format: unitNumberFormats.delivery_note || DEFAULT_UNIT_FORMAT,
    },
  });

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "number-format-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const watchedValues = form.watch();

  const overlapConflicts = useMemo(() => {
    if (!hasBusinessUnits) return [] as FormatType[];

    return DOCUMENT_FORMAT_TYPES.filter((type) => {
      const main = normalizeFormat(watchedValues[formatFieldName(type)]);
      const unit = normalizeFormat(watchedValues[unitFormatFieldName(type)]);
      return !!main && !!unit && main === unit;
    });
  }, [hasBusinessUnits, watchedValues]);

  const onSubmit = (values: NumberFormatSettingsSchema) => {
    form.clearErrors();

    if (hasBusinessUnits) {
      let hasConflict = false;

      for (const type of DOCUMENT_FORMAT_TYPES) {
        const main = normalizeFormat(values[formatFieldName(type)]);
        const unit = normalizeFormat(values[unitFormatFieldName(type)]);

        if (main && unit && main === unit) {
          hasConflict = true;
          form.setError(unitFormatFieldName(type), {
            type: "validate",
            message: t("Business-unit numbering must differ from the main document format."),
          });
        }
      }

      if (hasConflict) {
        return;
      }
    }

    const updatePayload: any = {
      settings: {
        ...currentSettings,
        number_formats: {
          invoice: values.invoice_format || null,
          estimate: values.estimate_format || null,
          credit_note: values.credit_note_format || null,
          advance_invoice: values.advance_invoice_format || null,
          delivery_note: values.delivery_note_format || null,
        },
        ...(hasBusinessUnits
          ? {
              unit_number_formats: {
                invoice: values.unit_invoice_format || null,
                estimate: values.unit_estimate_format || null,
                credit_note: values.unit_credit_note_format || null,
                advance_invoice: values.unit_advance_invoice_format || null,
                delivery_note: values.unit_delivery_note_format || null,
              },
            }
          : {}),
      },
    };

    updateEntity({ id: entity.id, data: updatePayload });
  };

  return (
    <Form {...form}>
      <form id="number-format-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="invoice" className="w-full">
          <TabsList className="w-full">
            {DOCUMENT_FORMAT_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="cursor-pointer">
                {getDocumentLabel(type, t)}
              </TabsTrigger>
            ))}
          </TabsList>

          {DOCUMENT_FORMAT_TYPES.map((type) => {
            const mainName = formatFieldName(type);
            const unitName = unitFormatFieldName(type);
            const mainValue = watchedValues[mainName];
            const unitValue = watchedValues[unitName];
            const hasConflict = overlapConflicts.includes(type);

            return (
              <TabsContent key={type} value={type} className="mt-4 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm">{t("Main documents")}</h3>
                    <p className="text-muted-foreground text-xs">{t("Used when no business unit is selected.")}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name={mainName}
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder={DEFAULT_MAIN_FORMAT}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t("Preview")}: <span className="font-mono">{getFormatPreview(mainValue)}</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasBusinessUnits && (
                  <div className="space-y-4 border-t pt-6">
                    <div>
                      <h3 className="font-medium text-sm">{t("Business-unit documents")}</h3>
                      <p className="text-muted-foreground text-xs">
                        {t(
                          "Used when a business unit is selected. Default formats should include {u} to stay distinct.",
                        )}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name={unitName}
                      render={({ field }) => (
                        <FormItem className="max-w-sm">
                          <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder={DEFAULT_UNIT_FORMAT}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("Preview")}: <span className="font-mono">{getFormatPreview(unitValue)}</span>
                            <br />
                            {t("If this format matches the main document format, saving is blocked.")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {hasConflict && (
                      <p className="text-destructive text-xs">
                        {t("Business-unit numbering must differ from the main document format.")}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </form>
    </Form>
  );
}
