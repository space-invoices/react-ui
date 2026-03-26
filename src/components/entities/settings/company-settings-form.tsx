import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "@/ui/components/ui/checkbox";
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
  is_tax_subject: z.boolean(),
  tax_number_2: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  address_2: z.union([z.string(), z.null()]).optional(),
  post_code: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
  // Bank account fields (stored in settings.bank_accounts array)
  bank_account_iban: z
    .union([z.string(), z.null()])
    .refine((val) => !val || /^[A-Z]{2}[0-9A-Z]{2,32}$/.test(val.replace(/\s/g, "")), {
      message: "Must be a valid IBAN",
    })
    .optional(),
  bank_account_name: z.union([z.string(), z.null()]).optional(),
  bank_account_bank_name: z.union([z.string(), z.null()]).optional(),
  bank_account_bic: z.union([z.string(), z.null()]).optional(),
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
  translationLocale,
  onSuccess,
  onError,
}: CompanySettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });

  const currentSettings = (entity.settings as any) || {};

  const form = useForm<CompanySettingsSchema>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: entity.name || "",
      tax_number: (entity as any).tax_number || null,
      is_tax_subject: entity.is_tax_subject ?? true,
      tax_number_2: (entity as any).tax_number_2 || null,
      address: (entity as any).address || null,
      address_2: (entity as any).address_2 || null,
      post_code: (entity as any).post_code || null,
      city: (entity as any).city || null,
      state: (entity as any).state || null,
      bank_account_iban: currentSettings.bank_accounts?.[0]?.iban || null,
      bank_account_name: currentSettings.bank_accounts?.[0]?.name || null,
      bank_account_bank_name: currentSettings.bank_accounts?.[0]?.bank_name || null,
      bank_account_bic: currentSettings.bank_accounts?.[0]?.bic || null,
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
    if (values.is_tax_subject !== entity.is_tax_subject) updatePayload.is_tax_subject = values.is_tax_subject;
    if (values.tax_number_2 !== (entity as any).tax_number_2) updatePayload.tax_number_2 = values.tax_number_2;
    if (values.address !== (entity as any).address) updatePayload.address = values.address;
    if (values.address_2 !== (entity as any).address_2) updatePayload.address_2 = values.address_2;
    if (values.post_code !== (entity as any).post_code) updatePayload.post_code = values.post_code;
    if (values.city !== (entity as any).city) updatePayload.city = values.city;
    if (values.state !== (entity as any).state) updatePayload.state = values.state;

    // Check if bank account fields changed
    const currentIban = currentSettings.bank_accounts?.[0]?.iban || null;
    const currentBankName = currentSettings.bank_accounts?.[0]?.name || null;
    const currentBankBankName = currentSettings.bank_accounts?.[0]?.bank_name || null;
    const currentBic = currentSettings.bank_accounts?.[0]?.bic || null;

    const bankChanged =
      values.bank_account_iban !== currentIban ||
      values.bank_account_name !== currentBankName ||
      values.bank_account_bank_name !== currentBankBankName ||
      values.bank_account_bic !== currentBic;

    if (bankChanged) {
      updatePayload.settings = {
        ...currentSettings,
        bank_accounts: values.bank_account_iban
          ? [
              {
                type: "iban" as const,
                iban: values.bank_account_iban,
                name: values.bank_account_name || undefined,
                bank_name: values.bank_account_bank_name || undefined,
                bic: values.bank_account_bic || undefined,
                is_default: true,
              },
              ...(currentSettings.bank_accounts?.slice(1) || []),
            ]
          : currentSettings.bank_accounts || undefined,
      };
    }

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

        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
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
          <FormField
            control={form.control}
            name="is_tax_subject"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-7">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">{t("Tax subject")}</FormLabel>
              </FormItem>
            )}
          />
        </div>

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

        <div className="border-t pt-6">
          <p className="mb-4 font-medium text-base">{t("Bank Account")}</p>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="bank_account_iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("IBAN")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, "") || null)}
                      placeholder="SI56 0123 4567 8901 234"
                      className="h-10 font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_account_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Account Name")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder={t("Main Business Account")}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bank_account_bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Bank Name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="NLB d.d."
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_account_bic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("BIC/SWIFT")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase() || null)}
                        placeholder="LJBASI2X"
                        className="h-10 font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
