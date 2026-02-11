import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

// Document type union for API calls
export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice";

// Cache key map for invalidation
const CACHE_KEYS: Record<DocumentType, string> = {
  invoice: "invoices",
  estimate: "estimates",
  credit_note: "credit-notes",
  advance_invoice: "advance-invoices",
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
};

/**
 * Hook to finalize a draft document
 * Assigns a document number and runs fiscalization (if applicable)
 */
export function useFinalizeDocument(options: FinalizeDocumentOptions) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType }: FinalizeDocumentVariables) => {
      return sdk.documents.finalizeDocument(documentId, { type: documentType });
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
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType }: DeleteDraftDocumentVariables) => {
      return sdk.documents.delete(documentId, { type: documentType });
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
