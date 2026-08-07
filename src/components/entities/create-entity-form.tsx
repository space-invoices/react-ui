import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, CreateEntityBody, Entity } from "@spaceinvoices/js-sdk";
import { useEffect, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Autocomplete } from "@/ui/common/autocomplete";
import { useCompanyRegistrySearch, useIsCountrySupported } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { type CreateEntitySchema, createEntitySchema } from "@/ui/generated/schemas";
import { resolveCountryCodeFromName } from "@/ui/lib/country-names";
import { NumericInput } from "@/ui/lib/numeric-input";
import {
  applyPortugalEntityIssues,
  getPortugalRequiredFieldsFromError,
  isPortugalCountryCode,
  PT_COUNTRY_CODE,
  portugalShareCapitalSchema,
  toSubmittableShareCapital,
} from "@/ui/lib/pt-entity-input";
import { createTranslation } from "@/ui/lib/translation";

import ButtonLoader from "../button-loader";
import { useCreateEntity } from "./entities.hooks";

export type CreateEntityFormProps = {
  t?: (key: string) => string;
  namespace?: string;
  accountId?: string;
  environment?: string;
  defaultName?: string;
  countryCode?: string;
  locale?: string;
  translationLocale?: string;
  defaultValues?: Partial<CreateEntitySchema>;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
};

const translations = {
  en: {
    name: "Name",
    "search-hint": "Search companies by name",
    "no-results": "No companies found",
    country: "Country",
    address: "Address",
    "address-2": "Address 2",
    "post-code": "Post Code",
    city: "City",
    state: "State",
    "tax-number": "Tax Number",
    "is-tax-subject": "Tax subject",
    "company-number": "Company Number",
    phone: "Phone",
    email: "Email",
    "starting-capital": "Share Capital",
    "portugal-required": "Portugal requires a few more company details. Please complete the fields below.",
    submit: "Create entity",
  },
} as const;

const REQUIRED_CREATE_ENTITY_FIELDS = new Set<keyof CreateEntitySchema>(["name", "country"]);
const createEntityCompanyNumberSchema = createEntitySchema.pick({ company_number: true });
const ENTITY_NAME_MAX_LENGTH = 255;
const registryValueCollator = new Intl.Collator("und", {
  usage: "search",
  sensitivity: "base",
});

function normalizeRegistryValue(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function isSafeCompanyNumberFromRegistry(company: CompanyRegistryResult): boolean {
  const registrationNumber = company.registration_number?.trim();
  if (!registrationNumber) return false;
  if (!createEntityCompanyNumberSchema.safeParse({ company_number: registrationNumber }).success) return false;

  return (
    registryValueCollator.compare(normalizeRegistryValue(registrationNumber), normalizeRegistryValue(company.name)) !==
    0
  );
}

function normalizeCreateEntityValues(values: unknown): unknown {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return values;
  }

  const normalized = { ...(values as Record<string, unknown>) };

  for (const [field, value] of Object.entries(normalized)) {
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (!trimmed && !REQUIRED_CREATE_ENTITY_FIELDS.has(field as keyof CreateEntitySchema)) {
      delete normalized[field];
      continue;
    }

    normalized[field] = trimmed;
  }

  return normalized;
}

const createEntityFormSchema = z.preprocess(
  normalizeCreateEntityValues,
  createEntitySchema
    .extend({
      name: z
        .string()
        .min(1)
        .refine((value) => Array.from(value).length <= ENTITY_NAME_MAX_LENGTH, {
          message: `Too big: expected string to have <=${ENTITY_NAME_MAX_LENGTH} characters`,
        }),
      country: z.string().min(1),
      starting_capital: portugalShareCapitalSchema,
    })
    // Portugal entities carry extra mandatory data; enforce it here so the user gets
    // localized field-level errors instead of the API's 422. No-ops for other countries.
    .superRefine(applyPortugalEntityIssues),
);

export function CreateEntityForm({
  t,
  namespace = "",
  accountId,
  environment,
  defaultName,
  countryCode,
  locale = "en",
  translationLocale,
  defaultValues: extraDefaults,
  onSuccess,
  onError,
}: CreateEntityFormProps) {
  const translate = createTranslation({ t, namespace, locale, translationLocale, translations });

  const countryName = countryCode ? new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) : undefined;

  // Track whether the country code is still valid (cleared when user edits country name)
  const [activeCountryCode, setActiveCountryCode] = useState<string | undefined>(countryCode);
  // Set when the API rejected the create as Portuguese for a country name we could not resolve.
  const [portugalRequiredByServer, setPortugalRequiredByServer] = useState(false);
  // The country as it read when the in-flight create was submitted, to detect a stale response.
  const submittedCountryRef = useRef<string | undefined>(undefined);
  const portugalCountryName = new Intl.DisplayNames([locale], { type: "region" }).of(PT_COUNTRY_CODE) ?? "Portugal";
  const autoFilledCountryRef = useRef(countryName);

  // Company registry autocomplete state
  // showAutocomplete is based on the initial countryCode prop to avoid component switch mid-typing
  const [nameSearch, setNameSearch] = useState("");
  const { isSupported: isRegistrySupported } = useIsCountrySupported(countryCode || "");
  const { data: searchData, isLoading: isSearching } = useCompanyRegistrySearch(activeCountryCode || "", nameSearch);
  const companies = searchData?.data || [];

  const showAutocomplete = !!countryCode && isRegistrySupported;

  const nameOptions = companies.map((company) => {
    const addressParts = [company.address, company.city].filter(Boolean);
    const address = addressParts.join(", ");
    return {
      value: company.id,
      label: (
        <div className="flex flex-col overflow-hidden py-1">
          <span className="truncate font-medium">{company.name}</span>
          {address && <span className="truncate text-muted-foreground text-xs">{address}</span>}
          {company.tax_number && <span className="truncate text-muted-foreground text-xs">{company.tax_number}</span>}
        </div>
      ),
      company,
    };
  });

  const form = useForm<CreateEntitySchema>({
    resolver: zodResolver(createEntityFormSchema as any) as unknown as Resolver<CreateEntitySchema>,
    defaultValues: {
      name: defaultName || "",
      address: "",
      address_2: "",
      post_code: "",
      city: "",
      state: "",
      country: countryName || "",
      country_code: countryCode || "",
      tax_number: "",
      company_number: "",
      phone: "",
      email: "",
      is_tax_subject: true,
      environment: environment as "live" | "sandbox" | undefined,
      ...extraDefaults,
      // defaultName takes priority over extraDefaults.name if provided
      ...(defaultName ? { name: defaultName } : {}),
    },
  });

  // Watch country field — clear activeCountryCode when user edits away from auto-filled value
  const countryValue = form.watch("country");
  useEffect(() => {
    const nextCountryCode =
      countryValue === autoFilledCountryRef.current
        ? countryCode
        : resolveCountryCodeFromName(countryValue, locale) || undefined;

    setActiveCountryCode(nextCountryCode);
    form.setValue("country_code", nextCountryCode || "");

    // The prompt explains why the Portugal inputs are showing, so it belongs on screen
    // for exactly as long as the form is in Portugal mode — including the correction
    // the recovery below makes to the country field itself.
    if (!isPortugalCountryCode(nextCountryCode)) {
      setPortugalRequiredByServer(false);
    }
  }, [countryValue, countryCode, form, locale]);

  const handleCompanySelect = (company: CompanyRegistryResult) => {
    form.setValue("name", company.name);
    if (company.address) form.setValue("address", company.address);
    if (company.post_code) form.setValue("post_code", company.post_code);
    if (company.city) form.setValue("city", company.city);
    if (company.tax_number) form.setValue("tax_number", company.tax_number);
    form.setValue("company_number", isSafeCompanyNumberFromRegistry(company) ? company.registration_number.trim() : "");
    setNameSearch("");
  };

  // Wrap onSuccess to reset form only after successful mutation
  const handleSuccess = (data: Entity) => {
    form.reset();
    onSuccess?.(data);
  };

  // Use the createEntity mutation hook
  const { mutate: createEntity, isPending } = useCreateEntity({
    entityId: null,
    accountId,
    onSuccess: handleSuccess,
    onError: (error, _variables, _context) => {
      // The server resolves country names we cannot, so it can decide the entity is
      // Portuguese when the form never did. Adopt its answer and reveal the Portugal
      // inputs rather than leaving the user stuck behind the same error on resubmit.
      //
      // Only while the country still reads as it did on submit: a slow response must not
      // drag the form back to Portugal after the user has moved on to another country.
      const isStaleResponse = form.getValues("country") !== submittedCountryRef.current;

      if (!isStaleResponse && getPortugalRequiredFieldsFromError(error).length > 0) {
        setPortugalRequiredByServer(true);
        setActiveCountryCode(PT_COUNTRY_CODE);
        form.setValue("country_code", PT_COUNTRY_CODE);
        // Replace the spelling we could not resolve with the canonical name. `country` is
        // stored verbatim and printed on invoices and emails as {entity_country}, so
        // leaving the original text would put an unresolvable country on legal documents.
        form.setValue("country", portugalCountryName);
      }

      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateEntitySchema) => {
    try {
      submittedCountryRef.current = values.country;
      const normalizedValues = normalizeCreateEntityValues(values) as CreateEntitySchema;
      const resolvedCountryCode =
        normalizedValues.country_code || resolveCountryCodeFromName(normalizedValues.country, locale);
      const { country_code: _countryCode, starting_capital, ...rest } = normalizedValues;
      const payload: Record<string, unknown> = resolvedCountryCode
        ? { ...rest, country_code: resolvedCountryCode }
        : rest;

      // Share capital is a Portugal-only input here. Resolving it at submit rather than
      // clearing it on country change keeps a mid-edit country keystroke from wiping a
      // value the user already typed, and keeps an unparseable entry off the request.
      if (isPortugalCountryCode(resolvedCountryCode)) {
        payload.starting_capital = toSubmittableShareCapital(starting_capital);
      }

      createEntity(payload as CreateEntityBody);
    } catch (e) {
      onError?.(e);
      form.setError("root", {
        type: "submit",
        message: "Failed to create entity",
      });
    }
  };

  const nameValue = form.watch("name");
  // Portugal requires contact details and share capital on every entity — see
  // the Portugal overlay in the API. Other countries keep the lean form.
  const requiresPortugalFields = isPortugalCountryCode(activeCountryCode);

  return (
    <Form {...form} locale={translationLocale || locale}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        {portugalRequiredByServer && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-amber-700 text-sm dark:text-amber-400">
            {translate("portugal-required")}
          </p>
        )}

        {showAutocomplete ? (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {translate("name")}
                  <span className="ml-1 text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Autocomplete
                    searchValue={nameSearch}
                    onSearch={(v) => {
                      setNameSearch(v);
                      field.onChange(v || undefined);
                    }}
                    displayValue={nameValue || ""}
                    options={nameOptions}
                    onValueChange={(selectedId) => {
                      const option = nameOptions.find((o) => o.value === selectedId);
                      if (option?.company) {
                        handleCompanySelect(option.company);
                      }
                    }}
                    onBlur={() => {
                      setNameSearch("");
                    }}
                    placeholder={translate("name")}
                    loading={isSearching}
                    emptyText={nameSearch.length < 2 ? translate("search-hint") : translate("no-results")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormInput
            control={form.control}
            name="name"
            label={translate("name")}
            placeholder={translate("name")}
            required
          />
        )}

        <FormInput
          control={form.control}
          name="country"
          label={translate("country")}
          placeholder={translate("country")}
          required
        />

        <FormInput
          control={form.control}
          name="address"
          label={translate("address")}
          placeholder={translate("address")}
          required={requiresPortugalFields}
        />

        <FormInput
          control={form.control}
          name="address_2"
          label={translate("address-2")}
          placeholder={translate("address-2")}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            control={form.control}
            name="post_code"
            label={translate("post-code")}
            placeholder={requiresPortugalFields ? "1000-001" : translate("post-code")}
            required={requiresPortugalFields}
          />
          <FormInput
            control={form.control}
            name="city"
            label={translate("city")}
            placeholder={translate("city")}
            required={requiresPortugalFields}
          />
        </div>

        <FormInput
          control={form.control}
          name="state"
          label={translate("state")}
          placeholder={translate("state")}
          required={requiresPortugalFields}
        />

        {requiresPortugalFields && (
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              control={form.control}
              name="phone"
              label={translate("phone")}
              placeholder="+351912345678"
              type="tel"
              required
            />
            <FormInput
              control={form.control}
              name="email"
              label={translate("email")}
              placeholder={translate("email")}
              type="email"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <FormInput
            control={form.control}
            name="tax_number"
            label={translate("tax-number")}
            placeholder={translate("tax-number")}
            disableAutofill
            required={requiresPortugalFields}
          />
          <FormField
            control={form.control}
            name="is_tax_subject"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">{translate("is-tax-subject")}</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormInput
          control={form.control}
          name="company_number"
          label={translate("company-number")}
          placeholder={translate("company-number")}
          disableAutofill
          required={requiresPortugalFields}
        />

        {requiresPortugalFields && (
          <FormField
            control={form.control}
            name="starting_capital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {translate("starting-capital")}
                  <span className="ml-1 text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <NumericInput
                    {...field}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    inputLocale={locale}
                    placeholder={translate("starting-capital")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={isPending}
          aria-busy={isPending}
          data-testid="entity-create-submit"
        >
          {isPending ? <ButtonLoader /> : translate("submit")}
        </Button>
      </form>
    </Form>
  );
}
