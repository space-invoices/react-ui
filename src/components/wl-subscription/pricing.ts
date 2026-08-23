import type { CurrentSubscription, WhiteLabelPlan } from "../../providers/wl-subscription-provider";

export type WLBillingInterval = "monthly" | "yearly";

export function getPlanPriceCents(plan: WhiteLabelPlan, billingInterval: WLBillingInterval): number | null {
  if (billingInterval === "yearly") {
    if (plan.base_price_cents == null) return null;
    return plan.limits?.annual_price_cents ?? Math.round(plan.base_price_cents * 12 * 0.8);
  }

  return plan.base_price_cents;
}

export function getExtraStorePriceCents(
  storeBilling: CurrentSubscription["store_billing"],
  billingInterval: WLBillingInterval,
): number | null {
  if (!storeBilling) return null;
  if (billingInterval === "yearly") {
    return (
      storeBilling.extra_store_price_cents_yearly ??
      (storeBilling.extra_store_price_cents_monthly == null
        ? null
        : Math.round(storeBilling.extra_store_price_cents_monthly * 12 * 0.8))
    );
  }

  return storeBilling.extra_store_price_cents_monthly;
}
