import { advanceInvoices, creditNotes, deliveryNotes, invoices } from "@spaceinvoices/js-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateCreditPreparationQueries } from "@/ui/lib/credit-preparation-cache";
import { invalidateDashboardStatsQueries } from "@/ui/lib/dashboard-stats-cache";
import { invalidateRevenueRecognitionQueries } from "@/ui/lib/revenue-recognition-cache";

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
      invalidateRevenueRecognitionQueries(queryClient);
      void invalidateDashboardStatsQueries(queryClient, variables.entityId);
      // Voiding a correction returns its quantities to the original, and voiding an invoice
      // ends what can be corrected on it, so both change the remaining creditable balance.
      if (variables.documentType === "credit_note" || variables.documentType === "invoice") {
        invalidateCreditPreparationQueries(queryClient, variables.entityId);
      }
    },
  });
}

/** @deprecated Use useVoidDocument instead */
export const useVoidInvoice = useVoidDocument;
