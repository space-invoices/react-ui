import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyRegistryResult, CreateEntityBody, Entity } from "@spaceinvoices/js-sdk";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Autocomplete } from "@/ui/common/autocomplete";
import { useCompanyRegistrySearch, useIsCountrySupported } from "@/ui/components/company-registry";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { type CreateEntitySchema, createEntitySchema } from "@/ui/generated/schemas";
import { ISO_COUNTRY_CODES, resolveCountryCodeFromName } from "@/ui/lib/country-names";
import {
  isCompanyLegalForm,
  LEGAL_FORMS,
  type LegalDetails,
  type LegalForm,
  requiresShareCapital,
} from "@/ui/lib/legal-details";
import { NumericInput } from "@/ui/lib/numeric-input";
import {
  applyPortugalEntityIssues,
  formatPortugalPhoneEntry,
  formatPortugalPostCodeEntry,
  getPortugalRequiredFieldsFromError,
  getRequiredPortugalEntityFields,
  isPortugalCountryCode,
  normalizePortugalEntityInput,
  normalizePortugalTaxNumberInput,
  PT_COUNTRY_CODE,
  portugalShareCapitalSchema,
  toSubmittableShareCapital,
} from "@/ui/lib/pt-entity-input";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";

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
  structuredCountrySelection?: boolean;
  progressiveDisclosure?: boolean;
  /**
   * Creates the entity instead of the ordinary create call, for flows whose owner decides where an
   * organization must be created (for example an onboarding endpoint that records its provenance in
   * the same transaction). Receives the same validated body and returns the created entity, so form
   * validation, pending state, error recovery and the success reset are unchanged. Left out, the
   * form creates entities the ordinary way; the form itself holds no flow-specific policy.
   */
  createEntityRequest?: (data: CreateEntityBody) => Promise<Entity>;
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
    "is-tax-subject": "Charges tax on invoices",
    "is-tax-subject-help": "Turn this on if this entity is registered to charge tax.",
    "add-details": "Add address, tax, and contact details",
    "company-number": "Company Number",
    phone: "Phone",
    email: "Email",
    "starting-capital": "Share Capital",
    "registration-office": "Registry Office",
    "Enter 912 345 678 for Portugal, or include + and the country code for another country.":
      "Enter 912 345 678 for Portugal, or include + and the country code for another country.",
    "Enter 7 digits; the hyphen is added automatically.": "Enter 7 digits; the hyphen is added automatically.",
    "9 digits. You can paste it with spaces or a PT prefix.": "9 digits. You can paste it with spaces or a PT prefix.",
    "Digits and slashes only, as shown on your registration.":
      "Digits and slashes only, as shown on your registration.",
    "legal-form": "Legal Form",
    "legal-form-placeholder": "Select your legal form",
    "legal-form-hint": "Decides which registration and capital details Portugal asks you for",
    "legal-form-sole_trader": "Individual professional or sole trader",
    "legal-form-limited_liability_company": "Private limited company (Lda.)",
    "legal-form-public_limited_company": "Public limited company (S.A.)",
    "legal-form-partnership_limited_by_shares": "Partnership limited by shares",
    "legal-form-other_company": "Other company",
    "portugal-required": "Portugal requires a few more company details. Please complete the fields below.",
    submit: "Create entity",
  },
} as const;

/**
 * Form values add the Portugal legal-form inputs the create request carries inside
 * `settings.legal_details`, and hold share capital as the raw string `NumericInput`
 * emits until submit resolves it.
 */
type CreateEntityFormValues = Omit<CreateEntitySchema, "starting_capital"> & {
  starting_capital?: number | string | null;
  legal_form?: LegalForm | null;
  registration_office?: string | null;
};

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
      // Local-only fields, assembled into settings.legal_details on submit.
      legal_form: z.enum(LEGAL_FORMS).nullable().optional(),
      registration_office: z.union([z.string(), z.null()]).optional(),
    })
    // The Portuguese fields are accepted in the spellings a business has them printed
    // in, and stored in the one spelling the API keeps. Normalizing here rather than
    // in the inputs means a submit straight from the keyboard sends the same value a
    // blur would have shown. No-ops for other countries.
    .transform((values) => ({ ...values, ...normalizePortugalEntityInput(values) }))
    // A Portugal entity carries extra mandatory data, and which data depends on the
    // legal form the user picks. Enforce it here so they get localized field-level
    // errors instead of the API's 422. No-ops for other countries.
    .superRefine((values, ctx) => applyPortugalEntityIssues(values, ctx, { requireLegalForm: true })),
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
  structuredCountrySelection = false,
  progressiveDisclosure = false,
  createEntityRequest,
  onSuccess,
  onError,
}: CreateEntityFormProps) {
  const translate = createTranslation({ t, namespace, locale, translationLocale, translations });

  const countryDisplayNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const countryName = countryCode ? countryDisplayNames.of(countryCode) : undefined;
  const structuredInitialCountryCode = structuredCountrySelection
    ? countryCode || resolveCountryCodeFromName(extraDefaults?.country, locale)
    : countryCode;
  const structuredInitialCountryName = structuredInitialCountryCode
    ? countryDisplayNames.of(structuredInitialCountryCode)
    : undefined;
  const countryOptions = useMemo(() => {
    if (!structuredCountrySelection) return [];

    const collator = new Intl.Collator(locale, { usage: "sort", sensitivity: "base" });
    return ISO_COUNTRY_CODES.map((code) => ({
      code,
      name: countryDisplayNames.of(code) || code,
    })).sort((left, right) => collator.compare(left.name, right.name));
  }, [countryDisplayNames, locale, structuredCountrySelection]);
  const countrySelectItems = useMemo(
    () => countryOptions.map((country) => ({ value: country.code, label: country.name })),
    [countryOptions],
  );

  // Track whether the country code is still valid (cleared when user edits country name)
  const [activeCountryCode, setActiveCountryCode] = useState<string | undefined>(structuredInitialCountryCode);
  // Set when the API rejected the create as Portuguese for a country name we could not resolve.
  const [portugalRequiredByServer, setPortugalRequiredByServer] = useState(false);
  // The country as it read when the in-flight create was submitted, to detect a stale response.
  const submittedCountryRef = useRef<string | undefined>(undefined);
  const registryVatProfileRef = useRef<string | undefined>(undefined);
  const portugalCountryName = countryDisplayNames.of(PT_COUNTRY_CODE) ?? "Portugal";
  const autoFilledCountryRef = useRef(structuredInitialCountryName || countryName);
  const optionalFieldsId = useId();
  const hasOptionalDefaults = [
    extraDefaults?.address,
    extraDefaults?.address_2,
    extraDefaults?.post_code,
    extraDefaults?.city,
    extraDefaults?.state,
    extraDefaults?.tax_number,
    extraDefaults?.company_number,
    extraDefaults?.phone,
    extraDefaults?.email,
    extraDefaults?.starting_capital,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const [showOptionalFields, setShowOptionalFields] = useState(!progressiveDisclosure || hasOptionalDefaults);

  // Company registry autocomplete state
  // showAutocomplete is based on the initial countryCode prop to avoid component switch mid-typing
  const [nameSearch, setNameSearch] = useState("");
  const { isSupported: isRegistrySupported } = useIsCountrySupported(structuredInitialCountryCode || "");
  const { data: searchData, isLoading: isSearching } = useCompanyRegistrySearch(activeCountryCode || "", nameSearch);
  const companies = searchData?.data || [];

  const showAutocomplete = !!structuredInitialCountryCode && isRegistrySupported;

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

  const form = useForm<CreateEntityFormValues>({
    resolver: zodResolver(createEntityFormSchema as any) as unknown as Resolver<CreateEntityFormValues>,
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
      // No default legal form: it is a legal fact about the business, so the user
      // states it rather than the form guessing it.
      legal_form: null,
      registration_office: "",
      is_tax_subject: true,
      environment: environment as "live" | "sandbox" | undefined,
      ...extraDefaults,
      ...(structuredCountrySelection && structuredInitialCountryCode
        ? {
            country: structuredInitialCountryName || structuredInitialCountryCode,
            country_code: structuredInitialCountryCode,
          }
        : {}),
      // defaultName takes priority over extraDefaults.name if provided
      ...(defaultName ? { name: defaultName } : {}),
    },
  });

  // Watch country field — clear activeCountryCode when user edits away from auto-filled value
  const countryValue = form.watch("country");
  useEffect(() => {
    const nextCountryCode =
      countryValue === autoFilledCountryRef.current
        ? structuredInitialCountryCode
        : resolveCountryCodeFromName(countryValue, locale) || undefined;

    setActiveCountryCode(nextCountryCode);
    form.setValue("country_code", nextCountryCode || "");

    // The prompt explains why the Portugal inputs are showing, so it belongs on screen
    // for exactly as long as the form is in Portugal mode — including the correction
    // the recovery below makes to the country field itself.
    if (!isPortugalCountryCode(nextCountryCode)) {
      setPortugalRequiredByServer(false);
    }
  }, [countryValue, form, locale, structuredInitialCountryCode]);

  const handleCompanySelect = (company: CompanyRegistryResult) => {
    form.setValue("name", company.name);
    if (company.address) form.setValue("address", company.address);
    if (company.post_code) form.setValue("post_code", company.post_code);
    if (company.city) form.setValue("city", company.city);
    if (company.tax_number) form.setValue("tax_number", company.tax_number);
    if (typeof company.is_tax_subject === "boolean") form.setValue("is_tax_subject", company.is_tax_subject);
    const profile = company.settings?.slovenia?.vat_profile;
    if (profile) {
      registryVatProfileRef.current = profile;
      const settings = form.getValues("settings");
      form.setValue("settings", {
        ...settings,
        slovenia: { ...settings?.slovenia, vat_profile: profile },
      });
    } else if (registryVatProfileRef.current) {
      if (form.getValues("settings.slovenia.vat_profile") === registryVatProfileRef.current) {
        form.setValue("settings.slovenia.vat_profile", undefined);
      }
      registryVatProfileRef.current = undefined;
    }

    form.setValue("company_number", isSafeCompanyNumberFromRegistry(company) ? company.registration_number.trim() : "");
    // Registry selection populates legal details that must be visible for review
    // before submission, even when the form starts in progressive mode.
    setShowOptionalFields(true);
    setNameSearch("");
  };

  // Wrap onSuccess to reset form only after successful mutation
  const handleSuccess = (data: Entity) => {
    registryVatProfileRef.current = undefined;
    form.reset();
    onSuccess?.(data);
  };

  // Use the createEntity mutation hook
  const { mutate: createEntity, isPending } = useCreateEntity({
    entityId: null,
    accountId,
    create: createEntityRequest,
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

  const onSubmit = async (values: CreateEntityFormValues) => {
    try {
      submittedCountryRef.current = values.country;
      const normalizedValues = normalizeCreateEntityValues(values) as CreateEntityFormValues;
      const resolvedCountryCode =
        normalizedValues.country_code || resolveCountryCodeFromName(normalizedValues.country, locale);
      const {
        country_code: _countryCode,
        starting_capital,
        legal_form,
        registration_office,
        ...rest
      } = normalizedValues;
      const payload: Record<string, unknown> = resolvedCountryCode
        ? { ...rest, country_code: resolvedCountryCode }
        : rest;

      // Share capital and the legal form are Portugal-only inputs here. Resolving them
      // at submit rather than clearing them on country change keeps a mid-edit country
      // keystroke from wiping a value the user already typed, and keeps an unparseable
      // entry off the request.
      if (isPortugalCountryCode(resolvedCountryCode)) {
        payload.starting_capital = requiresShareCapital(legal_form)
          ? toSubmittableShareCapital(starting_capital)
          : undefined;

        if (legal_form) {
          const legalDetails: LegalDetails = {
            legal_form,
            registration_office: isCompanyLegalForm(legal_form) ? registration_office?.trim() || null : null,
          };
          payload.settings = { ...(rest.settings ?? {}), legal_details: legalDetails };
        }
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
  const legalFormValue = form.watch("legal_form");
  // Portugal asks for the legal form first, then only the registration and capital
  // details that form actually has. Which fields those are is the Portugal rule set's
  // answer, not this form's, so ask it rather than restating it. Other countries keep
  // the lean form.
  const requiresPortugalFields = isPortugalCountryCode(activeCountryCode);
  const requiredPortugalFields = useMemo(
    () => new Set(requiresPortugalFields ? getRequiredPortugalEntityFields(legalFormValue) : []),
    [requiresPortugalFields, legalFormValue],
  );
  const requiresPortugalCompanyFields = requiredPortugalFields.has("company_number");
  const requiresPortugalShareCapital = requiredPortugalFields.has("starting_capital");
  // A registry pick can fill the company number before a legal form is chosen; never
  // leave a value the user can see the effect of but not the field for.
  const showPortugalCompanyNumber = requiresPortugalCompanyFields || !!form.watch("company_number")?.trim();
  const showCompanyNumber = !requiresPortugalFields || showPortugalCompanyNumber;
  // Portugal's own fields are never optional detail, so the progressive form opens on them.
  const showEntityDetails = requiresPortugalFields || showOptionalFields;

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

        {structuredCountrySelection ? (
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {translate("country")}
                  <span className="ml-1 text-red-500">*</span>
                </FormLabel>
                <Select<string>
                  items={countrySelectItems}
                  value={activeCountryCode || ""}
                  onValueChange={(nextCountryCode) => {
                    if (!nextCountryCode) return;
                    const nextCountryName = countryDisplayNames.of(nextCountryCode) || nextCountryCode;
                    field.onChange(nextCountryName);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full" aria-required="true">
                      <span className={activeCountryCode ? "truncate" : "truncate text-muted-foreground"}>
                        {countryOptions.find((country) => country.code === activeCountryCode)?.name ||
                          translate("country")}
                      </span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormInput
            control={form.control}
            name="country"
            label={translate("country")}
            placeholder={translate("country")}
            required
          />
        )}

        {!showEntityDetails && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            aria-expanded="false"
            aria-controls={optionalFieldsId}
            onClick={() => setShowOptionalFields(true)}
          >
            {translate("add-details")}
          </Button>
        )}

        <FormField
          control={form.control}
          name="is_tax_subject"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      // A manual correction invalidates the imported VAT subtype.
                      // Do not retain a hidden profile that overrides the checkbox in reporting.
                      if (
                        registryVatProfileRef.current &&
                        form.getValues("settings.slovenia.vat_profile") === registryVatProfileRef.current
                      ) {
                        form.setValue("settings.slovenia.vat_profile", undefined);
                      }
                      registryVatProfileRef.current = undefined;
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
                <FormLabel className="font-normal">{translate("is-tax-subject")}</FormLabel>
              </div>
              <FormDescription>{translate("is-tax-subject-help")}</FormDescription>
            </FormItem>
          )}
        />

        {showEntityDetails && (
          <div id={optionalFieldsId} className="space-y-4">
            <FormInput
              control={form.control}
              name="address"
              label={translate("address")}
              placeholder={translate("address")}
              required={requiredPortugalFields.has("address")}
            />

            <FormInput
              control={form.control}
              name="address_2"
              label={translate("address-2")}
              placeholder={translate("address-2")}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                control={form.control}
                name="post_code"
                label={translate("post-code")}
                placeholder={requiresPortugalFields ? "1000-001" : translate("post-code")}
                required={requiredPortugalFields.has("post_code")}
                autoComplete="postal-code"
                description={
                  requiresPortugalFields ? translate("Enter 7 digits; the hyphen is added automatically.") : undefined
                }
                inputMode={requiresPortugalFields ? "numeric" : undefined}
                formatter={requiresPortugalFields ? formatPortugalPostCodeEntry : undefined}
              />
              <FormInput
                control={form.control}
                name="city"
                label={translate("city")}
                placeholder={translate("city")}
                required={requiredPortugalFields.has("city")}
              />
            </div>

            <FormInput
              control={form.control}
              name="state"
              label={translate("state")}
              placeholder={translate("state")}
              required={requiredPortugalFields.has("state")}
            />

            {requiresPortugalFields && (
              <FormField
                control={form.control}
                name="legal_form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {translate("legal-form")}
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <Select<LegalForm> value={field.value ?? null} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-required="true">
                          <SelectValue placeholder={translate("legal-form-placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEGAL_FORMS.map((legalForm) => (
                          <SelectItem key={legalForm} value={legalForm}>
                            {translate(`legal-form-${legalForm}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">{translate("legal-form-hint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresPortugalFields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  control={form.control}
                  name="phone"
                  label={translate("phone")}
                  placeholder="912 345 678"
                  type="tel"
                  autoComplete="tel"
                  required={requiredPortugalFields.has("phone")}
                  description={translate(
                    "Enter 912 345 678 for Portugal, or include + and the country code for another country.",
                  )}
                  formatter={formatPortugalPhoneEntry}
                />
                <FormInput
                  control={form.control}
                  name="email"
                  label={translate("email")}
                  placeholder={translate("email")}
                  type="email"
                  required={requiredPortugalFields.has("email")}
                />
              </div>
            )}

            <div className={cn("grid grid-cols-1 gap-4", showCompanyNumber && "sm:grid-cols-2")}>
              <FormInput
                control={form.control}
                name="tax_number"
                label={translate("tax-number")}
                placeholder={requiresPortugalFields ? "501442600" : translate("tax-number")}
                disableAutofill
                required={requiredPortugalFields.has("tax_number")}
                description={
                  requiresPortugalFields
                    ? translate("9 digits. You can paste it with spaces or a PT prefix.")
                    : undefined
                }
                inputMode={requiresPortugalFields ? "numeric" : undefined}
                formatter={requiresPortugalFields ? normalizePortugalTaxNumberInput : undefined}
              />

              {showCompanyNumber && (
                <FormInput
                  control={form.control}
                  name="company_number"
                  label={translate("company-number")}
                  placeholder={requiresPortugalFields ? "501442600" : translate("company-number")}
                  disableAutofill
                  required={requiresPortugalCompanyFields}
                  description={
                    requiresPortugalFields
                      ? translate("Digits and slashes only, as shown on your registration.")
                      : undefined
                  }
                />
              )}
            </div>

            {requiresPortugalCompanyFields && (
              <FormInput
                control={form.control}
                name="registration_office"
                label={translate("registration-office")}
                placeholder="Lisboa"
                required
              />
            )}

            {requiresPortugalShareCapital && (
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
          </div>
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
