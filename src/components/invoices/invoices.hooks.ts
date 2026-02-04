import type { CreateInvoice201, CreateInvoiceBody } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import { useSDK } from "@/ui/providers/sdk-provider";

// Define a constant for the invoices cache key
export const INVOICES_CACHE_KEY = "invoices";
export const NEXT_INVOICE_NUMBER_CACHE_KEY = "next-invoice-number";

// Create invoice-specific hooks using the factory
const {
  useCreateResource: useCreateInvoice,
  useUpdateResource: useUpdateInvoice,
  useDeleteResource: useDeleteInvoice,
} = createResourceHooks<CreateInvoice201, CreateInvoiceBody>("invoices", INVOICES_CACHE_KEY);

export { useCreateInvoice, useUpdateInvoice, useDeleteInvoice };

// Re-export document types for backward compatibility
export type { DocumentTypes } from "../documents/types";

// ============================================================================
// Next Invoice Number Preview
// ============================================================================

/** Response type for next invoice number preview */
export type NextInvoiceNumberResponse = {
  number: string | null;
  furs: {
    business_premise_name: string;
    electronic_device_name: string;
  } | null;
};

/**
 * Hook to fetch the next invoice number preview
 * Does not increment the sequence - purely for preview purposes
 */
export function useNextInvoiceNumber(
  entityId: string,
  options?: {
    business_premise_name?: string;
    electronic_device_name?: string;
    enabled?: boolean;
  },
) {
  const { sdk } = useSDK();

  return useQuery<NextInvoiceNumberResponse>({
    queryKey: [
      NEXT_INVOICE_NUMBER_CACHE_KEY,
      entityId,
      options?.business_premise_name,
      options?.electronic_device_name,
    ],
    queryFn: async () => {
      const response = await sdk.documents.getNextNumber(
        {
          type: "invoice",
          business_premise_name: options?.business_premise_name,
          electronic_device_name: options?.electronic_device_name,
        },
        { entity_id: entityId },
      );
      return response as NextInvoiceNumberResponse;
    },
    enabled: options?.enabled !== false && !!entityId && !!sdk?.documents,
    staleTime: 5000, // 5 seconds - short to catch concurrent creates
  });
}

// ============================================================================
// FURS Last-Used Combo (localStorage)
// ============================================================================

const FURS_LAST_USED_KEY = "si:furs:last-used";

export type FursCombo = {
  business_premise_name: string;
  electronic_device_name: string;
};

/**
 * Get last-used FURS premise/device combo from localStorage
 * @param entityId - Entity ID (combos are stored per-entity)
 */
export function getLastUsedFursCombo(entityId: string): FursCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FURS_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save last-used FURS premise/device combo to localStorage
 * @param entityId - Entity ID
 * @param combo - FURS premise/device combo
 */
export function setLastUsedFursCombo(entityId: string, combo: FursCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FURS_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}
