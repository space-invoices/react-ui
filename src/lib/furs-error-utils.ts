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

/**
 * Detect if an error is a PT operator snapshot validation error.
 * PT document creation requires the operator first name, last name, and tax number.
 */
export function isPtOperatorError(error: unknown): boolean {
  const data = (error as any)?.data;
  if (data?.cause?.issues) {
    return data.cause.issues.some(
      (issue: any) =>
        issue.path?.[0] === "pt" &&
        (issue.path?.[1] === "account_first_name" ||
          issue.path?.[1] === "operator_first_name" ||
          issue.path?.[1] === "account_last_name" ||
          issue.path?.[1] === "operator_last_name" ||
          issue.path?.[1] === "account_tax_number" ||
          issue.path?.[1] === "operator_tax_number"),
    );
  }

  const message = data?.message || (error as any)?.message || "";
  if (typeof message !== "string") return false;

  return (
    message.includes("PT operator first name is required") ||
    message.includes("PT operator last name is required") ||
    message.includes("PT operator tax number is required")
  );
}

const PT_CREDIT_NOTE_REFERENCE_MESSAGE_PREFIX = "PT credit note";

/**
 * Return the API's message when a Portugal credit note was rejected because of its linked
 * original invoice (missing, draft, deleted, voided, or from another entity) so the form can
 * show that reason inline instead of a generic failure toast. Matched on the message prefix
 * because the API has no machine-readable code for these 422s.
 */
export function getPtCreditNoteReferenceErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; data?: { message?: unknown; code?: unknown } };
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  if (status !== undefined && status !== 422) return null;
  if (candidate.data?.code !== undefined && candidate.data.code !== "unprocessable_entity") return null;

  const message = candidate.data?.message;
  if (typeof message !== "string" || !message.startsWith(PT_CREDIT_NOTE_REFERENCE_MESSAGE_PREFIX)) return null;

  return message;
}
