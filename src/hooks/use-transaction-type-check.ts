import type { TransactionTypeCheckRequest, TransactionTypeCheckResponse } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSDK } from "../providers/sdk-provider";
import { useDebounce } from "./use-debounce";

export const TRANSACTION_TYPE_CHECK_CACHE_KEY = "transaction-type-check";

/** Debounce delay for transaction type checks (ms) */
const CHECK_DEBOUNCE_DELAY = 500;

/** Cache time for results - 5 minutes */
const CHECK_STALE_TIME = 5 * 60 * 1000;

export interface UseTransactionTypeCheckParams {
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
  /** Whether the customer is an end consumer (B2C override) */
  customerIsEndConsumer?: boolean;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

export interface UseTransactionTypeCheckResult {
  /** The check result */
  data: TransactionTypeCheckResponse | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query is fetching (includes background refetches) */
  isFetching: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Whether reverse charge should be applied */
  reverseChargeApplies: boolean;
  /** Transaction type determined by check */
  transactionType: TransactionTypeCheckResponse["transaction_type"] | undefined;
  /** Customer country code returned by check */
  customerCountryCode: string | null;
  /** Warning message from VIES validation */
  warning: string | null;
  /** Whether VIES validation was successful */
  viesValid: boolean | null;
}

/**
 * Hook to check transaction type for a given issuer/customer combination.
 * Uses debouncing to avoid excessive API calls during typing.
 *
 * @example
 * ```tsx
 * const { reverseChargeApplies, transactionType, warning } = useTransactionTypeCheck({
 *   issuerCountryCode: entity.country_code,
 *   isTaxSubject: entity.is_tax_subject,
 *   customerCountry: customer.country,
 *   customerTaxNumber: customer.tax_number,
 *   customerIsEndConsumer: customer.is_end_consumer,
 * });
 * ```
 */
export function useTransactionTypeCheck({
  issuerCountry,
  issuerCountryCode,
  isTaxSubject = true,
  customerCountry,
  customerCountryCode,
  customerTaxNumber,
  customerIsEndConsumer,
  enabled = true,
}: UseTransactionTypeCheckParams): UseTransactionTypeCheckResult {
  const { sdk } = useSDK();

  // Build the request object
  const requestData = useMemo((): TransactionTypeCheckRequest | null => {
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
        is_end_consumer: customerIsEndConsumer,
      },
    };
  }, [
    issuerCountry,
    issuerCountryCode,
    isTaxSubject,
    customerCountry,
    customerCountryCode,
    customerTaxNumber,
    customerIsEndConsumer,
  ]);

  // Debounce the request data to avoid excessive API calls
  const debouncedRequest = useDebounce(requestData, CHECK_DEBOUNCE_DELAY);

  // Create a stable query key
  const queryKey = useMemo(() => [TRANSACTION_TYPE_CHECK_CACHE_KEY, debouncedRequest], [debouncedRequest]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!debouncedRequest) throw new Error("No request data");
      // Use sdk.vies.checkVies which hits the same endpoint types
      // (sdk.transactionType is not reliably available in Vite pre-bundled builds)
      const checkFn = sdk.transactionType?.checkTransactionType ?? sdk.vies.checkVies;
      return checkFn(debouncedRequest);
    },
    enabled: enabled && !!sdk && !!debouncedRequest,
    staleTime: CHECK_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    reverseChargeApplies: query.data?.reverse_charge_applies ?? false,
    transactionType: query.data?.transaction_type,
    customerCountryCode: query.data?.customer_country_code ?? null,
    warning: query.data?.warning ?? null,
    viesValid: query.data?.vies_valid ?? null,
  };
}

/**
 * @deprecated Use useTransactionTypeCheck instead
 */
export const useViesCheck = useTransactionTypeCheck;
export type UseViesCheckParams = UseTransactionTypeCheckParams;
export type UseViesCheckResult = UseTransactionTypeCheckResult;
export const VIES_CHECK_CACHE_KEY = TRANSACTION_TYPE_CHECK_CACHE_KEY;
