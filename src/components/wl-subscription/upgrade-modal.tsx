import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { type GatedFeature, useWLSubscription, type WhiteLabelPlan } from "../../providers/wl-subscription-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Optional feature that triggered the modal */
  feature?: GatedFeature;
  /** Optional callback when upgrade is clicked */
  onUpgrade?: (planSlug: string) => void;
} & ComponentTranslationProps;

type TranslateValues = Record<string, string | number>;

function interpolateTranslation(template: string, values?: TranslateValues) {
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function createUpgradeTranslation({ t, namespace, locale, translationLocale }: ComponentTranslationProps) {
  const fallbackTranslation = createTranslation({
    t,
    namespace,
    locale,
    translationLocale,
    translations: {
      en: {
        "wl-subscription.upgrade-modal.title": "Upgrade your plan",
        "wl-subscription.upgrade-modal.description.with-feature": "Unlock {{feature}} and more with an upgraded plan.",
        "wl-subscription.upgrade-modal.description.default": "Get access to more features and higher limits.",
        "wl-subscription.locked-feature.features.furs": "FURS fiscalization",
        "wl-subscription.locked-feature.features.fina": "FINA fiscalization",
        "wl-subscription.locked-feature.features.eslog": "eSlog export",
        "wl-subscription.locked-feature.features.recurring": "Recurring invoices",
        "wl-subscription.locked-feature.features.email_sending": "Email sending",
        "wl-subscription.locked-feature.features.financial_categories": "Categories",
        "wl-subscription.locked-feature.features.business_units": "Units / Brands",
        "wl-subscription.locked-feature.features.custom_templates": "Custom templates",
        "wl-subscription.locked-feature.features.api_access": "API access",
        "wl-subscription.locked-feature.features.webhooks": "Webhooks",
        "wl-subscription.locked-feature.features.priority_support": "Priority support",
        "wl-subscription.locked-feature.features.e_invoicing": "E-Invoicing",
        "entity-billing-page.plans.monthly": "Monthly",
        "entity-billing-page.plans.yearly": "Yearly",
        "entity-billing-page.plans.recommended": "Recommended",
        "entity-billing-page.plans.current": "Current",
        "entity-billing-page.plan-description.unlimited": "Unlimited usage",
        "entity-billing-page.plan-description.invoices-and-stores":
          "{{invoices}} invoices per month and {{stores}} connected stores included",
        "entity-billing-page.plan-description.invoices-only": "{{invoices}} invoices per month included",
        "entity-billing-page.plan-description.stores-only": "{{stores}} connected stores included",
        "entity-billing-page.pricing.per-month": "/mo",
        "entity-billing-page.plan-names.simple": "Simple",
        "entity-billing-page.plan-names.advanced": "Advanced",
        "entity-billing-page.plan-names.pro": "Pro",
        "entity-billing-page.paywall.yearly-discount": "2 months free",
        "entity-billing-page.paywall.billed-yearly": "billed yearly",
        "entity-billing-page.paywall.redirecting": "Redirecting...",
        "entity-billing-page.paywall.get-plan": "Choose {{plan}}",
        "entity-billing-page.paywall.no-plans": "No plans available. Contact support for more information.",
        "entity-billing-page.paywall.checkout-failed": "Failed to start checkout",
        "entity-billing-page.paywall.features.simple.estimates-and-delivery-notes":
          "Unlimited estimates and delivery notes",
        "entity-billing-page.paywall.features.simple.email-sending": "Email sending",
        "entity-billing-page.paywall.features.simple.users": "1 user",
        "entity-billing-page.paywall.features.simple.templates": "Clean invoice templates",
        "entity-billing-page.paywall.features.advanced.fiscalization": "FURS and FINA fiscalization",
        "entity-billing-page.paywall.features.advanced.e-invoicing": "eSlog and Peppol e-invoicing",
        "entity-billing-page.paywall.features.advanced.financial-categories":
          "Financial categories and revenue reporting",
        "entity-billing-page.paywall.features.advanced.business-units": "Units / Brands",
        "entity-billing-page.paywall.features.advanced.recurring": "Recurring invoices",
        "entity-billing-page.paywall.features.advanced.email-sending": "Email sending",
        "entity-billing-page.paywall.features.advanced.priority-support": "Priority support",
        "entity-billing-page.paywall.features.advanced.users": "3 users",
        "entity-billing-page.paywall.features.pro.connected-store": "1 connected store included",
        "entity-billing-page.paywall.features.pro.extra-stores": "Extra stores at €5.99/month",
        "entity-billing-page.paywall.features.pro.integrations": "Shopify and WooCommerce integrations",
        "entity-billing-page.paywall.features.pro.financial-categories": "Financial categories and revenue reporting",
        "entity-billing-page.paywall.features.pro.business-units": "Units / Brands",
        "entity-billing-page.paywall.features.pro.api-and-webhooks": "API access and webhooks",
        "entity-billing-page.paywall.features.pro.custom-templates": "Custom templates",
        "entity-billing-page.paywall.features.pro.overage": "Overage billed at €0.01/invoice",
      },
    },
  });

  return (key: string, options?: { defaultValue?: string } & TranslateValues) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;

    if (t) {
      const translated = (t as (key: string, options?: Record<string, unknown>) => string)(fullKey, options);
      if (translated !== fullKey && translated !== key) {
        return interpolateTranslation(translated, options);
      }
    }

    const fallback = fallbackTranslation(key);
    if (fallback !== key) {
      return interpolateTranslation(fallback, options);
    }

    return options?.defaultValue ? interpolateTranslation(options.defaultValue, options) : fallback;
  };
}

/**
 * UpgradeModal component
 *
 * Shows available plans and allows users to upgrade their subscription.
 * Highlights the feature that triggered the modal and which plans include it.
 * Includes monthly/yearly toggle for white-label pricing.
 */
export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  onUpgrade,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: UpgradeModalProps) {
  const { plan: currentPlan, availablePlans, createCheckout } = useWLSubscription();
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const t = createUpgradeTranslation({ t: translateFn, namespace, locale, translationLocale });

  // Sort plans by display order
  const sortedPlans = [...availablePlans].sort((a, b) => a.display_order - b.display_order);
  const paidPlans = sortedPlans.filter((plan) => !plan.is_free);

  // Find the minimum plan that includes the requested feature
  const minimumPlanForFeature = feature
    ? paidPlans.find((p) => p.features.length === 0 || p.features.includes(feature))
    : null;

  const handleUpgrade = async (planSlug: string) => {
    if (onUpgrade) {
      onUpgrade(planSlug);
    }

    try {
      setIsRedirecting(planSlug);
      setCheckoutError(null);
      const billingInterval = isYearly ? "yearly" : "monthly";
      const checkoutUrl = await createCheckout(planSlug, billingInterval);
      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : t("entity-billing-page.paywall.checkout-failed", { defaultValue: "Failed to start checkout" }),
      );
      setIsRedirecting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] w-[min(96vw,72rem)] max-w-[72rem] overflow-y-auto sm:max-w-[72rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("wl-subscription.upgrade-modal.title", {
              defaultValue: "Upgrade your plan",
            })}
          </DialogTitle>
          <DialogDescription>
            {feature
              ? t("wl-subscription.upgrade-modal.description.with-feature", {
                  feature: getFeatureDisplayName(feature, t),
                  defaultValue: "Unlock {{feature}} and more with an upgraded plan.",
                })
              : t("wl-subscription.upgrade-modal.description.default", {
                  defaultValue: "Get access to more features and higher limits.",
                })}
          </DialogDescription>
        </DialogHeader>

        {/* Monthly/Yearly toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>
            {t("entity-billing-page.plans.monthly", { defaultValue: "Monthly" })}
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>
            {t("entity-billing-page.plans.yearly", { defaultValue: "Yearly" })}
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-1">
              {t("entity-billing-page.paywall.yearly-discount", { defaultValue: "2 months free" })}
            </Badge>
          )}
        </div>

        {checkoutError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{checkoutError}</p>
        )}

        <div className="grid gap-4 py-4 lg:grid-cols-3">
          {paidPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              t={translateFn}
              namespace={namespace}
              locale={locale}
              translationLocale={translationLocale}
              isYearly={isYearly}
              isCurrentPlan={plan.slug === currentPlan?.slug}
              isRecommended={minimumPlanForFeature?.slug === plan.slug}
              highlightFeature={feature}
              isLoading={isRedirecting === plan.slug}
              isDisabled={isRedirecting !== null}
              onSelect={() => handleUpgrade(plan.slug)}
            />
          ))}
        </div>

        {paidPlans.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            {t("entity-billing-page.paywall.no-plans", {
              defaultValue: "No upgrade plans available. Contact support for more information.",
            })}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PLAN CARD
// ============================================

type PlanCardProps = {
  plan: WhiteLabelPlan;
  isYearly: boolean;
  isCurrentPlan: boolean;
  isRecommended: boolean;
  highlightFeature?: GatedFeature;
  isLoading?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
} & ComponentTranslationProps;

function PlanCard({
  plan,
  isYearly,
  isCurrentPlan,
  isRecommended,
  highlightFeature,
  isLoading,
  isDisabled,
  onSelect,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: PlanCardProps) {
  const t = createUpgradeTranslation({ t: translateFn, namespace, locale, translationLocale });
  const monthlyPrice = plan.base_price_cents ? plan.base_price_cents / 100 : 0;
  const annualPriceCents = plan.limits?.annual_price_cents;
  const yearlyTotal =
    annualPriceCents != null ? annualPriceCents / 100 : Math.round(monthlyPrice * 12 * 0.8 * 100) / 100;
  const yearlyMonthly = Math.round((yearlyTotal / 12) * 100) / 100;

  const displayPrice = isYearly ? yearlyMonthly : monthlyPrice;
  const planName = t(`entity-billing-page.plan-names.${plan.slug}`, { defaultValue: plan.name });
  const featureItems = getPlanFeatures(plan.slug, highlightFeature, t);
  const invoiceLimit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
  const includedStores = plan.limits?.included_store_count ?? null;
  let planDescription = t("entity-billing-page.plan-description.unlimited", { defaultValue: "Unlimited usage" });

  if (invoiceLimit != null && includedStores != null) {
    planDescription = t("entity-billing-page.plan-description.invoices-and-stores", {
      invoices: invoiceLimit,
      stores: includedStores,
      defaultValue: "{{invoices}} invoices per month and {{stores}} connected stores included",
    });
  } else if (invoiceLimit != null) {
    planDescription = t("entity-billing-page.plan-description.invoices-only", {
      invoices: invoiceLimit,
      defaultValue: "{{invoices}} invoices per month included",
    });
  } else if (includedStores != null) {
    planDescription = t("entity-billing-page.plan-description.stores-only", {
      stores: includedStores,
      defaultValue: "{{stores}} connected stores included",
    });
  }

  return (
    <div
      className={`relative flex flex-col rounded-lg border p-4 ${
        isRecommended ? "border-primary ring-2 ring-primary" : "border-border"
      } ${isCurrentPlan ? "bg-muted/50" : ""}`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
          {t("entity-billing-page.plans.recommended", { defaultValue: "Recommended" })}
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <PlanIcon slug={plan.slug} />
        <h3 className="font-semibold">{planName}</h3>
      </div>

      <div className="mb-1">
        <span className="font-bold text-2xl">&euro;{displayPrice.toFixed(0)}</span>
        <span className="text-muted-foreground">
          {t("entity-billing-page.pricing.per-month", { defaultValue: "/mo" })}
        </span>
      </div>

      {isYearly && (
        <p className="mb-1 text-muted-foreground text-xs">
          &euro;{yearlyTotal.toFixed(0)}{" "}
          {t("entity-billing-page.paywall.billed-yearly", { defaultValue: "billed yearly" })}
        </p>
      )}

      <p className="mb-4 text-muted-foreground text-sm">{planDescription}</p>

      <ul className="mb-4 flex-1 space-y-2">
        {featureItems.map((featureText) => (
          <li key={featureText} className={`flex items-start gap-2 text-sm`}>
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            {featureText}
          </li>
        ))}
      </ul>

      <Button
        variant={isCurrentPlan ? "outline" : isRecommended ? "default" : "secondary"}
        className="w-full"
        disabled={isCurrentPlan || isDisabled}
        onClick={onSelect}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isCurrentPlan
          ? t("entity-billing-page.plans.current", { defaultValue: "Current" })
          : isLoading
            ? t("entity-billing-page.paywall.redirecting", { defaultValue: "Redirecting..." })
            : t("entity-billing-page.paywall.get-plan", {
                plan: planName,
                defaultValue: "Choose {{plan}}",
              })}
      </Button>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function PlanIcon({ slug }: { slug: string }) {
  switch (slug) {
    case "simple":
      return <Sparkles className="h-5 w-5 text-blue-500" />;
    case "advanced":
      return <Crown className="h-5 w-5 text-amber-500" />;
    case "pro":
      return <Zap className="h-5 w-5 text-primary" />;
    default:
      return <Zap className="h-5 w-5 text-muted-foreground" />;
  }
}

function getFeatureDisplayName(feature: GatedFeature, t: ReturnType<typeof createUpgradeTranslation>): string {
  const defaultNames: Record<GatedFeature, string> = {
    furs: "FURS Fiscalization",
    fina: "FINA Fiscalization",
    eslog: "eSlog Export",
    recurring: "Recurring Invoices",
    email_sending: "Email Sending",
    financial_categories: "Categories",
    business_units: "Units / Brands",
    custom_templates: "Custom Templates",
    api_access: "API Access",
    webhooks: "Webhooks",
    priority_support: "Priority Support",
    e_invoicing: "E-Invoicing",
  };

  return t(`wl-subscription.locked-feature.features.${feature}`, {
    defaultValue: defaultNames[feature] || feature,
  });
}

function getPlanFeatures(
  slug: string,
  highlightFeature: GatedFeature | undefined,
  t: ReturnType<typeof createUpgradeTranslation>,
): string[] {
  const featureKeysByPlan: Record<string, string[]> = {
    simple: ["simple.estimates-and-delivery-notes", "simple.email-sending", "simple.users", "simple.templates"],
    advanced: [
      "advanced.fiscalization",
      "advanced.e-invoicing",
      "advanced.financial-categories",
      "advanced.business-units",
      "advanced.recurring",
      "advanced.email-sending",
      "advanced.priority-support",
      "advanced.users",
    ],
    pro: [
      "pro.connected-store",
      "pro.extra-stores",
      "pro.integrations",
      "pro.financial-categories",
      "pro.business-units",
      "pro.api-and-webhooks",
      "pro.custom-templates",
      "pro.overage",
    ],
  };

  const featureDefaults: Record<string, string> = {
    "simple.estimates-and-delivery-notes": "Unlimited estimates and delivery notes",
    "simple.email-sending": "Email sending",
    "simple.users": "1 user",
    "simple.templates": "Clean invoice templates",
    "advanced.fiscalization": "FURS and FINA fiscalization",
    "advanced.e-invoicing": "eSlog and Peppol e-invoicing",
    "advanced.financial-categories": "Financial categories and revenue reporting",
    "advanced.business-units": "Units / Brands",
    "advanced.recurring": "Recurring invoices",
    "advanced.email-sending": "Email sending",
    "advanced.priority-support": "Priority support",
    "advanced.users": "3 users",
    "pro.connected-store": "1 connected store included",
    "pro.extra-stores": "Extra stores at €5.99/month",
    "pro.integrations": "Shopify and WooCommerce integrations",
    "pro.financial-categories": "Financial categories and revenue reporting",
    "pro.business-units": "Units / Brands",
    "pro.api-and-webhooks": "API access and webhooks",
    "pro.custom-templates": "Custom templates",
    "pro.overage": "Overage billed at €0.01/invoice",
  };

  const features = (featureKeysByPlan[slug] ?? []).map((featureKey) =>
    t(`entity-billing-page.paywall.features.${featureKey}`, {
      defaultValue: featureDefaults[featureKey] ?? featureKey,
    }),
  );
  if (highlightFeature) {
    const featureLabel = getFeatureDisplayName(highlightFeature, t);
    if (!features.includes(featureLabel) && planSupportsFeature(slug, highlightFeature)) {
      features.unshift(featureLabel);
    }
  }

  return features;
}

function planSupportsFeature(slug: string, feature: GatedFeature) {
  if (slug === "pro") return true;
  if (slug === "advanced") {
    return !["custom_templates", "api_access", "webhooks"].includes(feature);
  }
  return false;
}
