import { documents } from "@spaceinvoices/js-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Document type union for API calls
export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

// Cache key map for invalidation
const CACHE_KEYS: Record<DocumentType, string> = {
  invoice: "invoices",
  estimate: "estimates",
  credit_note: "credit-notes",
  advance_invoice: "advance-invoices",
  delivery_note: "delivery-notes",
};

// ============================================================================
// Finalize Document Hook
// ============================================================================

type FinalizeDocumentOptions = {
  entityId: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
};

type FinalizeDocumentVariables = {
  documentId: string;
  documentType: DocumentType;
  furs?: { business_premise_name: string; electronic_device_name: string } | { skip: true };
  fina?: { business_premise_name: string; electronic_device_name: string; payment_type?: string };
};

/**
 * Hook to finalize a draft document
 * Assigns a document number and runs fiscalization (if applicable)
 */
export function useFinalizeDocument(options: FinalizeDocumentOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType, furs, fina }: FinalizeDocumentVariables) => {
      const body: Record<string, unknown> = {};
      if (furs) body.furs = furs;
      if (fina) body.fina = fina;
      return documents.finalizeDocument(documentId, body, { type: documentType });
    },
    onSuccess: (data, variables) => {
      // Invalidate list cache
      const cacheKey = CACHE_KEYS[variables.documentType];
      queryClient.invalidateQueries({ queryKey: [cacheKey] });

      // Invalidate document detail cache
      queryClient.invalidateQueries({
        queryKey: ["documents", variables.documentType, variables.documentId],
      });

      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
}

// ============================================================================
// Delete Draft Document Hook
// ============================================================================

type DeleteDraftDocumentOptions = {
  entityId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

type DeleteDraftDocumentVariables = {
  documentId: string;
  documentType: DocumentType;
};

/**
 * Hook to delete a draft document
 * Only draft documents can be deleted
 */
export function useDeleteDraftDocument(options: DeleteDraftDocumentOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType }: DeleteDraftDocumentVariables) => {
      return documents.delete(documentId, { type: documentType });
    },
    onSuccess: (_, variables) => {
      // Invalidate list cache
      const cacheKey = CACHE_KEYS[variables.documentType];
      queryClient.invalidateQueries({ queryKey: [cacheKey] });

      // Remove document from detail cache
      queryClient.removeQueries({
        queryKey: ["documents", variables.documentType, variables.documentId],
      });

      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
}
