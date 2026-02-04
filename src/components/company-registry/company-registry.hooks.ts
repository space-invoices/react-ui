import type { CompanyRegistryResult } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/ui/hooks/use-debounce";
import { useSDK } from "@/ui/providers/sdk-provider";

// Cache key for company registry queries
export const COMPANY_REGISTRY_CACHE_KEY = "company-registry";

/**
 * Search company registry for autocomplete
 * Debounced to reduce API calls while typing
 */
export function useCompanyRegistrySearch(countryCode: string, query: string) {
  const { sdk } = useSDK();
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: [COMPANY_REGISTRY_CACHE_KEY, "search", countryCode, debouncedQuery],
    queryFn: async (): Promise<{ data: CompanyRegistryResult[] }> => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { data: [] };
      }

      // SDK auto-unwraps response - returns CompanyRegistrySearchResponse directly
      const response = await sdk.companyRegistry.searchCompanyRegistry({
        country_code: countryCode,
        q: debouncedQuery,
        limit: "10",
      });

      return { data: response.data };
    },
    enabled: Boolean(countryCode && debouncedQuery && debouncedQuery.length >= 2),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Get list of countries that have company registry data available
 */
export function useSupportedCountries() {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: [COMPANY_REGISTRY_CACHE_KEY, "countries"],
    queryFn: async (): Promise<{ data: string[] }> => {
      // SDK method renamed to `list`, auto-unwraps response
      const response = await sdk.companyRegistry.list();
      return { data: response.data };
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - doesn't change often
  });
}

/**
 * Check if company registry is available for a specific country
 */
export function useIsCountrySupported(countryCode: string) {
  const { data: countriesData, isLoading } = useSupportedCountries();

  const isSupported = countriesData?.data?.includes(countryCode) ?? false;

  return {
    isSupported,
    isLoading,
  };
}
