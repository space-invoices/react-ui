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

const defaultTranslate = (text: string) => text;

export function CreateEntityForm({
  t = defaultTranslate,
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
  const translate = (key: string) => t(namespace ? `${namespace}.${key}` : key);

  const countryName = countryCode ? new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) : undefined;

  // Track whether the country code is still valid (cleared when user edits country name)
  const [activeCountryCode, setActiveCountryCode] = useState<string | undefined>(countryCode);
  const autoFilledCountryRef = useRef(countryName);

  // Company registry autocomplete state
  const [nameSearch, setNameSearch] = useState("");
  const { isSupported: isRegistrySupported } = useIsCountrySupported(activeCountryCode || "");
  const { data: searchData, isLoading: isSearching } = useCompanyRegistrySearch(activeCountryCode || "", nameSearch);
  const companies = searchData?.data || [];

  const showAutocomplete = !!activeCountryCode && isRegistrySupported;

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
    if (countryValue !== autoFilledCountryRef.current) {
      setActiveCountryCode(undefined);
    } else {
      setActiveCountryCode(countryCode);
    }
  }, [countryValue, countryCode]);

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
      // Zod validation ensures required fields are present before this is called
      // The type cast is safe because React Hook Form's DeepPartial doesn't reflect runtime validation
      createEntity(values as CreateEntityRequest);
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

        <Button type="submit" className="w-full cursor-pointer" disabled={isPending} aria-busy={isPending}>
          {isPending ? <ButtonLoader /> : translate("submit")}
        </Button>
      </form>
    </Form>
  );
}
