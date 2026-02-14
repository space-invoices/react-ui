/**
 * Credit note hooks using the shared createResourceHooks factory
 *
 * This provides:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Consistent error handling
 * - Less code duplication
 */

import type { CreateCreditNoteRequest, CreditNote } from "@spaceinvoices/js-sdk";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

export const CREDIT_NOTES_CACHE_KEY = "credit-notes";

const {
  useCreateResource: useCreateCreditNote,
  useUpdateResource: useUpdateCreditNote,
  useDeleteResource: useDeleteCreditNote,
} = createResourceHooks<CreditNote, CreateCreditNoteRequest>("creditNotes", CREDIT_NOTES_CACHE_KEY);

export { useCreateCreditNote, useUpdateCreditNote, useDeleteCreditNote };

// ============================================================================
// FINA Last-Used Combo (localStorage) for credit notes
// ============================================================================

const FINA_CN_LAST_USED_KEY = "hr:fina:cn:last-used";

export type FinaCombo = {
  premise_id: string;
  device_id: string;
};

export function getLastUsedFinaCombo(entityId: string): FinaCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FINA_CN_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setLastUsedFinaCombo(entityId: string, combo: FinaCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FINA_CN_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors
  }
}
