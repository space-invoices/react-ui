import type { ViesCheckRequest, ViesCheckResponse } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSDK } from "../providers/sdk-provider";
import { useDebounce } from "./use-debounce";

export const VIES_CHECK_CACHE_KEY = "vies-check";

/** Debounce delay for VIES checks (ms) */
const VIES_DEBOUNCE_DELAY = 500;

/** Cache time for VIES results - 5 minutes */
const VIES_STALE_TIME = 5 * 60 * 1000;

export interface UseViesCheckParams {
  /** Issuer country name or code */
  issuerCountry?: string | null;
  /** Issuer country code (takes precedence over country name) */
  issuerCountryCode?: string | null;
  /** Whether the issuer is a tax subject (default: true) */
  isTaxSubject?: boolean;
  /** Customer country name or code */
  customerCountry?: string | null;
  /** Customer country code (takes precedence over country name) */
  customerCountryCode?: string | null;
  /** Customer VAT/tax number */
  customerTaxNumber?: string | null;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

export interface UseViesCheckResult {
  /** The VIES check result */
  data: ViesCheckResponse | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query is fetching (includes background refetches) */
  isFetching: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Whether reverse charge should be applied */
  reverseChargeApplies: boolean;
  /** Transaction type determined by VIES check */
  transactionType: ViesCheckResponse["transaction_type"] | undefined;
  /** Warning message from VIES validation */
  warning: string | null;
  /** Whether VIES validation was successful */
  viesValid: boolean | null;
}

/**
 * Hook to check VIES status for a given issuer/customer combination.
 * Uses debouncing to avoid excessive API calls during typing.
 *
 * @example
 * ```tsx
 * const { reverseChargeApplies, transactionType, warning } = useViesCheck({
 *   issuerCountryCode: entity.country_code,
 *   isTaxSubject: entity.is_tax_subject,
 *   customerCountry: customer.country,
 *   customerTaxNumber: customer.tax_number,
 * });
 *
 * // Disable taxes when reverse charge applies
 * if (reverseChargeApplies) {
 *   // Show reverse charge message and disable tax controls
 * }
 * ```
 */
export function useViesCheck({
  issuerCountry,
  issuerCountryCode,
  isTaxSubject = true,
  customerCountry,
  customerCountryCode,
  customerTaxNumber,
  enabled = true,
}: UseViesCheckParams): UseViesCheckResult {
  const { sdk } = useSDK();

  // Build the request object
  const requestData = useMemo((): ViesCheckRequest | null => {
    // Need at least issuer info to make a check
    if (!issuerCountry && !issuerCountryCode) return null;

    // Need at least some customer info to make a meaningful check
    if (!customerCountry && !customerCountryCode && !customerTaxNumber) return null;

    return {
      issuer: {
        country: issuerCountry || undefined,
        country_code: issuerCountryCode || undefined,
        is_tax_subject: isTaxSubject,
      },
      customer: {
        country: customerCountry || undefined,
        country_code: customerCountryCode || undefined,
        tax_number: customerTaxNumber || undefined,
      },
    };
  }, [issuerCountry, issuerCountryCode, isTaxSubject, customerCountry, customerCountryCode, customerTaxNumber]);

  // Debounce the request data to avoid excessive API calls
  const debouncedRequest = useDebounce(requestData, VIES_DEBOUNCE_DELAY);

  // Create a stable query key
  const queryKey = useMemo(() => [VIES_CHECK_CACHE_KEY, debouncedRequest], [debouncedRequest]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!debouncedRequest) throw new Error("No request data");
      return sdk.vies.checkVies(debouncedRequest);
    },
    enabled: enabled && !!sdk && !!debouncedRequest,
    staleTime: VIES_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    reverseChargeApplies: query.data?.reverse_charge_applies ?? false,
    transactionType: query.data?.transaction_type,
    warning: query.data?.warning ?? null,
    viesValid: query.data?.vies_valid ?? null,
  };
}
