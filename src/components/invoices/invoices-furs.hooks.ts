import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

interface VoidDocumentParams {
  documentId: string;
  documentType: "invoice" | "credit_note" | "advance_invoice";
  entityId: string;
  reason?: string;
}

/**
 * Hook to void a document (invoice, credit note, or advance invoice)
 * Automatically handles FURS/FINA technical cancellation for fiscalized documents
 */
export function useVoidDocument() {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType, entityId, reason }: VoidDocumentParams) => {
      const body = { reason: reason || undefined };
      const opts = { entity_id: entityId };

      switch (documentType) {
        case "invoice":
          return sdk.invoices.void(documentId, body, opts);
        case "credit_note":
          return sdk.creditNotes.void(documentId, body, opts);
        case "advance_invoice":
          return sdk.advanceInvoices.void(documentId, body, opts);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["advance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["documents", variables.documentType, variables.documentId] });
    },
  });
}

/** @deprecated Use useVoidDocument instead */
export const useVoidInvoice = useVoidDocument;
