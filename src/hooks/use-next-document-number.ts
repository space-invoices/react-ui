import { useQuery } from "@tanstack/react-query";

import { useSDK } from "@/ui/providers/sdk-provider";

export const NEXT_DOCUMENT_NUMBER_CACHE_KEY = "next-document-number";

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice";

/** Response type for next document number preview */
export type NextDocumentNumberResponse = {
  number: string | null;
  furs: {
    business_premise_name: string;
    electronic_device_name: string;
  } | null;
};

/**
 * Hook to fetch the next document number preview
 * Does not increment the sequence - purely for preview purposes
 *
 * Uses sdk.documents.getNextNumber() - the shared documents API
 */
export function useNextDocumentNumber(
  entityId: string,
  type: DocumentType,
  options?: {
    businessPremiseName?: string;
    electronicDeviceName?: string;
    enabled?: boolean;
  },
) {
  const { sdk } = useSDK();

  return useQuery<NextDocumentNumberResponse>({
    queryKey: [
      NEXT_DOCUMENT_NUMBER_CACHE_KEY,
      entityId,
      type,
      options?.businessPremiseName,
      options?.electronicDeviceName,
    ],
    queryFn: async () => {
      const response = await sdk.documents.getNextNumber(
        {
          type,
          business_premise_name: options?.businessPremiseName,
          electronic_device_name: options?.electronicDeviceName,
        },
        { entity_id: entityId },
      );
      return response;
    },
    enabled: options?.enabled !== false && !!entityId && !!sdk?.documents,
    staleTime: 0, // Always refetch when form opens
  });
}
