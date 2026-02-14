/**
 * Detect if an error is a FURS operator settings validation error (422).
 * The API returns a ZodError with paths like ["furs", "operator_tax_number"]
 * when operator settings are missing during document creation.
 */
export function isFursOperatorError(error: unknown): boolean {
  const data = (error as any)?.data;
  if (!data?.cause?.issues) return false;
  return data.cause.issues.some(
    (issue: any) =>
      issue.path?.[0] === "furs" && (issue.path?.[1] === "operator_tax_number" || issue.path?.[1] === "operator_label"),
  );
}

/**
 * Detect if an error is a FINA operator settings error.
 * CIS requires OibOper (minOccurs="1" in FiskalizacijaSchema.xsd).
 * Checks for Zod validation errors with paths like ["fina", "operator_oib"]
 * or CIS XML validation errors mentioning OibOper.
 */
export function isFinaOperatorError(error: unknown): boolean {
  const data = (error as any)?.data;
  // Check for Zod-style validation error
  if (data?.cause?.issues) {
    return data.cause.issues.some(
      (issue: any) =>
        issue.path?.[0] === "fina" && (issue.path?.[1] === "operator_oib" || issue.path?.[1] === "operator_label"),
    );
  }
  // Check for CIS error message mentioning OibOper
  const message = data?.message || (error as any)?.message || "";
  if (typeof message === "string" && message.includes("OibOper")) {
    return true;
  }
  return false;
}
