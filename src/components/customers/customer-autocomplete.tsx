import type { CompanyRegistryResult, Customer } from "@spaceinvoices/js-sdk";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Autocomplete, type AutocompleteOption } from "@/ui/common/autocomplete";
import { useCompanyRegistrySearch, useIsCountrySupported } from "@/ui/components/company-registry";
import { useDebounce } from "@/ui/hooks/use-debounce";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { autocompleteTranslations } from "../common/autocomplete-locales";
import { useCustomerSearch, useRecentCustomers } from "./customers.hooks";

const MAX_TEXT_LENGTH = 100;

const truncateText = (text: string, maxLength: number = MAX_TEXT_LENGTH): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

function mapCompanyRegistryResultToCustomer(company: CompanyRegistryResult, countryCode: string) {
  return {
    name: company.name,
    address: company.address,
    address_2: null,
    post_code: company.post_code,
    city: company.city,
    state: null,
    country: null,
    country_code: countryCode || company.country_code,
    tax_number: company.tax_number,
    company_number: company.registration_number,
  };
}

function normalizeMatchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isCompanyAlreadyShownAsCustomer(company: CompanyRegistryResult, customers: Customer[]) {
  const companyTaxNumber = normalizeMatchValue(company.tax_number);
  const companyRegistrationNumber = normalizeMatchValue(company.registration_number);
  const companyName = normalizeMatchValue(company.name);
  const companyAddress = normalizeMatchValue(company.address);
  const companyCity = normalizeMatchValue(company.city);

  return customers.some((customer) => {
    const customerTaxNumber = normalizeMatchValue(customer.tax_number);
    const customerCompanyNumber = normalizeMatchValue(customer.company_number);

    if (companyTaxNumber && customerTaxNumber && companyTaxNumber === customerTaxNumber) {
      return true;
    }

    if (companyRegistrationNumber && customerCompanyNumber && companyRegistrationNumber === customerCompanyNumber) {
      return true;
    }

    return (
      companyName &&
      companyName === normalizeMatchValue(customer.name) &&
      companyAddress === normalizeMatchValue(customer.address) &&
      companyCity === normalizeMatchValue(customer.city)
    );
  });
}

type CustomerAutocompleteProps = {
  entityId: string;
  value?: string | null;
  committedDisplayName?: string;
  onValueChange?: (value: string, customer: Customer) => void;
  onCommitInlineName?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void; // Added onBlur prop
  /** Initial display name when pre-populating with a customer (e.g., for duplication) */
  initialDisplayName?: string;
  inputTestId?: string;
  inputDataDemo?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  commitOnBlurMode?: "none" | "create" | "update-inline";
  ariaInvalid?: boolean;
  companyRegistryCountryCode?: string | null;
} & ComponentTranslationProps;

export function CustomerAutocomplete({
  entityId,
  value,
  committedDisplayName,
  onValueChange,
  onCommitInlineName,
  placeholder = "Name",
  className,
  disabled,
  onBlur: onBlurPropFromParent, // Destructure the onBlur prop from parent
  initialDisplayName,
  inputTestId,
  inputDataDemo,
  inputRef,
  commitOnBlurMode = "none",
  ariaInvalid = false,
  companyRegistryCountryCode,
  locale = "en",
  translationLocale,
  t: translationFn,
  namespace,
}: CustomerAutocompleteProps) {
  const t = createTranslation({
    t: translationFn,
    namespace,
    locale,
    translationLocale,
    translations: autocompleteTranslations,
  });
  const [search, setSearch] = useState(initialDisplayName || "");
  const [displayValue, setDisplayValue] = useState(initialDisplayName || "");
  const preserveSearchOnClearRef = useRef(false);
  const debouncedSearch = useDebounce(search, 300);

  const handleSearch = (value: string) => {
    setSearch(value);
    // Clear displayValue when user starts typing to allow free editing
    if (displayValue && value !== displayValue) {
      setDisplayValue("");
    }
  };

  // Fetch recent customers (non-blocking, cached)
  const { data: recentData } = useRecentCustomers(entityId);
  const recentCustomers = recentData?.data || [];

  // Fetch search results
  const { data: searchData, isLoading } = useCustomerSearch(entityId, debouncedSearch);
  const searchResults = searchData?.data || [];
  const normalizedRegistryCountryCode = companyRegistryCountryCode?.trim().toUpperCase() ?? "";
  const { isSupported: isCompanyRegistrySupported } = useIsCountrySupported(normalizedRegistryCountryCode, {
    enabled: !!normalizedRegistryCountryCode,
  });
  const shouldSearchCompanyRegistry =
    isCompanyRegistrySupported && !!normalizedRegistryCountryCode && debouncedSearch.trim().length >= 2;
  const { data: companyRegistryData, isLoading: isCompanyRegistryLoading } = useCompanyRegistrySearch(
    normalizedRegistryCountryCode,
    shouldSearchCompanyRegistry ? debouncedSearch : "",
  );
  const rawCompanyRegistryResults = isCompanyRegistrySupported ? (companyRegistryData?.data ?? []) : [];

  // Use search results if searching, otherwise show recent customers
  const customers = useMemo(() => {
    if (debouncedSearch) {
      return searchResults;
    }
    return recentCustomers;
  }, [debouncedSearch, searchResults, recentCustomers]);

  const companyRegistryResults = useMemo(() => {
    return rawCompanyRegistryResults.filter((company) => !isCompanyAlreadyShownAsCustomer(company, customers));
  }, [rawCompanyRegistryResults, customers]);

  const customerOptions: AutocompleteOption[] = customers.map((customer) => {
    const customerIndex = customers.findIndex((entry) => entry.id === customer.id);
    const truncatedName = truncateText(customer.name);
    const address = [customer.address, customer.city, customer.country].filter(Boolean).join(", ");
    const truncatedAddress = truncateText(address);

    return {
      value: customer.id,
      ...(customerIndex === 0
        ? {
            testId: "marketing-demo-customer-option-0",
            dataDemo: "marketing-demo-customer-option-0",
          }
        : {}),
      label: (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate">{truncatedName}</span>
          {truncatedAddress && <span className="truncate text-muted-foreground text-xs">{truncatedAddress}</span>}
        </div>
      ),
    };
  });

  const companyRegistryOptions: AutocompleteOption[] = companyRegistryResults.map((company) => {
    const truncatedName = truncateText(company.name);
    const address = [company.address, company.city].filter(Boolean).join(", ");
    const truncatedAddress = truncateText(address);
    const meta = [company.tax_number ? `${t("Tax")}: ${company.tax_number}` : null, company.registration_number]
      .filter(Boolean)
      .join(" · ");

    return {
      value: `__company_registry__:${company.id}`,
      group: t("Companies directory"),
      label: (
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <span className="truncate font-medium">{truncatedName}</span>
            {truncatedAddress && <span className="truncate text-muted-foreground text-xs">{truncatedAddress}</span>}
            {meta && <span className="truncate text-muted-foreground text-xs">{meta}</span>}
          </div>
        </div>
      ),
    };
  });

  // Keep company-directory matches visually separate and above manual creation so lookup is discoverable.
  const createNewLabel = debouncedSearch?.trim() ? `${t("Create")} "${debouncedSearch}"` : t("Create new");
  const resolvedPlaceholder = placeholder ? t(placeholder) : placeholder;
  const createNewOption: AutocompleteOption = {
    value: `__create__:${debouncedSearch || ""}`,
    label: (
      <span className="flex items-center gap-2">
        <Plus className="size-4" />
        {createNewLabel}
      </span>
    ) as any,
  };

  const options = [...customerOptions, ...companyRegistryOptions, createNewOption];

  const handleValueChange = (selectedValue: string) => {
    // Handle "create new" selection
    if (selectedValue.startsWith("__create__:")) {
      const customerName = selectedValue.replace("__create__:", "");
      const truncatedName = truncateText(customerName);

      if (onValueChange) {
        // Pass pseudo-customer with just name, empty id to indicate new customer
        onValueChange("", {
          name: customerName || "",
          address: null,
          address_2: null,
          post_code: null,
          city: null,
          state: null,
          country: null,
          tax_number: null,
        } as Customer);
      }

      // Set search to the customer name so it shows in the input
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
      return;
    }

    if (selectedValue.startsWith("__company_registry__:")) {
      const companyId = selectedValue.replace("__company_registry__:", "");
      const selectedCompany = companyRegistryResults.find((company) => company.id === companyId);
      if (!selectedCompany) return;

      const registryCustomer = mapCompanyRegistryResultToCustomer(selectedCompany, normalizedRegistryCountryCode);

      if (onValueChange) {
        onValueChange("", registryCustomer as Customer);
      }

      const truncatedName = truncateText(registryCustomer.name || "");
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
      return;
    }

    // Find customer in both recent and search results
    const selectedCustomer =
      customers.find((c) => c.id === selectedValue) ||
      recentCustomers.find((c) => c.id === selectedValue) ||
      searchResults.find((c) => c.id === selectedValue);

    if (selectedCustomer) {
      if (onValueChange) {
        onValueChange(selectedValue, selectedCustomer);
      }
      // Set search to the customer name (truncated) so it shows in the input
      const truncatedName = truncateText(selectedCustomer.name);
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
    }
  };

  const commitCustomerName = (customerName: string) => {
    const trimmedName = customerName.trim();
    if (!trimmedName) return;

    if (commitOnBlurMode === "update-inline") {
      onCommitInlineName?.(trimmedName);
      const truncatedName = truncateText(trimmedName);
      setSearch(truncatedName);
      setDisplayValue(truncatedName);
      return;
    }

    if (onValueChange) {
      onValueChange("", {
        name: trimmedName,
        address: null,
        address_2: null,
        post_code: null,
        city: null,
        state: null,
        country: null,
        tax_number: null,
      } as Customer);
    }

    const truncatedName = truncateText(trimmedName);
    setSearch(truncatedName);
    setDisplayValue(truncatedName);
  };

  const handleBlur = () => {
    onBlurPropFromParent?.();
  };

  // Sync visible input when committed customer state changes externally
  useEffect(() => {
    if (value) {
      const nextDisplayValue = committedDisplayName || initialDisplayName || "";
      if (nextDisplayValue) {
        setSearch(nextDisplayValue);
        setDisplayValue(nextDisplayValue);
      }
      return;
    }

    if (!committedDisplayName) {
      if (!preserveSearchOnClearRef.current) {
        setSearch("");
      }
      preserveSearchOnClearRef.current = false;
      setDisplayValue("");
    }
  }, [committedDisplayName, initialDisplayName, value]);

  return (
    <Autocomplete
      searchValue={search}
      onSearch={handleSearch}
      value={value ?? undefined}
      onValueChange={handleValueChange}
      onCommitUnselectedInput={commitCustomerName}
      commitUnselectedOnBlur={commitOnBlurMode !== "none"}
      onBlur={handleBlur} // Pass the new handleBlur to Autocomplete
      options={options}
      placeholder={resolvedPlaceholder}
      className={className}
      disabled={disabled}
      loading={isLoading || isCompanyRegistryLoading}
      emptyText={debouncedSearch ? t("No customers found") : t("Recent customers")}
      displayValue={displayValue}
      inputTestId={inputTestId}
      inputDataDemo={inputDataDemo}
      committedDisplayValue={committedDisplayName}
      inputRef={inputRef}
      ariaInvalid={ariaInvalid}
    />
  );
}
