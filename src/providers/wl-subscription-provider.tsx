import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useEntitiesOptional } from "./entities-context";
import { useAccessToken } from "./sdk-provider";

// ============================================
// TYPES
// ============================================

export type PlanLimits = {
  documents_per_month: number | null;
  invoices_per_month: number | null;
  overage_price_cents: number | null;
} | null;

export type WhiteLabelPlan = {
  id: string;
  slug: string;
  name: string;
  billing_interval: string | null;
  base_price_cents: number | null;
  limits: PlanLimits;
  features: string[];
  is_free: boolean;
  display_order: number;
};

export type UsageStats = {
  documents_count: number;
  documents_limit: number | null;
  invoices_count: number;
  invoices_limit: number | null;
  period_start: string;
  period_end: string;
};

export type CurrentSubscription = {
  plan: WhiteLabelPlan;
  status: string;
  billing_interval: string | null;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  cancel_at: string | null;
  payment_method: {
    last4: string | null;
    brand: string | null;
    has_card: boolean;
  } | null;
  usage: UsageStats;
};

// Known gated features for Apollo
export type GatedFeature =
  | "furs"
  | "fina"
  | "eslog"
  | "recurring"
  | "email_sending"
  | "custom_templates"
  | "api_access"
  | "webhooks"
  | "priority_support"
  | "e_invoicing";

// ============================================
// CONTEXT
// ============================================

type WLSubscriptionContextType = {
  subscription: CurrentSubscription | null;
  plan: WhiteLabelPlan | null;
  usage: UsageStats | null;
  availablePlans: WhiteLabelPlan[];
  isLoading: boolean;
  error: string | null;

  // Trial state
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  needsPayment: boolean;

  // Feature/limit checks
  hasFeature: (feature: GatedFeature | string) => boolean;
  isOverLimit: (resource: "documents") => boolean;
  getUsagePercentage: (resource: "documents") => number;

  // Actions
  createCheckout: (planSlug: string, billingInterval?: "monthly" | "yearly") => Promise<string>;
  refresh: () => Promise<void>;
};

const WLSubscriptionContext = createContext<WLSubscriptionContextType | undefined>(undefined);

WLSubscriptionContext.displayName = "WLSubscriptionContext";

// ============================================
// DEFAULT STATE
// ============================================

// Default subscription (unlimited, all features) for non-WL users
const DEFAULT_SUBSCRIPTION: CurrentSubscription = {
  plan: {
    id: "unlimited",
    slug: "unlimited",
    name: "Unlimited",
    billing_interval: null,
    base_price_cents: null,
    limits: null,
    features: [], // Empty = all features
    is_free: true,
    display_order: 0,
  },
  status: "active",
  billing_interval: null,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date().toISOString(),
  trial_ends_at: null,
  trial_days_remaining: null,
  cancel_at: null,
  payment_method: {
    last4: null,
    brand: null,
    has_card: false,
  },
  usage: {
    documents_count: 0,
    documents_limit: null,
    invoices_count: 0,
    invoices_limit: null,
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
  },
};

// ============================================
// PROVIDER
// ============================================

type WLSubscriptionProviderProps = {
  children: ReactNode;
  /** API base URL (required for authenticated requests) */
  apiBaseUrl: string;
};

/**
 * WLSubscriptionProvider component
 * Fetches white-label subscription data and provides limit/feature checks.
 * Must be nested inside EntitiesProvider and SDKProvider.
 */
export function WLSubscriptionProvider({ children, apiBaseUrl }: WLSubscriptionProviderProps) {
  // Get entity and access token from existing context
  const entitiesContext = useEntitiesOptional();
  const accessToken = useAccessToken();

  const entityId = entitiesContext?.activeEntity?.id ?? null;
  const [subscription, setSubscription] = useState<CurrentSubscription>(DEFAULT_SUBSCRIPTION);
  const [availablePlans, setAvailablePlans] = useState<WhiteLabelPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!entityId || !accessToken) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setAvailablePlans([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "x-entity-id": entityId,
        "Content-Type": "application/json",
      };

      // Fetch current subscription
      const subResponse = await fetch(`${apiBaseUrl}/white-label-subscriptions`, { headers });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      } else if (subResponse.status === 404) {
        // No WL subscription = use default (unlimited)
        setSubscription(DEFAULT_SUBSCRIPTION);
      } else {
        throw new Error(`Failed to fetch subscription: ${subResponse.status}`);
      }

      // Fetch available plans
      const plansResponse = await fetch(`${apiBaseUrl}/white-label-subscriptions/plans`, {
        headers,
      });

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setAvailablePlans(plansData.plans || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subscription");
      setSubscription(DEFAULT_SUBSCRIPTION);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, entityId, accessToken]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if feature is available on current plan
  const hasFeature = useCallback(
    (feature: GatedFeature | string): boolean => {
      const plan = subscription.plan;

      // Empty features array = all features included
      if (plan.features.length === 0) {
        return true;
      }

      return plan.features.includes(feature);
    },
    [subscription],
  );

  // Check if over document limit
  const isOverLimit = useCallback(
    (resource: "documents"): boolean => {
      if (resource !== "documents") return false;

      const { usage, plan } = subscription;
      const limit = plan.limits?.documents_per_month;

      if (limit === null || limit === undefined) {
        return false; // No limit = never over
      }

      return usage.documents_count >= limit;
    },
    [subscription],
  );

  // Get usage percentage for resource
  const getUsagePercentage = useCallback(
    (resource: "documents"): number => {
      if (resource !== "documents") return 0;

      const { usage, plan } = subscription;
      const limit = plan.limits?.documents_per_month;

      if (limit === null || limit === undefined || limit === 0) {
        return 0; // No limit = 0%
      }

      return Math.min(100, Math.round((usage.documents_count / limit) * 100));
    },
    [subscription],
  );

  // Return the in-app billing page URL for plan activation.
  const createCheckout = useCallback(
    async (planSlug: string, billingInterval: "monthly" | "yearly" = "monthly"): Promise<string> => {
      if (!entityId || !accessToken) {
        throw new Error("Not authenticated");
      }

      const url = new URL(`/app/${entityId}/settings/billing`, window.location.origin);
      url.searchParams.set("plan", planSlug);
      url.searchParams.set("interval", billingInterval);
      return url.toString();
    },
    [entityId, accessToken],
  );

  // Compute trial state
  const isTrialActive =
    subscription.status === "trialing" &&
    subscription.trial_ends_at != null &&
    new Date(subscription.trial_ends_at) > new Date();

  const isTrialExpiredState =
    subscription.status === "trialing" &&
    subscription.trial_ends_at != null &&
    new Date(subscription.trial_ends_at) <= new Date();

  const trialDaysRemaining = subscription.trial_days_remaining;

  // needsPayment: trial expired, or no free plan and no active Stripe subscription
  const needsPayment =
    isTrialExpiredState ||
    (subscription.status === "active" &&
      !subscription.plan.is_free &&
      subscription.billing_interval === null &&
      subscription.plan.slug !== "unlimited");

  const value = useMemo(
    () => ({
      subscription,
      plan: subscription.plan,
      usage: subscription.usage,
      availablePlans,
      isLoading,
      error,
      isTrialActive,
      isTrialExpired: isTrialExpiredState,
      trialDaysRemaining,
      needsPayment,
      hasFeature,
      isOverLimit,
      getUsagePercentage,
      createCheckout,
      refresh: fetchSubscription,
    }),
    [
      subscription,
      availablePlans,
      isLoading,
      error,
      isTrialActive,
      isTrialExpiredState,
      trialDaysRemaining,
      needsPayment,
      hasFeature,
      isOverLimit,
      getUsagePercentage,
      createCheckout,
      fetchSubscription,
    ],
  );

  return <WLSubscriptionContext.Provider value={value}>{children}</WLSubscriptionContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access the white-label subscription context
 * @throws Error if used outside of WLSubscriptionProvider
 */
export function useWLSubscription() {
  const context = useContext(WLSubscriptionContext);

  if (context === undefined) {
    throw new Error("useWLSubscription must be used within a WLSubscriptionProvider");
  }

  return context;
}

/**
 * Optional hook that returns null if not in WLSubscriptionProvider
 * Useful for components that may be used with or without subscription context
 */
export function useWLSubscriptionOptional() {
  return useContext(WLSubscriptionContext) ?? null;
}
