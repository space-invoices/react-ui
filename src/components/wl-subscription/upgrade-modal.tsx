import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

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
};

/**
 * UpgradeModal component
 *
 * Shows available plans and allows users to upgrade their subscription.
 * Highlights the feature that triggered the modal and which plans include it.
 * Includes monthly/yearly toggle for white-label pricing.
 */
export function UpgradeModal({ isOpen, onClose, feature, onUpgrade }: UpgradeModalProps) {
  const { plan: currentPlan, availablePlans, createCheckout } = useWLSubscription();
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  // Sort plans by display order
  const sortedPlans = [...availablePlans].sort((a, b) => a.display_order - b.display_order);

  // Find the minimum plan that includes the requested feature
  const minimumPlanForFeature = feature
    ? sortedPlans.find((p) => p.features.length === 0 || p.features.includes(feature))
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
      setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsRedirecting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {feature
              ? `Unlock ${getFeatureDisplayName(feature)} and more with an upgraded plan.`
              : "Get access to more features and higher limits."}
          </DialogDescription>
        </DialogHeader>

        {/* Monthly/Yearly toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>Yearly</span>
          {isYearly && (
            <Badge variant="secondary" className="ml-1">
              2 months free
            </Badge>
          )}
        </div>

        {checkoutError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{checkoutError}</p>
        )}

        <div className="grid gap-4 py-4 md:grid-cols-2">
          {sortedPlans
            .filter((p) => !p.is_free)
            .map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
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

        {sortedPlans.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No upgrade plans available. Contact support for more information.
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
};

function PlanCard({
  plan,
  isYearly,
  isCurrentPlan,
  isRecommended,
  highlightFeature,
  isLoading,
  isDisabled,
  onSelect,
}: PlanCardProps) {
  const monthlyPrice = plan.base_price_cents ? plan.base_price_cents / 100 : 0;
  const annualPriceCents = plan.limits?.annual_price_cents;
  const yearlyTotal =
    annualPriceCents != null ? annualPriceCents / 100 : Math.round(monthlyPrice * 12 * 0.8 * 100) / 100;
  const yearlyMonthly = Math.round((yearlyTotal / 12) * 100) / 100;

  const displayPrice = isYearly ? yearlyMonthly : monthlyPrice;
  const documentsLimit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month ?? "Unlimited";

  return (
    <div
      className={`relative flex flex-col rounded-lg border p-4 ${
        isRecommended ? "border-primary ring-2 ring-primary" : "border-border"
      } ${isCurrentPlan ? "bg-muted/50" : ""}`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
          Recommended
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <PlanIcon slug={plan.slug} />
        <h3 className="font-semibold">{plan.name}</h3>
      </div>

      <div className="mb-1">
        <span className="font-bold text-2xl">&euro;{displayPrice.toFixed(0)}</span>
        <span className="text-muted-foreground">/mo</span>
      </div>

      {isYearly && <p className="mb-1 text-muted-foreground text-xs">&euro;{yearlyTotal.toFixed(0)} billed yearly</p>}

      <p className="mb-4 text-muted-foreground text-sm">{documentsLimit} invoices/month</p>

      <ul className="mb-4 flex-1 space-y-2">
        {getPlanFeatures(plan.slug).map((featureText) => (
          <li
            key={featureText}
            className={`flex items-center gap-2 text-sm ${
              highlightFeature && featureText.toLowerCase().includes(highlightFeature.replace("_", " "))
                ? "font-medium text-primary"
                : ""
            }`}
          >
            <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
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
        {isCurrentPlan ? "Current Plan" : isLoading ? "Redirecting..." : `Upgrade to ${plan.name}`}
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

function getFeatureDisplayName(feature: GatedFeature): string {
  const names: Record<GatedFeature, string> = {
    furs: "FURS Fiscalization",
    fina: "FINA Fiscalization",
    eslog: "eSlog Export",
    recurring: "Recurring Invoices",
    email_sending: "Email Sending",
    business_units: "Units / Brands",
    custom_templates: "Custom Templates",
    api_access: "API Access",
    webhooks: "Webhooks",
    priority_support: "Priority Support",
    e_invoicing: "E-Invoicing",
  };
  return names[feature] || feature;
}

function getPlanFeatures(slug: string): string[] {
  switch (slug) {
    case "simple":
      return [
        "15 invoices per month",
        "Unlimited estimates and delivery notes",
        "Email sending",
        "1 user",
        "Clean invoice templates",
      ];
    case "advanced":
      return [
        "500 invoices per month",
        "FURS and FINA fiscalization",
        "eSlog and Peppol e-invoicing",
        "Recurring invoices",
        "Email sending",
        "Priority support",
        "3 users",
      ];
    case "pro":
      return [
        "1,000 invoices per month",
        "1 connected store included",
        "Extra stores at €5.99/month",
        "Shopify and WooCommerce integrations",
        "API access and webhooks",
        "Custom templates",
        "Overage billed at €0.01/invoice",
      ];
    default:
      return [];
  }
}
