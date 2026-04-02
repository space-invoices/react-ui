import type { CreateInvoice, CustomCreateInvoice, Invoice, SDKMethodOptions, UpdateInvoice } from "@spaceinvoices/js-sdk";
import { documents, invoices } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the invoices cache key
export const INVOICES_CACHE_KEY = "invoices";
export const NEXT_INVOICE_NUMBER_CACHE_KEY = "next-invoice-number";

const voidInvoice = async (id: string, options?: SDKMethodOptions): Promise<void> => {
  await invoices.void(id, {}, options);
};

// Create invoice-specific hooks using the factory
const {
  useCreateResource: useCreateInvoice,
  useUpdateResource: useUpdateInvoice,
  useDeleteResource: useDeleteInvoice,
} = createResourceHooks<Invoice, CreateInvoice, UpdateInvoice>(
  {
    create: invoices.create,
    update: invoices.update,
    delete: voidInvoice,
  },
  INVOICES_CACHE_KEY,
);

const { useCreateResource: useCreateCustomInvoice } = createResourceHooks<Invoice, CustomCreateInvoice, UpdateInvoice>(
  {
    create: invoices.createCustom,
    update: invoices.update,
    delete: voidInvoice,
  },
  INVOICES_CACHE_KEY,
);

// Re-export document types for backward compatibility
export type { DocumentTypes } from "../documents/types";
export { useCreateCustomInvoice, useCreateInvoice, useDeleteInvoice, useUpdateInvoice };

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
  fina?: {
    business_premise_name: string;
    electronic_device_name: string;
  } | null;
  pt?: {
    series_id: string;
    series_code: string;
    validation_code: string;
    manual?: boolean;
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
  return useQuery<NextInvoiceNumberResponse>({
    queryKey: [
      NEXT_INVOICE_NUMBER_CACHE_KEY,
      entityId,
      options?.business_premise_name,
      options?.electronic_device_name,
    ],
    queryFn: async () => {
      const response = await documents.getNextNumber(
        {
          type: "invoice",
          business_premise_name: options?.business_premise_name,
          electronic_device_name: options?.electronic_device_name,
        },
        { entity_id: entityId },
      );
      return response as NextInvoiceNumberResponse;
    },
    enabled: options?.enabled !== false && !!entityId,
    staleTime: 0, // Always refetch when form opens or params change
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

// ============================================================================
// FINA Last-Used Combo (localStorage)
// ============================================================================

const FINA_LAST_USED_KEY = "hr:fina:last-used";

export type FinaCombo = {
  business_premise_name: string;
  electronic_device_name: string;
};

export function getLastUsedFinaCombo(entityId: string): FinaCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FINA_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setLastUsedFinaCombo(entityId: string, combo: FinaCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FINA_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}
