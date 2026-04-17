import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { type GatedFeature, useWLSubscriptionOptional } from "../../providers/wl-subscription-provider";
import { UpgradeModal } from "./upgrade-modal";

type LockedFeatureProps = {
  /** Feature slug to check access for */
  feature: GatedFeature;
  /** Content to render when feature is unlocked */
  children: ReactNode;
  /** Optional custom locked message */
  lockedMessage?: string;
  /** Whether to show the upgrade modal on click (default: true) */
  showUpgradeModal?: boolean;
  /** Custom render for locked state */
  lockedRender?: () => ReactNode;
} & ComponentTranslationProps;

type TranslateValues = Record<string, string | number>;

function interpolateTranslation(template: string, values?: TranslateValues) {
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function createLockedFeatureTranslation({ t, namespace, locale, translationLocale }: ComponentTranslationProps) {
  const fallbackTranslation = createTranslation({
    t,
    namespace,
    locale,
    translationLocale,
    translations: {
      en: {
        "wl-subscription.locked-feature.click-to-upgrade": "Click to upgrade",
        "wl-subscription.locked-feature.requires.advanced-or-pro": "{{feature}} requires an Advanced or Pro plan",
        "wl-subscription.locked-feature.requires.advanced": "{{feature}} requires an Advanced plan",
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
 * LockedFeature wrapper component
 *
 * Wraps content that requires a specific subscription feature.
 * Shows a locked overlay with upgrade prompt if feature is not available.
 *
 * @example
 * <LockedFeature feature="furs">
 *   <FursSettingsPage />
 * </LockedFeature>
 */
export function LockedFeature({
  feature,
  children,
  lockedMessage,
  showUpgradeModal = true,
  lockedRender,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: LockedFeatureProps) {
  const subscription = useWLSubscriptionOptional();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = createLockedFeatureTranslation({ t: translateFn, namespace, locale, translationLocale });

  // If no subscription context, feature is unlocked (Space Invoices)
  if (!subscription) {
    return <>{children}</>;
  }

  const hasFeature = subscription.hasFeature(feature);

  // Feature is available, render children
  if (hasFeature) {
    return <>{children}</>;
  }

  // Feature is locked - show locked state
  const handleClick = () => {
    if (showUpgradeModal) {
      setIsModalOpen(true);
    }
  };

  // Custom locked render
  if (lockedRender) {
    return (
      <>
        <button type="button" className="w-full text-left" onClick={handleClick}>
          {lockedRender()}
        </button>
        {showUpgradeModal && (
          <UpgradeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            feature={feature}
            t={translateFn}
            namespace={namespace}
            locale={locale}
            translationLocale={translationLocale}
          />
        )}
      </>
    );
  }

  // Default locked state
  return (
    <>
      <button type="button" className="relative w-full cursor-pointer" onClick={handleClick}>
        {/* Blurred content */}
        <div className="pointer-events-none select-none opacity-50 blur-sm">{children}</div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <div className="rounded-full bg-muted p-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground text-sm">
              {lockedMessage || getDefaultLockedMessage(feature, t)}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("wl-subscription.locked-feature.click-to-upgrade", {
                defaultValue: "Click to upgrade",
              })}
            </p>
          </div>
        </div>
      </button>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          feature={feature}
          t={translateFn}
          namespace={namespace}
          locale={locale}
          translationLocale={translationLocale}
        />
      )}
    </>
  );
}

/**
 * LockedBadge component for sidebar items
 * Shows a small lock icon next to locked features
 */
export function LockedBadge({ feature }: { feature: GatedFeature }) {
  const subscription = useWLSubscriptionOptional();

  // No subscription context or has feature = no badge
  if (!subscription || subscription.hasFeature(feature)) {
    return null;
  }

  return (
    <span className="ml-auto">
      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
    </span>
  );
}

/**
 * UsageBadge component showing document usage percentage
 * For displaying in settings or dashboard
 */
export function UsageBadge() {
  const subscription = useWLSubscriptionOptional();

  if (!subscription) return null;

  const percentage = subscription.getUsagePercentage("documents");
  const { usage, plan } = subscription;

  if (!plan || !usage) return null;

  const limit = plan.limits?.invoices_per_month ?? plan.limits?.documents_per_month;
  const count = plan.limits?.invoices_per_month != null ? usage.invoices_count : usage.documents_count;

  if (limit == null) {
    return null; // Unlimited - no badge needed
  }
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div
      className={`rounded-full px-2 py-1 text-xs ${
        isAtLimit
          ? "bg-destructive/10 text-destructive"
          : isNearLimit
            ? "bg-warning/10 text-warning"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {count}/{limit} invoices
    </div>
  );
}

function getFeatureDisplayName(feature: GatedFeature, t: ReturnType<typeof createLockedFeatureTranslation>): string {
  const defaultNames: Record<GatedFeature, string> = {
    furs: "FURS fiscalization",
    fina: "FINA fiscalization",
    eslog: "eSlog export",
    recurring: "Recurring invoices",
    email_sending: "Email sending",
    financial_categories: "Categories",
    business_units: "Units / Brands",
    custom_templates: "Custom templates",
    api_access: "API access",
    webhooks: "Webhooks",
    priority_support: "Priority support",
    e_invoicing: "E-Invoicing",
  };

  return t(`wl-subscription.locked-feature.features.${feature}`, {
    defaultValue: defaultNames[feature] || feature,
  });
}

// Helper to get default locked message for a feature
function getDefaultLockedMessage(feature: GatedFeature, t: ReturnType<typeof createLockedFeatureTranslation>): string {
  const advancedOnlyFeatures = new Set<GatedFeature>([
    "custom_templates",
    "api_access",
    "webhooks",
    "priority_support",
  ]);
  const featureLabel = getFeatureDisplayName(feature, t);

  return advancedOnlyFeatures.has(feature)
    ? t("wl-subscription.locked-feature.requires.advanced", {
        feature: featureLabel,
        defaultValue: "{{feature}} requires an Advanced plan",
      })
    : t("wl-subscription.locked-feature.requires.advanced-or-pro", {
        feature: featureLabel,
        defaultValue: "{{feature}} requires an Advanced or Pro plan",
      });
}
