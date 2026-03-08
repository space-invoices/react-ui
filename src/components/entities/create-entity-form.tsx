import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, CreateEntityRequest, Entity } from "@spaceinvoices/js-sdk";
import { useEffect, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Autocomplete } from "@/ui/common/autocomplete";
import { useCompanyRegistrySearch, useIsCountrySupported } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { type CreateEntitySchema, createEntitySchema } from "@/ui/generated/schemas";
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
    submit: "Create entity",
  },
} as const;

const ISO_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
  "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO",
  "CR", "CU", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ",
  "FM", "FR", "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY", "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IN", "IQ", "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR",
  "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH",
  "MK", "ML", "MM", "MN", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NP",
  "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB",
  "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TD", "TG", "TH",
  "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VN",
  "VU", "WS", "XK", "YE", "ZA", "ZM", "ZW",
] as const;

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  uk: "GB",
  "u.k.": "GB",
  usa: "US",
  "u.s.": "US",
  "u.s.a.": "US",
};

function normalizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveCountryCodeFromName(value: string | undefined, locale: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const alias = COUNTRY_CODE_ALIASES[normalizeCountryName(trimmed)];
  if (alias) return alias;

  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && ISO_COUNTRY_CODES.includes(upper as (typeof ISO_COUNTRY_CODES)[number])) {
    return upper;
  }

  const localesToTry = Array.from(new Set([locale, "en", "en-US"]));

  for (const candidateLocale of localesToTry) {
    const displayNames = new Intl.DisplayNames([candidateLocale], { type: "region" });
    for (const code of ISO_COUNTRY_CODES) {
      const label = displayNames.of(code);
      if (label && normalizeCountryName(label) === normalizeCountryName(trimmed)) {
        return code;
      }
    }
  }

  return undefined;
}

export function CreateEntityForm({
  t,
  namespace = "",
  accountId,
  environment,
  defaultName,
  countryCode,
  locale = "en",
  defaultValues: extraDefaults,
  onSuccess,
  onError,
}: CreateEntityFormProps) {
  const translate = createTranslation({ t, namespace, locale, translations });

  const countryName = countryCode ? new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) : undefined;

  // Track whether the country code is still valid (cleared when user edits country name)
  const [activeCountryCode, setActiveCountryCode] = useState<string | undefined>(countryCode);
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
    resolver: zodResolver(createEntitySchema) as Resolver<CreateEntitySchema>,
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
  }, [countryValue, countryCode, form, locale]);

  const handleCompanySelect = (company: CompanyRegistryResult) => {
    form.setValue("name", company.name);
    if (company.address) form.setValue("address", company.address);
    if (company.post_code) form.setValue("post_code", company.post_code);
    if (company.city) form.setValue("city", company.city);
    if (company.tax_number) form.setValue("tax_number", company.tax_number);
    if (company.registration_number) form.setValue("company_number", company.registration_number);
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
      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateEntitySchema) => {
    try {
      const resolvedCountryCode = values.country_code || resolveCountryCodeFromName(values.country, locale);
      const { country_code: _countryCode, ...rest } = values;
      const payload = resolvedCountryCode ? { ...rest, country_code: resolvedCountryCode } : rest;
      createEntity(payload as CreateEntityRequest);
    } catch (e) {
      onError?.(e);
      form.setError("root", {
        type: "submit",
        message: "Failed to create entity",
      });
    }
  };

  const nameValue = form.watch("name");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
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
            placeholder={translate("post-code")}
          />
          <FormInput control={form.control} name="city" label={translate("city")} placeholder={translate("city")} />
        </div>

        <FormInput control={form.control} name="state" label={translate("state")} placeholder={translate("state")} />

        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <FormInput
            control={form.control}
            name="tax_number"
            label={translate("tax-number")}
            placeholder={translate("tax-number")}
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
        />

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
