import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";

type AdvanceInvoiceApplicationCandidate = Pick<AdvanceInvoice, "is_draft" | "paid_in_full" | "voided_at">;

export type AdvanceInvoiceApplicationBlockReason = "draft" | "voided" | "unpaid";

export function getAdvanceInvoiceApplicationBlockReason(
  advanceInvoice: AdvanceInvoiceApplicationCandidate,
): AdvanceInvoiceApplicationBlockReason | undefined {
  if (advanceInvoice.is_draft) return "draft";
  if (advanceInvoice.voided_at) return "voided";
  if (advanceInvoice.paid_in_full !== true) return "unpaid";
  return undefined;
}
