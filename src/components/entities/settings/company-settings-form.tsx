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
import de from "./locales/de";
import sl from "./locales/sl";

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
  bank_account_type: z.enum(["iban", "us_domestic", "uk_domestic", "other"]),
  bank_account_iban: z
    .union([z.string(), z.null()])
    .refine((val) => !val || /^[A-Z]{2}[0-9A-Z]{2,32}$/.test(val.replace(/\s/g, "")), {
      message: "Must be a valid IBAN",
    })
    .optional(),
  bank_account_account_number: z.union([z.string(), z.null()]).optional(),
  bank_account_name: z.union([z.string(), z.null()]).optional(),
  bank_account_bank_name: z.union([z.string(), z.null()]).optional(),
  bank_account_bic: z.union([z.string(), z.null()]).optional(),
  bank_account_routing_number: z.union([z.string(), z.null()]).optional(),
  bank_account_sort_code: z.union([z.string(), z.null()]).optional(),
});

type CompanySettingsSchema = z.infer<typeof companySettingsSchema>;
type BankAccountType = CompanySettingsSchema["bank_account_type"];

function emptyToNull(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function getPrimaryBankAccount(currentSettings: any) {
  return Array.isArray(currentSettings.bank_accounts) ? currentSettings.bank_accounts[0] : undefined;
}

function getDefaultBankAccountType(entity: Entity, bankAccount: any): BankAccountType {
  if (bankAccount?.type) return bankAccount.type;
  return (entity as any).country_code === "US" ? "us_domestic" : "iban";
}

function getBankAccountValue(bankAccount: any, key: string) {
  return bankAccount?.[key] || null;
}

function buildBankAccounts(values: CompanySettingsSchema, currentSettings: any) {
  const existingBankAccounts = Array.isArray(currentSettings.bank_accounts) ? currentSettings.bank_accounts : [];
  const bankAccountBase = {
    name: values.bank_account_name || undefined,
    bank_name: values.bank_account_bank_name || undefined,
    is_default: true,
  };

  if (values.bank_account_type === "iban") {
    return values.bank_account_iban
      ? [
          {
            type: "iban" as const,
            ...bankAccountBase,
            iban: values.bank_account_iban,
            bic: values.bank_account_bic || undefined,
          },
          ...existingBankAccounts.slice(1),
        ]
      : currentSettings.bank_accounts || undefined;
  }

  return values.bank_account_account_number
    ? [
        {
          type: values.bank_account_type,
          ...bankAccountBase,
          account_number: values.bank_account_account_number,
          routing_number:
            values.bank_account_type === "us_domestic" ? values.bank_account_routing_number || undefined : undefined,
          sort_code:
            values.bank_account_type === "uk_domestic" ? values.bank_account_sort_code || undefined : undefined,
          bic: values.bank_account_type === "other" ? values.bank_account_bic || undefined : undefined,
        },
        ...existingBankAccounts.slice(1),
      ]
    : currentSettings.bank_accounts || undefined;
}

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
  const primaryBankAccount = getPrimaryBankAccount(currentSettings);
  const bankAccountType = getDefaultBankAccountType(entity, primaryBankAccount);

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
      bank_account_type: bankAccountType,
      bank_account_iban: getBankAccountValue(primaryBankAccount, "iban"),
      bank_account_account_number: getBankAccountValue(primaryBankAccount, "account_number"),
      bank_account_name: getBankAccountValue(primaryBankAccount, "name"),
      bank_account_bank_name: getBankAccountValue(primaryBankAccount, "bank_name"),
      bank_account_bic: getBankAccountValue(primaryBankAccount, "bic"),
      bank_account_routing_number: getBankAccountValue(primaryBankAccount, "routing_number"),
      bank_account_sort_code: getBankAccountValue(primaryBankAccount, "sort_code"),
    },
  });
  const selectedBankAccountType = form.watch("bank_account_type");

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
    const currentType = getDefaultBankAccountType(entity, primaryBankAccount);
    const currentIban = getBankAccountValue(primaryBankAccount, "iban");
    const currentAccountNumber = getBankAccountValue(primaryBankAccount, "account_number");
    const currentBankName = getBankAccountValue(primaryBankAccount, "name");
    const currentBankBankName = getBankAccountValue(primaryBankAccount, "bank_name");
    const currentBic = getBankAccountValue(primaryBankAccount, "bic");
    const currentRoutingNumber = getBankAccountValue(primaryBankAccount, "routing_number");
    const currentSortCode = getBankAccountValue(primaryBankAccount, "sort_code");

    const bankChanged =
      values.bank_account_type !== currentType ||
      emptyToNull(values.bank_account_iban) !== currentIban ||
      emptyToNull(values.bank_account_account_number) !== currentAccountNumber ||
      emptyToNull(values.bank_account_name) !== currentBankName ||
      emptyToNull(values.bank_account_bank_name) !== currentBankBankName ||
      emptyToNull(values.bank_account_bic) !== currentBic ||
      emptyToNull(values.bank_account_routing_number) !== currentRoutingNumber ||
      emptyToNull(values.bank_account_sort_code) !== currentSortCode;

    if (bankChanged) {
      // Send only keys this surface owns — see useUpdateEntity's settings contract
      updatePayload.settings = {
        bank_accounts: buildBankAccounts(
          {
            ...values,
            bank_account_iban: emptyToNull(values.bank_account_iban),
            bank_account_account_number: emptyToNull(values.bank_account_account_number),
            bank_account_name: emptyToNull(values.bank_account_name),
            bank_account_bank_name: emptyToNull(values.bank_account_bank_name),
            bank_account_bic: emptyToNull(values.bank_account_bic),
            bank_account_routing_number: emptyToNull(values.bank_account_routing_number),
            bank_account_sort_code: emptyToNull(values.bank_account_sort_code),
          },
          currentSettings,
        ),
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
            {selectedBankAccountType === "iban" ? (
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
            ) : (
              <FormField
                control={form.control}
                name="bank_account_account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Account Number")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="123456789"
                        className="h-10 font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

              {selectedBankAccountType === "us_domestic" ? (
                <FormField
                  control={form.control}
                  name="bank_account_routing_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Routing Number")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="021000021"
                          className="h-10 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : selectedBankAccountType === "uk_domestic" ? (
                <FormField
                  control={form.control}
                  name="bank_account_sort_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Sort Code")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="12-34-56"
                          className="h-10 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
