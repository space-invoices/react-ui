import type { WhiteLabelPlan } from "../../providers/wl-subscription-provider";

export type PeppolMeterPricing = {
  includedSends: number;
  sendPriceCents: number;
};

export function hasPeppolPlanAccess(plan: WhiteLabelPlan): boolean {
  return plan.features.length === 0 || plan.features.includes("e_invoicing");
}

export function getPeppolMeterPricing(plan: WhiteLabelPlan): PeppolMeterPricing | null {
  if (!hasPeppolPlanAccess(plan)) return null;

  const includedSends = Math.max(plan.limits?.e_invoicing_sends_included ?? 0, 0);
  const sendPriceCents = Math.max(plan.limits?.e_invoicing_send_price_cents ?? 0, 0);

  if (includedSends === 0 && sendPriceCents === 0) return null;

  return { includedSends, sendPriceCents };
}
