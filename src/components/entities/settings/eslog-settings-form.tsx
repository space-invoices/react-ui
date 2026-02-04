import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { Switch } from "@/ui/components/ui/switch";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";

const eslogSettingsSchema = z.object({
  eslog_validation_enabled: z.boolean(),
});

type EslogSettingsSchema = z.infer<typeof eslogSettingsSchema>;

export type EslogSettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

export function EslogSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
}: EslogSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations: {} });

  const currentSettings = (entity.settings as Record<string, unknown>) || {};

  const form = useForm<EslogSettingsSchema>({
    resolver: zodResolver(eslogSettingsSchema),
    defaultValues: {
      eslog_validation_enabled: !!currentSettings.eslog_validation_enabled,
    },
  });

  // Reset form when entity data changes (e.g., after refetch)
  useEffect(() => {
    form.reset({
      eslog_validation_enabled: !!currentSettings.eslog_validation_enabled,
    });
  }, [currentSettings.eslog_validation_enabled, form]);

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "eslog-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const onSubmit = (values: EslogSettingsSchema) => {
    updateEntity({
      id: entity.id,
      data: {
        settings: {
          ...currentSettings,
          eslog_validation_enabled: values.eslog_validation_enabled,
        },
      },
    });
  };

  return (
    <Form {...form}>
      <form id="eslog-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="eslog_validation_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("Enable e-SLOG validation")}</FormLabel>
                <FormDescription>
                  {t(
                    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.",
                  )}
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <p className="font-medium">{t("About e-SLOG 2.0")}</p>
          <p className="mt-1">
            {t(
              "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.",
            )}
          </p>
        </div>
      </form>
    </Form>
  );
}
