import type { WhiteLabelPlan } from "../../providers/wl-subscription-provider";

type PlanTranslationOptions = Record<string, string | number> & { defaultValue?: string };
type PlanTranslator = (key: string, options?: PlanTranslationOptions) => string;

export function getLocalizedPlanName(plan: Pick<WhiteLabelPlan, "slug" | "name">, t: PlanTranslator): string {
  return t(`entity-billing-page.plan-names.${plan.slug}`, { defaultValue: plan.name });
}

export function getPlanDescription(plan: WhiteLabelPlan, t: PlanTranslator): string {
  const invoiceLimit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
  const includedStores = plan.limits?.included_store_count ?? null;

  if (invoiceLimit != null && includedStores != null) {
    return t("entity-billing-page.plan-description.invoices-and-stores", {
      invoices: invoiceLimit,
      stores: includedStores,
      defaultValue: "{{invoices}} invoices per month and {{stores}} connected stores included",
    });
  }
  if (invoiceLimit != null) {
    return t("entity-billing-page.plan-description.invoices-only", {
      invoices: invoiceLimit,
      defaultValue: "{{invoices}} invoices per month included",
    });
  }
  if (includedStores != null) {
    return t("entity-billing-page.plan-description.stores-only", {
      stores: includedStores,
      defaultValue: "{{stores}} connected stores included",
    });
  }
  return t("entity-billing-page.plan-description.unlimited", { defaultValue: "Unlimited usage" });
}
