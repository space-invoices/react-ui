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
