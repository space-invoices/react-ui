import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useWLSubscription, type WhiteLabelPlan } from "../../providers/wl-subscription-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";

type TranslateValues = Record<string, string | number>;

function interpolateTranslation(template: string, values?: TranslateValues) {
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function createPaywallTranslation({ t, namespace, locale, translationLocale }: ComponentTranslationProps) {
  const fallbackTranslation = createTranslation({ t, namespace, locale, translationLocale });

  return (key: string, options?: { defaultValue?: string } & TranslateValues) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;

    if (t) {
      const translated = (t as (key: string, options?: Record<string, unknown>) => string)(fullKey, options);
      if (translated !== fullKey && translated !== key) {
        return translated;
      }
    }

    const fallback = fallbackTranslation(key);
    if (fallback !== key) {
      return interpolateTranslation(fallback, options);
    }

    return options?.defaultValue ? interpolateTranslation(options.defaultValue, options) : fallback;
  };
}

function getPaywallFeatureKeys(slug: string): string[] {
  switch (slug) {
    case "simple":
      return ["simple.estimates-and-delivery-notes", "simple.email-sending", "simple.users", "simple.templates"];
    case "advanced":
      return [
        "advanced.fiscalization",
        "advanced.e-invoicing",
        "advanced.recurring",
        "advanced.email-sending",
        "advanced.priority-support",
        "advanced.users",
      ];
    case "pro":
      return [
        "pro.connected-store",
        "pro.extra-stores",
        "pro.integrations",
        "pro.api-and-webhooks",
        "pro.custom-templates",
        "pro.overage",
      ];
    default:
      return [];
  }
}

/**
 * Paywall component
 *
 * Shown when `needsPayment` is true — either after trial expiry
 * or for paid-only configs with no active subscription.
 * Displays plan cards with monthly/yearly toggle and checkout buttons.
 */
export function Paywall({ t: translateFn, namespace, locale, translationLocale, onCheckoutRequested }: PaywallProps) {
  const t = createPaywallTranslation({ t: translateFn, namespace, locale, translationLocale });
  const { subscription, isTrialExpired, availablePlans, createCheckout } = useWLSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Only show paid plans
  const paidPlans = [...availablePlans].filter((p) => !p.is_free).sort((a, b) => a.display_order - b.display_order);
  const popularPlanIndex = paidPlans.length > 0 ? Math.ceil(paidPlans.length / 2) - 1 : -1;

  const handleCheckout = async (planSlug: string) => {
    try {
      setIsRedirecting(planSlug);
      setCheckoutError(null);
      const billingInterval = isYearly ? "yearly" : "monthly";
      const checkoutUrl = await createCheckout(planSlug, billingInterval);
      const handled = await onCheckoutRequested?.({
        planSlug,
        billingInterval,
        checkoutUrl,
        needsCard: !subscription?.payment_method?.has_card,
      });
      if (handled) {
        setIsRedirecting(null);
        return;
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t("entity-billing-page.paywall.checkout-failed"));
      setIsRedirecting(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-center px-4 py-6 lg:py-8">
      <div className="mx-auto w-full max-w-5xl text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary/80" />
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">
          {isTrialExpired
            ? t("entity-billing-page.paywall.title.expired")
            : t("entity-billing-page.paywall.title.choose")}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-foreground/70 text-sm">
          {isTrialExpired
            ? t("entity-billing-page.paywall.description.expired")
            : t("entity-billing-page.paywall.description.choose")}
        </p>

        {/* Monthly/Yearly toggle */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!isYearly ? "font-medium text-foreground" : "text-foreground/70"}`}>
            {t("entity-billing-page.plans.monthly")}
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? "font-medium text-foreground" : "text-foreground/70"}`}>
            {t("entity-billing-page.plans.yearly")}
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-1">
              {t("entity-billing-page.paywall.yearly-discount")}
            </Badge>
          )}
        </div>

        {checkoutError && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{checkoutError}</p>
        )}

        <div className="grid gap-6 pt-3 lg:grid-cols-3">
          {paidPlans.map((plan, index) => (
            <PaywallPlanCard
              key={plan.id}
              plan={plan}
              t={translateFn}
              namespace={namespace}
              locale={locale}
              translationLocale={translationLocale}
              isYearly={isYearly}
              isPopular={index === popularPlanIndex}
              isLoading={isRedirecting === plan.slug}
              isDisabled={isRedirecting !== null}
              onSelect={() => handleCheckout(plan.slug)}
            />
          ))}
        </div>

        {paidPlans.length === 0 && (
          <p className="py-8 text-foreground/70 text-sm">{t("entity-billing-page.paywall.no-plans")}</p>
        )}
      </div>
    </div>
  );
}

type PaywallProps = ComponentTranslationProps & {
  onCheckoutRequested?: (selection: {
    planSlug: string;
    billingInterval: "monthly" | "yearly";
    checkoutUrl: string;
    needsCard: boolean;
  }) => boolean | Promise<boolean>;
};

// ============================================
// PLAN CARD
// ============================================

type PaywallPlanCardProps = {
  plan: WhiteLabelPlan;
  isYearly: boolean;
  isPopular: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  onSelect: () => void;
} & ComponentTranslationProps;

function PaywallPlanCard({
  plan,
  isYearly,
  isPopular,
  isLoading,
  isDisabled,
  onSelect,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: PaywallPlanCardProps) {
  const t = createPaywallTranslation({ t: translateFn, namespace, locale, translationLocale });
  const monthlyPrice = plan.base_price_cents ? plan.base_price_cents / 100 : 0;
  const annualPriceCents = plan.limits?.annual_price_cents;
  const yearlyTotal =
    annualPriceCents != null ? annualPriceCents / 100 : Math.round(monthlyPrice * 12 * 0.8 * 100) / 100;
  const yearlyMonthly = Math.round((yearlyTotal / 12) * 100) / 100;

  const displayPrice = isYearly ? yearlyMonthly : monthlyPrice;
  const planName = t(`entity-billing-page.plan-names.${plan.slug}`, { defaultValue: plan.name });
  const invoiceLimit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
  const includedStores = plan.limits?.included_store_count ?? null;
  let planDescription = t("entity-billing-page.plan-description.unlimited");

  if (invoiceLimit != null && includedStores != null) {
    planDescription = t("entity-billing-page.plan-description.invoices-and-stores", {
      invoices: invoiceLimit,
      stores: includedStores,
    });
  } else if (invoiceLimit != null) {
    planDescription = t("entity-billing-page.plan-description.invoices-only", { invoices: invoiceLimit });
  } else if (includedStores != null) {
    planDescription = t("entity-billing-page.plan-description.stores-only", { stores: includedStores });
  }
  const featureItems = getPaywallFeatureKeys(plan.slug).map((featureKey) =>
    t(`entity-billing-page.paywall.features.${featureKey}`),
  );

  return (
    <Card
      className={`relative flex h-full flex-col overflow-visible text-left ${
        isPopular ? "border-primary ring-2 ring-primary" : ""
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">{t("entity-billing-page.paywall.popular")}</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PaywallPlanIcon slug={plan.slug} />
          <CardTitle className="font-semibold text-lg">{planName}</CardTitle>
        </div>
        <CardDescription className="text-foreground/70 text-sm">{planDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <div>
            <span className="font-semibold text-3xl">&euro;{displayPrice.toFixed(2)}</span>
            <span className="text-foreground/70 text-sm">{t("entity-billing-page.pricing.per-month")}</span>
          </div>
          {isYearly ? (
            <p className="text-foreground/70 text-sm">
              &euro;{yearlyTotal.toFixed(2)} {t("entity-billing-page.paywall.billed-yearly")}
            </p>
          ) : null}

          {featureItems.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {featureItems.map((featureText) => (
                <li key={featureText} className="flex items-start gap-2 text-foreground/80 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{featureText}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={isPopular ? "default" : "outline"} disabled={isDisabled} onClick={onSelect}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading
            ? t("entity-billing-page.paywall.redirecting")
            : t("entity-billing-page.paywall.get-plan", { plan: planName })}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================
// HELPERS
// ============================================

function PaywallPlanIcon({ slug }: { slug: string }) {
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
