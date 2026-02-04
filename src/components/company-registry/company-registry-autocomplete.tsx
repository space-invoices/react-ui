import type { CompanyRegistryResult } from "@spaceinvoices/js-sdk";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { Autocomplete } from "@/ui/common/autocomplete";
import { useCompanyRegistrySearch, useIsCountrySupported } from "./company-registry.hooks";

const MAX_TEXT_LENGTH = 80;

const truncateText = (text: string, maxLength: number = MAX_TEXT_LENGTH): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

type CompanyRegistryAutocompleteProps = {
  /**
   * ISO 3166-1 alpha-2 country code (e.g., "SI", "AT")
   * Typically from the entity's country_code
   */
  countryCode: string;
  /**
   * Callback when a company is selected
   * Use this to auto-fill customer form fields
   */
  onSelect?: (company: CompanyRegistryResult) => void;
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the autocomplete is disabled
   */
  disabled?: boolean;
};

/**
 * Company Registry Autocomplete
 *
 * Searches public company registries (e.g., AJPES for Slovenia) and allows
 * users to select a company to auto-fill customer details.
 *
 * Features:
 * - Searches by company name or tax number
 * - Displays company address and legal form
 * - Shows bank accounts if available
 * - Only renders if country has registry data available
 *
 * Usage:
 * ```tsx
 * <CompanyRegistryAutocomplete
 *   countryCode={entity.country_code}
 *   onSelect={(company) => {
 *     form.setValue("name", company.name);
 *     form.setValue("address", company.address);
 *     form.setValue("tax_number", company.tax_number);
 *     // etc.
 *   }}
 * />
 * ```
 */
export function CompanyRegistryAutocomplete({
  countryCode,
  onSelect,
  placeholder = "Search company registry...",
  className,
  disabled,
}: CompanyRegistryAutocompleteProps) {
  const [search, setSearch] = useState("");

  const { isSupported, isLoading: isCheckingSupport } = useIsCountrySupported(countryCode);
  const { data: searchData, isLoading: isSearching } = useCompanyRegistrySearch(countryCode, search);

  const companies = searchData?.data || [];

  // Don't render if country doesn't have registry data
  if (isCheckingSupport) {
    return null;
  }

  if (!isSupported) {
    return null;
  }

  const options = companies.map((company) => {
    const truncatedName = truncateText(company.name);
    const addressParts = [company.address, company.city].filter(Boolean);
    const address = addressParts.join(", ");
    const truncatedAddress = truncateText(address);

    // Build subtitle with legal form and bank account indicator
    const subtitleParts: string[] = [];
    if (company.legal_form) {
      subtitleParts.push(company.legal_form);
    }
    if (company.tax_number) {
      subtitleParts.push(`Tax: ${company.tax_number}`);
    }
    if (company.bank_accounts && company.bank_accounts.length > 0) {
      subtitleParts.push(`${company.bank_accounts.length} bank account(s)`);
    }
    const subtitle = subtitleParts.join(" • ");

    return {
      value: company.id,
      label: (
        <div className="flex flex-col overflow-hidden py-1">
          <span className="truncate font-medium">{truncatedName}</span>
          {truncatedAddress && <span className="truncate text-muted-foreground text-xs">{truncatedAddress}</span>}
          {subtitle && <span className="truncate text-muted-foreground text-xs">{subtitle}</span>}
        </div>
      ),
      company, // Pass full company object for selection
    };
  });

  const handleValueChange = (selectedValue: string) => {
    const selectedOption = options.find((o) => o.value === selectedValue);
    if (selectedOption?.company && onSelect) {
      onSelect(selectedOption.company);
      // Clear search after selection
      setSearch("");
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="font-medium text-muted-foreground text-sm">Search {countryCode} company registry</span>
      </div>
      <Autocomplete
        searchValue={search}
        onSearch={handleSearch}
        onValueChange={handleValueChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        loading={isSearching}
        emptyText={search.length < 2 ? "Type at least 2 characters" : "No companies found"}
      />
    </div>
  );
}

export default CompanyRegistryAutocomplete;
