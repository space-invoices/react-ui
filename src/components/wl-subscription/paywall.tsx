import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { useWLSubscription, type WhiteLabelPlan } from "../../providers/wl-subscription-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";

/**
 * Paywall component
 *
 * Shown when `needsPayment` is true — either after trial expiry
 * or for paid-only configs with no active subscription.
 * Displays plan cards with monthly/yearly toggle and checkout buttons.
 */
export function Paywall() {
  const { isTrialExpired, availablePlans, createCheckout } = useWLSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Only show paid plans
  const paidPlans = [...availablePlans].filter((p) => !p.is_free).sort((a, b) => a.display_order - b.display_order);

  const handleCheckout = async (planSlug: string) => {
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="mb-2 font-bold text-3xl tracking-tight">
          {isTrialExpired ? "Your trial has expired" : "Choose a plan to get started"}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {isTrialExpired
            ? "Subscribe to a plan to continue using all features."
            : "Pick the plan that works best for your business."}
        </p>

        {/* Monthly/Yearly toggle */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>Yearly</span>
          {isYearly && (
            <Badge variant="secondary" className="ml-1">
              Save 20%
            </Badge>
          )}
        </div>

        {checkoutError && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{checkoutError}</p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {paidPlans.map((plan, index) => (
            <PaywallPlanCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isPopular={index === paidPlans.length - 1}
              isLoading={isRedirecting === plan.slug}
              isDisabled={isRedirecting !== null}
              onSelect={() => handleCheckout(plan.slug)}
            />
          ))}
        </div>

        {paidPlans.length === 0 && (
          <p className="py-8 text-muted-foreground">No plans available. Contact support for more information.</p>
        )}
      </div>
    </div>
  );
}

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
};

function PaywallPlanCard({ plan, isYearly, isPopular, isLoading, isDisabled, onSelect }: PaywallPlanCardProps) {
  const monthlyPrice = plan.base_price_cents ? plan.base_price_cents / 100 : 0;
  const yearlyTotal = Math.round(monthlyPrice * 12 * 0.8 * 100) / 100;
  const yearlyMonthly = Math.round((yearlyTotal / 12) * 100) / 100;

  const displayPrice = isYearly ? yearlyMonthly : monthlyPrice;
  const documentsLimit = plan.limits?.documents_per_month ?? "Unlimited";

  return (
    <Card className={`relative flex flex-col ${isPopular ? "border-primary ring-2 ring-primary" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PaywallPlanIcon slug={plan.slug} />
          <CardTitle className="text-xl">{plan.name}</CardTitle>
        </div>
        <CardDescription>{documentsLimit} documents/month</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-4">
          <span className="font-bold text-4xl">&euro;{displayPrice.toFixed(0)}</span>
          <span className="text-muted-foreground">/mo</span>
          {isYearly && (
            <p className="mt-1 text-muted-foreground text-sm">&euro;{yearlyTotal.toFixed(0)} billed yearly</p>
          )}
        </div>

        <ul className="space-y-2">
          {getPaywallFeatures(plan.slug).map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={isPopular ? "default" : "outline"} disabled={isDisabled} onClick={onSelect}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Redirecting..." : `Get ${plan.name}`}
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
    case "basic":
      return <Zap className="h-5 w-5 text-blue-500" />;
    case "advanced":
      return <Crown className="h-5 w-5 text-amber-500" />;
    default:
      return <Sparkles className="h-5 w-5 text-primary" />;
  }
}

function getPaywallFeatures(slug: string): string[] {
  switch (slug) {
    case "basic":
      return [
        "Invoices & estimates",
        "Customer management",
        "PDF export",
        "FURS fiscalization",
        "eSlog export",
        "Recurring invoices",
        "Email sending",
      ];
    case "advanced":
      return [
        "Everything in Basic",
        "All features unlocked",
        "Custom templates",
        "API access",
        "Webhooks",
        "Priority support",
        "Overage billing (pay per doc)",
      ];
    default:
      return [];
  }
}
