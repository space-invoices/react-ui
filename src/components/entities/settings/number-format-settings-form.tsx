import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
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

const numberFormatSettingsSchema = z.object({
  invoice_format: z.union([z.string(), z.null()]).optional(),
  estimate_format: z.union([z.string(), z.null()]).optional(),
  credit_note_format: z.union([z.string(), z.null()]).optional(),
  advance_invoice_format: z.union([z.string(), z.null()]).optional(),
});

type NumberFormatSettingsSchema = z.infer<typeof numberFormatSettingsSchema>;

export type NumberFormatSettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

/**
 * Get a preview of what the document number will look like
 */
function getFormatPreview(format: string | null | undefined): string {
  if (!format) return "";

  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);

  // Replace format tokens with example values
  let preview = format;
  preview = preview.replace("{yyyy}", year.toString());
  preview = preview.replace("{yy}", shortYear);
  preview = preview.replace(/\{n+\}/g, (match) => {
    const digits = match.length - 2; // subtract { and }
    return "1".padStart(digits, "0");
  });

  return preview;
}

export function NumberFormatSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
}: NumberFormatSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations });

  const currentSettings = (entity.settings as any) || {};
  const numberFormats = currentSettings.number_formats || {};

  const form = useForm<NumberFormatSettingsSchema>({
    resolver: zodResolver(numberFormatSettingsSchema),
    defaultValues: {
      invoice_format: numberFormats.invoice || "{yyyy}-{nnnnn}",
      estimate_format: numberFormats.estimate || "{yyyy}-{nnnnn}",
      credit_note_format: numberFormats.credit_note || "{yyyy}-{nnnnn}",
      advance_invoice_format: numberFormats.advance_invoice || "{yyyy}-{nnnnn}",
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

  const onSubmit = (values: NumberFormatSettingsSchema) => {
    const updatePayload: any = {
      settings: {
        ...currentSettings,
        number_formats: {
          invoice: values.invoice_format || null,
          estimate: values.estimate_format || null,
          credit_note: values.credit_note_format || null,
          advance_invoice: values.advance_invoice_format || null,
        },
      },
    };

    updateEntity({ id: entity.id, data: updatePayload });
  };

  // Watch values for live preview
  const invoiceFormat = form.watch("invoice_format");
  const estimateFormat = form.watch("estimate_format");
  const creditNoteFormat = form.watch("credit_note_format");
  const advanceInvoiceFormat = form.watch("advance_invoice_format");

  return (
    <Form {...form}>
      <form id="number-format-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="invoice" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="invoice" className="cursor-pointer">
              {t("Invoice")}
            </TabsTrigger>
            <TabsTrigger value="estimate" className="cursor-pointer">
              {t("Estimate")}
            </TabsTrigger>
            <TabsTrigger value="credit_note" className="cursor-pointer">
              {t("Credit Note")}
            </TabsTrigger>
            <TabsTrigger value="advance_invoice" className="cursor-pointer">
              {t("Advance Invoice")}
            </TabsTrigger>
          </TabsList>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="invoice_format"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="{yyyy}-{nnnnn}"
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("Preview")}: <span className="font-mono">{getFormatPreview(invoiceFormat)}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* Estimate Tab */}
          <TabsContent value="estimate" className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="estimate_format"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="{yyyy}-{nnnnn}"
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("Preview")}: <span className="font-mono">{getFormatPreview(estimateFormat)}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* Credit Note Tab */}
          <TabsContent value="credit_note" className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="credit_note_format"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="{yyyy}-{nnnnn}"
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("Preview")}: <span className="font-mono">{getFormatPreview(creditNoteFormat)}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* Advance Invoice Tab */}
          <TabsContent value="advance_invoice" className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="advance_invoice_format"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="{yyyy}-{nnnnn}"
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("Preview")}: <span className="font-mono">{getFormatPreview(advanceInvoiceFormat)}</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
