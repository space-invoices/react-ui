import { getClientHeaders } from "@spaceinvoices/js-sdk";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useEntitiesOptional } from "./entities-context";
import { useAccessToken } from "./space-invoices-provider";
import { useWhiteLabel } from "./white-label-provider";

// ============================================
// TYPES
// ============================================

export type PlanLimits = {
  documents_per_month: number | null;
  invoices_per_month: number | null;
  overage_price_cents: number | null;
  annual_price_cents: number | null;
  included_store_count: number | null;
  extra_store_price_cents: number | null;
  extra_store_annual_price_cents: number | null;
  extra_store_invoices_per_month: number | null;
} | null;

export type StoreBilling = {
  connected_stores: number;
  included_stores: number;
  billable_extra_stores: number;
  invoices_included_from_extra_stores: number;
  extra_store_price_cents_monthly: number | null;
  extra_store_price_cents_yearly: number | null;
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
  payment_provider: "stripe" | "paypal" | "bank" | "braintree";
  bank_reference: string | null;
  billing_email: string | null;
  coupon_code: string | null;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  cancel_at: string | null;
  scheduled_change: {
    plan: WhiteLabelPlan;
    billing_interval: string | null;
    effective_at: string;
  } | null;
  payment_method: {
    last4: string | null;
    brand: string | null;
    has_card: boolean;
  } | null;
  store_billing: StoreBilling;
  usage: UsageStats;
};

// Known gated features for Apollo
export type GatedFeature =
  | "furs"
  | "fina"
  | "eslog"
  | "recurring"
  | "email_sending"
  | "business_units"
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
  createSetupIntent: () => Promise<{ client_secret: string }>;
  savePaymentMethod: (paymentMethodId: string) => Promise<void>;
  activateSubscription: (
    planSlug: string,
    billingInterval: "monthly" | "yearly",
    couponCode?: string | null,
  ) => Promise<{ invoice_id?: string | null; scheduled?: boolean }>;
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
  payment_provider: "stripe",
  bank_reference: null,
  billing_email: null,
  coupon_code: null,
  trial_ends_at: null,
  trial_days_remaining: null,
  cancel_at: null,
  scheduled_change: null,
  payment_method: {
    last4: null,
    brand: null,
    has_card: false,
  },
  store_billing: null,
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
 * Must be nested inside SpaceInvoicesProvider and an entity source.
 */
export function WLSubscriptionProvider({ children, apiBaseUrl }: WLSubscriptionProviderProps) {
  // Get entity and access token from existing context
  const entitiesContext = useEntitiesOptional();
  const accessToken = useAccessToken();
  const whiteLabel = useWhiteLabel();

  const entityId = entitiesContext?.activeEntity?.id ?? null;
  const [subscription, setSubscription] = useState<CurrentSubscription>(DEFAULT_SUBSCRIPTION);
  const [availablePlans, setAvailablePlans] = useState<WhiteLabelPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (whiteLabel.isLoading) {
      setIsLoading(true);
      return;
    }

    if (whiteLabel.slug === "space-invoices" || !entityId || !accessToken) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setAvailablePlans([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "x-entity-id": entityId,
        ...getClientHeaders("ui"),
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
  }, [apiBaseUrl, entityId, accessToken, whiteLabel.isLoading, whiteLabel.slug]);

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
      const limit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
      const count = plan.limits?.invoices_per_month != null ? usage.invoices_count : usage.documents_count;

      if (limit === null || limit === undefined) {
        return false; // No limit = never over
      }

      return count >= limit;
    },
    [subscription],
  );

  // Get usage percentage for resource
  const getUsagePercentage = useCallback(
    (resource: "documents"): number => {
      if (resource !== "documents") return 0;

      const { usage, plan } = subscription;
      const limit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
      const count = plan.limits?.invoices_per_month != null ? usage.invoices_count : usage.documents_count;

      if (limit === null || limit === undefined || limit === 0) {
        return 0; // No limit = 0%
      }

      return Math.min(100, Math.round((count / limit) * 100));
    },
    [subscription],
  );

  // Return the in-app billing page URL for plan activation.
  const createCheckout = useCallback(
    async (planSlug: string, billingInterval: "monthly" | "yearly" = "monthly"): Promise<string> => {
      if (!entityId || !accessToken) {
        throw new Error("Not authenticated");
      }

      const url = new URL(`/app/${entityId}/subscription`, window.location.origin);
      if (entitiesContext?.environment === "sandbox") {
        url.searchParams.set("env", "sandbox");
      }
      url.searchParams.set("plan", planSlug);
      url.searchParams.set("interval", billingInterval);
      return url.toString();
    },
    [entityId, accessToken, entitiesContext?.environment],
  );

  const createSetupIntent = useCallback(async (): Promise<{ client_secret: string }> => {
    if (!entityId || !accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${apiBaseUrl}/white-label-subscriptions/setup-intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-entity-id": entityId,
        ...getClientHeaders("ui"),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create setup intent: ${response.status}`);
    }

    return response.json();
  }, [apiBaseUrl, entityId, accessToken]);

  const savePaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<void> => {
      if (!entityId || !accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${apiBaseUrl}/white-label-subscriptions/payment-method`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-entity-id": entityId,
          ...getClientHeaders("ui"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save payment method: ${response.status}`);
      }
    },
    [apiBaseUrl, entityId, accessToken],
  );

  const activateSubscription = useCallback(
    async (
      planSlug: string,
      billingInterval: "monthly" | "yearly",
      couponCode?: string | null,
    ): Promise<{ invoice_id?: string | null; scheduled?: boolean }> => {
      if (!entityId || !accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${apiBaseUrl}/white-label-subscriptions/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-entity-id": entityId,
          ...getClientHeaders("ui"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_slug: planSlug,
          billing_interval: billingInterval,
          ...(couponCode !== undefined ? { coupon_code: couponCode } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to activate subscription: ${response.status}`);
      }

      return response.json();
    },
    [apiBaseUrl, entityId, accessToken],
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
      createSetupIntent,
      savePaymentMethod,
      activateSubscription,
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
      createSetupIntent,
      savePaymentMethod,
      activateSubscription,
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
