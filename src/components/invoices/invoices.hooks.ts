import type {
  CreateInvoice,
  CustomCreateInvoice,
  Invoice,
  InvoiceCreditOptions,
  SDKMethodOptions,
  UpdateInvoice,
} from "@spaceinvoices/js-sdk";
import { documents, invoices } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import { INVOICE_CREDIT_OPTIONS_CACHE_KEY } from "@/ui/lib/credit-preparation-cache";

export { INVOICE_CREDIT_OPTIONS_CACHE_KEY };

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
    business_unit_id?: string | null;
    enabled?: boolean;
  },
) {
  return useQuery<NextInvoiceNumberResponse>({
    queryKey: [
      NEXT_INVOICE_NUMBER_CACHE_KEY,
      entityId,
      options?.business_premise_name,
      options?.electronic_device_name,
      options?.business_unit_id ?? null,
    ],
    queryFn: async () => {
      const response = await documents.getNextNumber(
        {
          type: "invoice",
          business_premise_name: options?.business_premise_name,
          electronic_device_name: options?.electronic_device_name,
          business_unit_id: options?.business_unit_id ?? undefined,
        } as any,
        { entity_id: entityId },
      );
      return response as NextInvoiceNumberResponse;
    },
    enabled: options?.enabled !== false && !!entityId,
    staleTime: 0, // Always refetch when form opens or params change
  });
}

// ============================================================================
// Credit-note preparation
// ============================================================================

/**
 * Remaining creditable quantities for one issued invoice.
 *
 * Only meaningful where the country tracks corrections per line, and only for a single
 * document the user is already looking at: never call this per row of a list.
 *
 * The balance changes whenever a correction is issued or voided, so the answer is never
 * reused without checking: `staleTime: 0` keeps a remount refetching, and
 * `invalidateCreditPreparationQueries` refreshes the mounted query after those mutations.
 */
export function useInvoiceCreditOptions(
  invoiceId: string | undefined,
  entityId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery<InvoiceCreditOptions>({
    queryKey: [INVOICE_CREDIT_OPTIONS_CACHE_KEY, invoiceId, entityId],
    queryFn: () => invoices.getCreditOptions(invoiceId as string, { entity_id: entityId as string }),
    enabled: options?.enabled !== false && !!invoiceId && !!entityId,
    retry: false,
    staleTime: 0,
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
