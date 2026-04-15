import { useQuery } from "@tanstack/react-query";
import { documents } from "../../../js-sdk/src/sdk/documents";

export const NEXT_DOCUMENT_NUMBER_CACHE_KEY = "next-document-number";

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

/** Response type for next document number preview */
export type NextDocumentNumberResponse = {
  number: string | null;
  furs?: {
    business_premise_name: string;
    electronic_device_name: string;
  } | null;
  fina?: {
    business_premise_name: string;
    electronic_device_name: string;
  } | null;
  pt?: {
    series_id: string;
    series_code: string;
    validation_code: string;
    manual?: boolean;
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
    businessUnitId?: string | null;
    enabled?: boolean;
  },
) {
  return useQuery<NextDocumentNumberResponse>({
    queryKey: [
      NEXT_DOCUMENT_NUMBER_CACHE_KEY,
      entityId,
      type,
      options?.businessPremiseName,
      options?.electronicDeviceName,
      options?.businessUnitId ?? null,
    ],
    queryFn: async () => {
      const response = await documents.getNextNumber(
        {
          type: type as "invoice",
          business_premise_name: options?.businessPremiseName,
          electronic_device_name: options?.electronicDeviceName,
          business_unit_id: options?.businessUnitId ?? undefined,
        } as any,
        { entity_id: entityId },
      );
      return response;
    },
    enabled: options?.enabled !== false && !!entityId,
    staleTime: 0, // Always refetch when form opens
  });
}
