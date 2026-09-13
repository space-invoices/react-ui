import { getClientHeaders } from "@spaceinvoices/js-sdk";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  e_invoicing_sends_included: number | null;
  e_invoicing_send_price_cents: number | null;
} | null;

export type StoreBilling = {
  connected_stores: number;
  included_stores: number;
  billable_extra_stores: number;
  invoices_included_from_extra_stores: number;
  extra_store_price_cents_monthly: number | null;
  extra_store_price_cents_yearly: number | null;
} | null;

export type WLBillingCurrencyCode = "EUR" | "USD";
export type WLBillingProfile = "default" | "us_company";
export type WLPaymentProvider = "stripe" | "paypal" | "bank";
export type WLStripePublishableKeyKind = "default" | "us_company";
/**
 * Platform that owns charges, approval, and cancellation for an entity subscription outside this app.
 * Ownership is durable: it also covers entities whose external setup is incomplete or was declined.
 */
export type WLExternalBillingProvider = "shopify";

export type WhiteLabelPlan = {
  id: string;
  slug: string;
  name: string;
  billing_interval: string | null;
  base_price_cents: number | null;
  currency_code?: WLBillingCurrencyCode;
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
  e_invoicing_send_count: number;
  e_invoicing_sends_included: number | null;
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
  shopify_managed?: boolean;
  bank_reference: string | null;
  currency_code?: WLBillingCurrencyCode;
  billing_profile?: WLBillingProfile;
  allowed_payment_providers?: WLPaymentProvider[];
  stripe_publishable_key_kind?: WLStripePublishableKeyKind;
  billing_email: string | null;
  coupon_code: string | null;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  trial_started_now?: boolean;
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

/**
 * Resolve the external billing owner of a subscription. Only the API-provided ownership flag decides;
 * never infer ownership from user email, URL, or query parameters.
 */
export function getExternalBillingProvider(
  subscription: Pick<CurrentSubscription, "shopify_managed"> | null | undefined,
): WLExternalBillingProvider | null {
  return subscription?.shopify_managed === true ? "shopify" : null;
}

export function isWLSubscriptionPaymentRequired(subscription: CurrentSubscription): boolean {
  if (subscription.plan.is_free || subscription.plan.slug === "unlimited") return false;
  if (subscription.status === "trialing") return false;
  if (subscription.status !== "active") return true;
  if (subscription.billing_interval === null) return true;

  // Renewal runs daily; only its lifecycle outcome, not the clock alone, revokes access.
  return false;
}

// Known gated features for Apollo
export type GatedFeature =
  | "furs"
  | "fina"
  | "eslog"
  | "recurring"
  | "email_sending"
  | "financial_categories"
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
  /** Set when charges, approval, and cancellation happen on another platform (no in-app checkout). */
  externalBillingProvider: WLExternalBillingProvider | null;
  /**
   * True only when the published subscription, plans, and billing ownership were loaded for the
   * currently active entity. While a different entity is still loading this stays false, so purchase
   * controls must stay hidden instead of reusing the previous entity's ownership.
   */
  isExternalBillingResolved: boolean;

  // Feature/limit checks
  hasFeature: (feature: GatedFeature | string) => boolean;
  isOverLimit: (resource: "documents") => boolean;
  getUsagePercentage: (resource: "documents") => number;

  // Actions
  createCheckout: (planSlug: string, billingInterval?: "monthly" | "yearly") => Promise<string>;
  createSetupIntent: () => Promise<{ client_secret: string }>;
  savePaymentMethod: (paymentMethodId: string) => Promise<void>;
  /** Submit the exact server quote already displayed to and confirmed by the customer. */
  activateSubscription: (
    planSlug: string,
    billingInterval: "monthly" | "yearly",
    couponCode: string | null | undefined,
    activationQuoteId: string,
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
    currency_code: "EUR",
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
  currency_code: "EUR",
  billing_profile: "default",
  allowed_payment_providers: ["stripe"],
  stripe_publishable_key_kind: "default",
  billing_email: null,
  coupon_code: null,
  trial_ends_at: null,
  trial_days_remaining: null,
  trial_started_now: false,
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
    e_invoicing_send_count: 0,
    e_invoicing_sends_included: null,
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
  },
};

const EMPTY_PLANS: WhiteLabelPlan[] = [];

/**
 * Published subscription data together with the entity scope it was loaded for. Ownership, plans, and
 * purchase state are per entity, so data loaded for one entity must never be read while another
 * entity is active - not even for the moment its own response is still in flight.
 */
type LoadedSubscription = {
  /** Scope the data below belongs to; `null` until the current scope has resolved once. */
  scopeKey: string | null;
  subscription: CurrentSubscription;
  availablePlans: WhiteLabelPlan[];
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
  // Identity of the data scope: which entity, on which brand and API, the published data belongs to.
  // The access token is deliberately excluded so an ordinary token refresh keeps the loaded entity's
  // data visible instead of blanking the app.
  const dataScopeKey = `${apiBaseUrl}|${whiteLabel.slug ?? ""}|${entityId ?? ""}`;
  const [loaded, setLoaded] = useState<LoadedSubscription>({
    scopeKey: null,
    subscription: DEFAULT_SUBSCRIPTION,
    availablePlans: EMPTY_PLANS,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ownership is only known once this entity's own response has been published.
  const isExternalBillingResolved = loaded.scopeKey === dataScopeKey;
  const subscription = isExternalBillingResolved ? loaded.subscription : DEFAULT_SUBSCRIPTION;
  const availablePlans = isExternalBillingResolved ? loaded.availablePlans : EMPTY_PLANS;
  const scope = useMemo(
    () => ({ apiBaseUrl, entityId, accessToken, isLoading: whiteLabel.isLoading, slug: whiteLabel.slug }),
    [apiBaseUrl, entityId, accessToken, whiteLabel.isLoading, whiteLabel.slug],
  );
  const activeScopeRef = useRef<object | null>(scope);
  const requestRef = useRef<AbortController | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (activeScopeRef.current !== scope) return;
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    const isCurrent = () =>
      activeScopeRef.current === scope && requestRef.current === request && !request.signal.aborted;
    if (whiteLabel.isLoading) {
      setIsLoading(true);
      return;
    }

    if (whiteLabel.slug === "space-invoices" || !entityId || !accessToken) {
      setLoaded({ scopeKey: dataScopeKey, subscription: DEFAULT_SUBSCRIPTION, availablePlans: EMPTY_PLANS });
      setError(null);
      setIsLoading(false);
      return;
    }

    // A response only ever replaces data for its own entity scope; plans already loaded for that same
    // scope survive an ordinary refresh, while another entity's plans are dropped.
    const publishSubscription = (next: CurrentSubscription) =>
      setLoaded((previous) => ({
        scopeKey: dataScopeKey,
        subscription: next,
        availablePlans: previous.scopeKey === dataScopeKey ? previous.availablePlans : EMPTY_PLANS,
      }));

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
      const subResponse = await fetch(`${apiBaseUrl}/white-label-subscriptions`, { headers, signal: request.signal });
      if (!isCurrent()) return;

      if (subResponse.ok) {
        const subData = await subResponse.json();
        if (!isCurrent()) return;
        publishSubscription(subData);
      } else if (subResponse.status === 404) {
        // No WL subscription = use default (unlimited)
        publishSubscription(DEFAULT_SUBSCRIPTION);
      } else {
        throw new Error(`Failed to fetch subscription: ${subResponse.status}`);
      }

      // Fetch available plans
      const plansResponse = await fetch(`${apiBaseUrl}/white-label-subscriptions/plans`, {
        headers,
        signal: request.signal,
      });
      if (!isCurrent()) return;

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        if (!isCurrent()) return;
        // Plans belong to the same scope as the subscription published just above.
        setLoaded((previous) =>
          previous.scopeKey === dataScopeKey
            ? { ...previous, availablePlans: plansData.plans || EMPTY_PLANS }
            : previous,
        );
      }
    } catch (err) {
      if (!isCurrent()) return;
      // A failed read says nothing about who bills this entity, so the last successfully loaded
      // scope is kept: an entity that never loaded stays unresolved (purchase UI keeps waiting)
      // and an entity already known to be externally billed keeps that ownership. Publishing the
      // default here would turn a network error into "billed in this app, ready to buy".
      setError(err instanceof Error ? err.message : "Failed to fetch subscription");
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [apiBaseUrl, entityId, accessToken, whiteLabel.isLoading, whiteLabel.slug, scope, dataScopeKey]);

  useEffect(() => {
    activeScopeRef.current = scope;
    void fetchSubscription();
    return () => {
      activeScopeRef.current = null;
      requestRef.current?.abort();
    };
  }, [fetchSubscription, scope]);

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
      couponCode: string | null | undefined,
      activationQuoteId: string,
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
          activation_quote_id: activationQuoteId,
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
  const externalBillingProvider = getExternalBillingProvider(subscription);

  // Payment is required for never-paid assignments and failed/canceled subscriptions,
  // not healthy paid subscriptions waiting for the nightly renewal run.
  const needsPayment = isTrialExpiredState || isWLSubscriptionPaymentRequired(subscription);

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
      externalBillingProvider,
      isExternalBillingResolved,
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
      externalBillingProvider,
      isExternalBillingResolved,
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
