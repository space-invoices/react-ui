type EslogDocumentLike = {
  eslog?: {
    validation_status?: string | null;
  } | null;
};

export type EslogSelectionState = {
  selectedCount: number;
  eligibleCount: number;
  hasEligibleDocuments: boolean;
  hasIneligibleDocuments: boolean;
  allEligible: boolean;
  noneEligible: boolean;
  partiallyEligible: boolean;
};

export function getEslogSelectionState(documents: EslogDocumentLike[]): EslogSelectionState {
  const selectedCount = documents.length;
  const eligibleCount = documents.filter((document) => document.eslog?.validation_status === "valid").length;
  const hasEligibleDocuments = eligibleCount > 0;
  const hasIneligibleDocuments = eligibleCount < selectedCount;

  return {
    selectedCount,
    eligibleCount,
    hasEligibleDocuments,
    hasIneligibleDocuments,
    allEligible: selectedCount > 0 && eligibleCount === selectedCount,
    noneEligible: selectedCount > 0 && eligibleCount === 0,
    partiallyEligible: eligibleCount > 0 && eligibleCount < selectedCount,
  };
}
