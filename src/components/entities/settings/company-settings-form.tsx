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
import { isPortugalEntity } from "@/ui/lib/country-capabilities";
import { FormattedInput } from "@/ui/lib/formatted-input";
import { LEGAL_FORMS, type LegalDetails, readLegalDetails } from "@/ui/lib/legal-details";
import {
  applyPortugalEntityIssues,
  formatPortugalPostCodeEntry,
  normalizePortugalEntityInput,
  normalizePortugalTaxNumberInput,
  type PortugalAmountInput,
  portugalShareCapitalSchema,
  toSubmittableShareCapital,
} from "@/ui/lib/pt-entity-input";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";
import { PortugalCompanyFields } from "./portugal-company-fields";

const translations = { bg, cs, de, en, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

/**
 * The Portugal rules are applied to the whole form value, because the API re-runs
 * them against the merged entity on every update: a save that blanks a required
 * field must fail here with a localized message rather than as a raw 422. The
 * refinement no-ops for every other country.
 */
function createCompanySettingsSchema(t: (key: string) => string, countryCode: string | null | undefined) {
  return (
    z
      .object({
        name: z.string().min(1, "Name is required"),
        email: z
          .union([
            z.string().trim().max(255, t("Invalid email address")).email(t("Invalid email address")),
            z.literal(""),
            z.null(),
          ])
          .optional(),
        tax_number: z.union([z.string(), z.null()]).optional(),
        is_tax_subject: z.boolean(),
        tax_number_2: z.union([z.string(), z.null()]).optional(),
        address: z.union([z.string(), z.null()]).optional(),
        address_2: z.union([z.string(), z.null()]).optional(),
        post_code: z.union([z.string(), z.null()]).optional(),
        city: z.union([z.string(), z.null()]).optional(),
        state: z.union([z.string(), z.null()]).optional(),
        // Portugal-only fields; see PortugalCompanyFields.
        company_number: z.union([z.string(), z.null()]).optional(),
        phone: z.union([z.string(), z.null()]).optional(),
        starting_capital: portugalShareCapitalSchema,
        // Flat here, assembled into settings.legal_details on submit.
        legal_form: z.enum(LEGAL_FORMS).nullable().optional(),
        registration_office: z.union([z.string(), z.null()]).optional(),
        paid_up_capital: portugalShareCapitalSchema,
        equity: portugalShareCapitalSchema,
        in_liquidation: z.boolean().nullable().optional(),
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
      })
      // The Portuguese fields are accepted in the spellings a business has them printed
      // in, and stored in the one spelling the API keeps. Normalizing here rather than in
      // the inputs means a save made straight from the keyboard sends the same value a
      // blur would have shown. No-ops for other countries.
      .transform((values) => ({
        ...values,
        ...normalizePortugalEntityInput({ ...values, country_code: countryCode }),
      }))
      .superRefine((values, ctx) =>
        applyPortugalEntityIssues({ ...values, country_code: countryCode }, ctx, { requireLegalForm: true }),
      )
  );
}

type CompanySettingsSchema = z.infer<ReturnType<typeof createCompanySettingsSchema>>;
type BankAccountType = CompanySettingsSchema["bank_account_type"];

function emptyToNull(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

/**
 * A cleared numeric disclosure is `null` — an explicit "this does not apply to us".
 *
 * Text `NumericInput` could not parse never reaches this: the Portugal refinement fails the
 * submit on it, so a mistyped figure is reported on its own field instead of being written
 * back as `null` over a disclosure the entity had already published.
 */
function toSubmittableAmount(value: PortugalAmountInput): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The legal_details block this form owns. It is only assembled once the user has
 * chosen a legal form. Portugal validation requires the choice before submitting;
 * other countries may omit this country-specific block.
 */
function buildLegalDetails(values: CompanySettingsSchema): LegalDetails | null {
  if (!values.legal_form) return null;

  return {
    legal_form: values.legal_form,
    registration_office: emptyToNull(values.registration_office),
    paid_up_capital: toSubmittableAmount(values.paid_up_capital),
    equity: toSubmittableAmount(values.equity),
    in_liquidation: values.in_liquidation ?? null,
  };
}

function isSameLegalDetails(next: LegalDetails, current: LegalDetails | null): boolean {
  if (!current) return false;

  return (
    next.legal_form === (current.legal_form ?? null) &&
    next.registration_office === (current.registration_office ?? null) &&
    next.paid_up_capital === (current.paid_up_capital ?? null) &&
    next.equity === (current.equity ?? null) &&
    next.in_liquidation === (current.in_liquidation ?? null)
  );
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
  const storedLegalDetails = readLegalDetails(entity.settings);
  const primaryBankAccount = getPrimaryBankAccount(currentSettings);
  const bankAccountType = getDefaultBankAccountType(entity, primaryBankAccount);
  // Matches the schema refinement, which normalizes country_code the same way — the two
  // must agree or a Portugal entity gets the rules enforced without the inputs to satisfy them.
  const showPortugalFields = isPortugalEntity(entity as any);

  const form = useForm<CompanySettingsSchema>({
    resolver: zodResolver(createCompanySettingsSchema(t, entity.country_code)),
    defaultValues: {
      name: entity.name || "",
      email: entity.email ?? null,
      tax_number: (entity as any).tax_number || null,
      is_tax_subject: entity.is_tax_subject ?? true,
      tax_number_2: (entity as any).tax_number_2 || null,
      address: (entity as any).address || null,
      address_2: (entity as any).address_2 || null,
      post_code: (entity as any).post_code || null,
      city: (entity as any).city || null,
      state: (entity as any).state || null,
      company_number: entity.company_number ?? null,
      phone: entity.phone ?? null,
      starting_capital: entity.starting_capital ?? null,
      legal_form: storedLegalDetails?.legal_form ?? null,
      registration_office: storedLegalDetails?.registration_office ?? null,
      paid_up_capital: storedLegalDetails?.paid_up_capital ?? null,
      equity: storedLegalDetails?.equity ?? null,
      in_liquidation: storedLegalDetails?.in_liquidation ?? null,
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
      form.reset({ ...form.getValues(), email: data.email ?? null });
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
    const normalizedEmail = emptyToNull(values.email);
    if (normalizedEmail !== (entity.email ?? null)) updatePayload.email = normalizedEmail;
    if (values.tax_number !== (entity as any).tax_number) updatePayload.tax_number = values.tax_number;
    if (values.is_tax_subject !== entity.is_tax_subject) updatePayload.is_tax_subject = values.is_tax_subject;
    if (values.tax_number_2 !== (entity as any).tax_number_2) updatePayload.tax_number_2 = values.tax_number_2;
    if (values.address !== (entity as any).address) updatePayload.address = values.address;
    if (values.address_2 !== (entity as any).address_2) updatePayload.address_2 = values.address_2;
    if (values.post_code !== (entity as any).post_code) updatePayload.post_code = values.post_code;
    if (values.city !== (entity as any).city) updatePayload.city = values.city;
    if (values.state !== (entity as any).state) updatePayload.state = values.state;

    let nextLegalDetails: LegalDetails | null = null;

    if (showPortugalFields) {
      const portugalChanges = {
        company_number: emptyToNull(values.company_number),
        phone: emptyToNull(values.phone),
        starting_capital: toSubmittableShareCapital(values.starting_capital) ?? null,
      };

      for (const [field, value] of Object.entries(portugalChanges)) {
        if (value !== ((entity as Record<string, any>)[field] ?? null)) updatePayload[field] = value;
      }

      nextLegalDetails = buildLegalDetails(values);
    }

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

    // Send only keys this surface owns — see useUpdateEntity's settings contract
    if (nextLegalDetails && !isSameLegalDetails(nextLegalDetails, storedLegalDetails)) {
      updatePayload.settings = { ...updatePayload.settings, legal_details: nextLegalDetails };
    }

    if (bankChanged) {
      updatePayload.settings = {
        ...updatePayload.settings,
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
      form.reset({ ...form.getValues(), email: normalizedEmail });
      onSuccess?.(entity);
    }
  };

  return (
    <Form {...form} locale={translationLocale || locale}>
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-base">{t("Entity Email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  maxLength={255}
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="billing@example.com"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">
                {t("Email shown for this entity on documents and template variables")}
              </FormDescription>
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
                  <FormattedInput
                    name={field.name}
                    ref={field.ref}
                    disabled={field.disabled}
                    value={field.value || ""}
                    inputMode={showPortugalFields ? "numeric" : undefined}
                    formatter={showPortugalFields ? normalizePortugalTaxNumberInput : undefined}
                    onValueChange={(value) => field.onChange(value || null)}
                    onBlur={field.onBlur}
                    placeholder={showPortugalFields ? "501442600" : "12-3456789"}
                    className="h-10"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {showPortugalFields
                    ? t("9 digits. You can paste it with spaces or a PT prefix.")
                    : t("Tax identification number (optional)")}
                </FormDescription>
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
                  <FormattedInput
                    name={field.name}
                    ref={field.ref}
                    disabled={field.disabled}
                    value={field.value || ""}
                    inputMode={showPortugalFields ? "numeric" : undefined}
                    autoComplete="postal-code"
                    formatter={showPortugalFields ? formatPortugalPostCodeEntry : undefined}
                    onValueChange={(value) => field.onChange(value || null)}
                    onBlur={field.onBlur}
                    placeholder={showPortugalFields ? "1000-001" : "94102"}
                    className="h-10"
                  />
                </FormControl>
                {showPortugalFields && (
                  <FormDescription className="text-xs">
                    {t("Enter 7 digits; the hyphen is added automatically.")}
                  </FormDescription>
                )}
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
                    placeholder={showPortugalFields ? "Lisboa" : "CA"}
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

        {showPortugalFields && (
          <PortugalCompanyFields
            control={form.control}
            t={t}
            inputLocale={locale ?? "en"}
            storedLegalDetails={storedLegalDetails}
          />
        )}

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
                        placeholder={showPortugalFields ? "PT50 0002 0123 1234 5678 9015 4" : "SI56 0123 4567 8901 234"}
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
