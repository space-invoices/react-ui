import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

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
};

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
}: LockedFeatureProps) {
  const subscription = useWLSubscriptionOptional();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} feature={feature} />
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
              {lockedMessage || getDefaultLockedMessage(feature)}
            </p>
            <p className="text-muted-foreground text-xs">Click to upgrade</p>
          </div>
        </div>
      </button>

      {showUpgradeModal && (
        <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} feature={feature} />
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

  if (plan.limits?.documents_per_month === null) {
    return null; // Unlimited - no badge needed
  }

  const limit = plan.limits?.documents_per_month ?? 0;
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
      {usage.documents_count}/{limit} docs
    </div>
  );
}

// Helper to get default locked message for a feature
function getDefaultLockedMessage(feature: GatedFeature): string {
  const messages: Record<GatedFeature, string> = {
    furs: "FURS fiscalization requires a Starter or Advanced plan",
    fina: "FINA fiscalization requires a Starter or Advanced plan",
    eslog: "eSlog export requires a Starter or Advanced plan",
    recurring: "Recurring invoices require a Starter or Advanced plan",
    email_sending: "Email sending requires a Starter or Advanced plan",
    custom_templates: "Custom templates require an Advanced plan",
    api_access: "API access requires an Advanced plan",
    webhooks: "Webhooks require an Advanced plan",
    priority_support: "Priority support requires an Advanced plan",
  };

  return messages[feature] || "This feature requires a plan upgrade";
}
