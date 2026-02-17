/**
 * Checks if a document has a failed fiscalization status.
 * Returns the provider type that failed, or null if no failure.
 */
export function getFiscalizationFailureType(doc: {
  furs?: { status?: string } | null;
  fina?: { status?: string } | null;
}): "furs" | "fina" | null {
  if (doc.furs?.status === "failed") return "furs";
  if (doc.fina?.status === "failed") return "fina";
  return null;
}
