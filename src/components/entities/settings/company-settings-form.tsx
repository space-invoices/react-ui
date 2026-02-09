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
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;

const companySettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tax_number: z.union([z.string(), z.null()]).optional(),
  tax_number_2: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  address_2: z.union([z.string(), z.null()]).optional(),
  post_code: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
});

type CompanySettingsSchema = z.infer<typeof companySettingsSchema>;

export type CompanySettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

export function CompanySettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
}: CompanySettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations });

  const form = useForm<CompanySettingsSchema>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: entity.name || "",
      tax_number: (entity as any).tax_number || null,
      tax_number_2: (entity as any).tax_number_2 || null,
      address: (entity as any).address || null,
      address_2: (entity as any).address_2 || null,
      post_code: (entity as any).post_code || null,
      city: (entity as any).city || null,
      state: (entity as any).state || null,
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
    formId: "company-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const onSubmit = (values: CompanySettingsSchema) => {
    const updatePayload: any = {};

    if (values.name !== entity.name) updatePayload.name = values.name;
    if (values.tax_number !== (entity as any).tax_number) updatePayload.tax_number = values.tax_number;
    if (values.tax_number_2 !== (entity as any).tax_number_2) updatePayload.tax_number_2 = values.tax_number_2;
    if (values.address !== (entity as any).address) updatePayload.address = values.address;
    if (values.address_2 !== (entity as any).address_2) updatePayload.address_2 = values.address_2;
    if (values.post_code !== (entity as any).post_code) updatePayload.post_code = values.post_code;
    if (values.city !== (entity as any).city) updatePayload.city = values.city;
    if (values.state !== (entity as any).state) updatePayload.state = values.state;

    if (Object.keys(updatePayload).length > 0) {
      updateEntity({ id: entity.id, data: updatePayload });
    } else {
      onSuccess?.(entity);
    }
  };

  return (
    <Form {...form}>
      <form id="company-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-base">{t("Entity Name")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="My Company LLC" className="h-10" />
              </FormControl>
              <FormDescription className="text-xs">{t("Your company or organization name")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_number"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="font-medium text-base">{t("Tax ID")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="12-3456789"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">{t("Tax identification number (optional)")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {(entity as any).country_rules?.features?.includes("tax_number_2") && (
          <FormField
            control={form.control}
            name="tax_number_2"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel className="font-medium text-base">{t("Tax ID 2")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="12/345/67890"
                    className="h-10"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("Secondary tax identification number (optional)")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="border-t pt-6">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-base">{t("Address")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="123 Main Street"
                    className="h-10"
                  />
                </FormControl>
                <FormDescription className="text-xs">{t("Street address")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address_2"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-base">{t("Address Line 2")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="Suite 100"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">{t("Apartment, suite, unit, etc. (optional)")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-base">{t("City")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="San Francisco"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="post_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-base">{t("Postal Code")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="94102"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-base">{t("State/Province")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="CA"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel className="font-medium text-base">{t("Country")}</FormLabel>
            <FormControl>
              <Input value={(entity as any).country || ""} disabled className="h-10" />
            </FormControl>
            <FormDescription className="text-xs">{t("Country cannot be changed")}</FormDescription>
          </FormItem>
        </div>
      </form>
    </Form>
  );
}
