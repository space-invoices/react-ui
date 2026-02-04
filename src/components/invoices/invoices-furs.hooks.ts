import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

interface VoidInvoiceParams {
  invoiceId: string;
  entityId: string;
  reason?: string;
}

/**
 * Hook to void an invoice
 * Automatically handles FURS technical cancellation for fiscalized invoices
 */
export function useVoidInvoice() {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, entityId, reason }: VoidInvoiceParams) => {
      return sdk.invoices.void(invoiceId, { reason: reason || undefined }, { entity_id: entityId });
    },
    onSuccess: (_, variables) => {
      // Invalidate invoice queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["documents", "invoice", variables.invoiceId] });
    },
  });
}
