import { advanceInvoices, creditNotes, deliveryNotes, invoices } from "@spaceinvoices/js-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VoidDocumentParams {
  documentId: string;
  documentType: "invoice" | "credit_note" | "advance_invoice" | "delivery_note";
  entityId: string;
  reason?: string;
  hasOriginalDocument?: boolean;
}

/**
 * Hook to void a document (invoice, credit note, or advance invoice)
 * Automatically handles FURS/FINA technical cancellation for fiscalized documents
 */
export function useVoidDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType, entityId, reason, hasOriginalDocument }: VoidDocumentParams) => {
      const body = {
        reason: reason || undefined,
        has_original_document: hasOriginalDocument,
      };
      const opts = { entity_id: entityId };

      switch (documentType) {
        case "invoice":
          return invoices.void(documentId, body, opts);
        case "credit_note":
          return creditNotes.void(documentId, body, opts);
        case "advance_invoice":
          return advanceInvoices.void(documentId, body, opts);
        case "delivery_note":
          return deliveryNotes.void(documentId, body, opts);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["advance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["documents", variables.documentType, variables.documentId] });
    },
  });
}

/** @deprecated Use useVoidDocument instead */
export const useVoidInvoice = useVoidDocument;
