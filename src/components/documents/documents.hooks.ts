import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_COOKIES } from "@/ui/lib/auth";
import { getCookie } from "@/ui/lib/browser-cookies";

// Document type union for API calls
export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice";

// Cache key map for invalidation
const CACHE_KEYS: Record<DocumentType, string> = {
  invoice: "invoices",
  estimate: "estimates",
  credit_note: "credit-notes",
  advance_invoice: "advance-invoices",
};

/**
 * Get API base URL from environment
 */
function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return (import.meta.env?.VITE_API_URL || import.meta.env?.BUN_PUBLIC_API_URL || "") as string;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(path: string, options: RequestInit & { entityId: string }): Promise<T> {
  const token = getCookie(AUTH_COOKIES.TOKEN);
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-entity-id": options.entityId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  // DELETE returns 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType }: FinalizeDocumentVariables) => {
      return apiRequest(`/documents/${documentId}/finalize?type=${documentType}`, {
        method: "POST",
        entityId: options.entityId,
      });
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
      return apiRequest(`/documents/${documentId}?type=${documentType}`, {
        method: "DELETE",
        entityId: options.entityId,
      });
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
