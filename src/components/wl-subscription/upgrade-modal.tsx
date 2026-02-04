import { Check, Crown, Sparkles, Zap } from "lucide-react";

import { type GatedFeature, useWLSubscription, type WhiteLabelPlan } from "../../providers/wl-subscription-provider";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

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
 */
export function UpgradeModal({ isOpen, onClose, feature, onUpgrade }: UpgradeModalProps) {
  const { plan: currentPlan, availablePlans } = useWLSubscription();

  // Sort plans by display order
  const sortedPlans = [...availablePlans].sort((a, b) => a.display_order - b.display_order);

  // Find the minimum plan that includes the requested feature
  const minimumPlanForFeature = feature
    ? sortedPlans.find((p) => p.features.length === 0 || p.features.includes(feature))
    : null;

  const handleUpgrade = (planSlug: string) => {
    if (onUpgrade) {
      onUpgrade(planSlug);
    }
    // In the future, this would redirect to Stripe Checkout
    // For now, just close the modal
    onClose();
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

        <div className="grid gap-4 py-4 md:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={plan.slug === currentPlan?.slug}
              isRecommended={minimumPlanForFeature?.slug === plan.slug}
              highlightFeature={feature}
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
  isCurrentPlan: boolean;
  isRecommended: boolean;
  highlightFeature?: GatedFeature;
  onSelect: () => void;
};

function PlanCard({ plan, isCurrentPlan, isRecommended, highlightFeature, onSelect }: PlanCardProps) {
  const priceDisplay = plan.is_free
    ? "Free"
    : plan.base_price_cents
      ? `${(plan.base_price_cents / 100).toFixed(0)}/${plan.billing_interval === "yearly" ? "yr" : "mo"}`
      : "Contact us";

  const documentsLimit = plan.limits?.documents_per_month ?? "Unlimited";

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

      <div className="mb-1 font-bold text-2xl">
        {plan.is_free ? "" : "€"}
        {priceDisplay}
      </div>

      <p className="mb-4 text-muted-foreground text-sm">{documentsLimit} documents/month</p>

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
        disabled={isCurrentPlan}
        onClick={onSelect}
      >
        {isCurrentPlan ? "Current Plan" : `Upgrade to ${plan.name}`}
      </Button>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function PlanIcon({ slug }: { slug: string }) {
  switch (slug) {
    case "free":
      return <Zap className="h-5 w-5 text-muted-foreground" />;
    case "starter":
      return <Sparkles className="h-5 w-5 text-blue-500" />;
    case "advanced":
      return <Crown className="h-5 w-5 text-amber-500" />;
    default:
      return <Zap className="h-5 w-5 text-muted-foreground" />;
  }
}

function getFeatureDisplayName(feature: GatedFeature): string {
  const names: Record<GatedFeature, string> = {
    furs: "FURS Fiscalization",
    eslog: "eSlog Export",
    recurring: "Recurring Invoices",
    email_sending: "Email Sending",
    custom_templates: "Custom Templates",
    api_access: "API Access",
    webhooks: "Webhooks",
    priority_support: "Priority Support",
  };
  return names[feature] || feature;
}

function getPlanFeatures(slug: string): string[] {
  switch (slug) {
    case "free":
      return ["Basic invoicing", "Estimates & quotes", "Customer management", "PDF export"];
    case "starter":
      return [
        "Everything in Free",
        "FURS fiscalization",
        "eSlog export",
        "Recurring invoices",
        "Email sending",
        "100 docs/month",
      ];
    case "advanced":
      return [
        "Everything in Starter",
        "Custom templates",
        "API access",
        "Webhooks",
        "Priority support",
        "2,500 docs/month",
      ];
    default:
      return [];
  }
}
