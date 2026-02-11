import type { AdvanceInvoice, CreateAdvanceInvoiceBody } from "@spaceinvoices/js-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NEXT_DOCUMENT_NUMBER_CACHE_KEY } from "@/ui/hooks/use-next-document-number";
import { useSDK } from "@/ui/providers/sdk-provider";

// Define constants for cache keys
export const ADVANCE_INVOICES_CACHE_KEY = "advance-invoices";

// ============================================================================
// Create Advance Invoice Hook
// ============================================================================

type UseCreateAdvanceInvoiceOptions = {
  entityId: string;
  onSuccess?: (data: AdvanceInvoice) => void;
  onError?: (error: unknown) => void;
};

export function useCreateAdvanceInvoice({ entityId, onSuccess, onError }: UseCreateAdvanceInvoiceOptions) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAdvanceInvoiceBody) => {
      return sdk.advanceInvoices.create(data, { entity_id: entityId });
    },
    onSuccess: (data) => {
      // Invalidate advance invoices list cache
      queryClient.invalidateQueries({ queryKey: [ADVANCE_INVOICES_CACHE_KEY] });
      // Invalidate next number cache (shared cache key)
      queryClient.invalidateQueries({ queryKey: [NEXT_DOCUMENT_NUMBER_CACHE_KEY] });
      onSuccess?.(data);
    },
    onError,
  });
}

// ============================================================================
// FURS Last-Used Combo (localStorage) - Reuse from invoices
// ============================================================================

const FURS_ADV_LAST_USED_KEY = "si:furs:adv:last-used";

export type FursCombo = {
  business_premise_name: string;
  electronic_device_name: string;
};

/**
 * Get last-used FURS premise/device combo from localStorage for advance invoices
 * @param entityId - Entity ID (combos are stored per-entity)
 */
export function getLastUsedFursCombo(entityId: string): FursCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FURS_ADV_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save last-used FURS premise/device combo to localStorage for advance invoices
 * @param entityId - Entity ID
 * @param combo - FURS premise/device combo
 */
export function setLastUsedFursCombo(entityId: string, combo: FursCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FURS_ADV_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}
