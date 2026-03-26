import { getClientHeaders } from "@spaceinvoices/js-sdk";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getEffectiveWhiteLabelHiddenFeatures,
  isWhiteLabelCapabilityVisible,
  isWhiteLabelUiControlVisible,
  type WhiteLabelActionControlId,
  type WhiteLabelCapabilityId,
} from "@/ui/lib/white-label-capabilities";
import { useEntitiesOptional } from "./entities-context";

export type WhiteLabelConfig = {
  slug: string;
  name: string;
  appName: string | null;
  shortName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  themeColor: string | null;
  hiddenFeatures: string[]; // Features hidden from UI (still available via API)
  hideNewFeaturesByDefault: boolean;
  reviewedFeatureCatalogIds: string[];
  billingEnabled: boolean; // Whether billing-related UI should be available
  accountUsersFullUiEnabled: boolean; // Whether account users bypass white-label UI hiding
  halAppId: string | null; // Hal app ID for chat widget (null = no Hal integration)
  supportEmail: string | null; // White-label support contact email
};

// Default config until API responds (Space Invoices = all features visible)
const DEFAULT_CONFIG: WhiteLabelConfig = {
  slug: "space-invoices",
  name: "Space Invoices",
  appName: "Space Invoices",
  shortName: "Space Invoices",
  logoUrl: null,
  faviconUrl: null,
  themeColor: null,
  hiddenFeatures: [],
  hideNewFeaturesByDefault: false,
  reviewedFeatureCatalogIds: [],
  billingEnabled: false,
  accountUsersFullUiEnabled: true,
  halAppId: null,
  supportEmail: null,
};

type WhiteLabelContextType = WhiteLabelConfig & {
  /** Check if a feature is visible (not hidden) for this white-label */
  isFeatureVisible: (feature: string) => boolean;
  /** Check if a capability is visible after country/entity and white-label rules are applied */
  isCapabilityVisible: (capability: WhiteLabelCapabilityId) => boolean;
  /** Check if a standalone UI control is visible after white-label and parent capability rules are applied */
  isUiControlVisible: (control: WhiteLabelActionControlId) => boolean;
  isLoading: boolean;
};

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

// Add a name to help with debugging
WhiteLabelContext.displayName = "WhiteLabelContext";

type WhiteLabelProviderProps = {
  children: ReactNode;
  /** Optional API base URL (defaults to empty string for same-origin) */
  apiBaseUrl?: string;
  /** Whether the current authenticated user is an account user without an attached account_id */
  isAccountUser?: boolean;
};

/**
 * WhiteLabelProvider component
 * Fetches white-label configuration from the API and provides it to the application
 */
export function WhiteLabelProvider({ children, apiBaseUrl = "", isAccountUser = false }: WhiteLabelProviderProps) {
  const entitiesContext = useEntitiesOptional();
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/white-labels/current`, {
          headers: apiBaseUrl ? getClientHeaders("ui") : undefined,
        });
        if (response.ok) {
          const data = await response.json();
          // Map snake_case API response to camelCase internal state
          setConfig({
            slug: data.slug,
            name: data.name,
            appName: data.app_name ?? data.name,
            shortName: data.short_name ?? data.name,
            logoUrl: data.logo_url ?? null,
            faviconUrl: data.favicon_url ?? null,
            themeColor: data.theme_color ?? null,
            hiddenFeatures: data.hidden_features,
            hideNewFeaturesByDefault: data.hide_new_features_by_default ?? false,
            reviewedFeatureCatalogIds: data.reviewed_feature_catalog_ids ?? [],
            billingEnabled: data.billing_enabled ?? false,
            accountUsersFullUiEnabled: data.account_users_full_ui_enabled ?? true,
            halAppId: data.hal_app_id ?? null,
            supportEmail: data.support_email ?? null,
          });
        }
      } catch {
        // Use default config if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [apiBaseUrl]);

  const accountUsersBypassUiRestrictions = config.accountUsersFullUiEnabled && isAccountUser;
  const effectiveHiddenFeatures = useMemo(
    () =>
      getEffectiveWhiteLabelHiddenFeatures({
        hiddenFeatures: config.hiddenFeatures,
        hideNewFeaturesByDefault: config.hideNewFeaturesByDefault,
        reviewedFeatureCatalogIds: config.reviewedFeatureCatalogIds,
      }),
    [config.hiddenFeatures, config.hideNewFeaturesByDefault, config.reviewedFeatureCatalogIds],
  );

  const isFeatureVisible = useCallback(
    (feature: string) => accountUsersBypassUiRestrictions || !effectiveHiddenFeatures.includes(feature),
    [accountUsersBypassUiRestrictions, effectiveHiddenFeatures],
  );

  const isCapabilityVisible = useCallback(
    (capability: WhiteLabelCapabilityId) =>
      accountUsersBypassUiRestrictions ||
      isWhiteLabelCapabilityVisible({
        capability,
        hiddenFeatures: effectiveHiddenFeatures,
        entity: entitiesContext?.activeEntity ?? null,
        entityCount: entitiesContext?.entities.length ?? 0,
      }),
    [
      accountUsersBypassUiRestrictions,
      effectiveHiddenFeatures,
      entitiesContext?.activeEntity,
      entitiesContext?.entities.length,
    ],
  );

  const isUiControlVisible = useCallback(
    (control: WhiteLabelActionControlId) =>
      accountUsersBypassUiRestrictions ||
      isWhiteLabelUiControlVisible({
        control,
        hiddenFeatures: effectiveHiddenFeatures,
        entity: entitiesContext?.activeEntity ?? null,
        entityCount: entitiesContext?.entities.length ?? 0,
      }),
    [
      accountUsersBypassUiRestrictions,
      effectiveHiddenFeatures,
      entitiesContext?.activeEntity,
      entitiesContext?.entities.length,
    ],
  );

  const value = useMemo(
    () => ({
      ...config,
      isFeatureVisible,
      isCapabilityVisible,
      isUiControlVisible,
      isLoading,
    }),
    [config, isLoading, isFeatureVisible, isCapabilityVisible, isUiControlVisible],
  );

  return <WhiteLabelContext.Provider value={value}>{children}</WhiteLabelContext.Provider>;
}

/**
 * Hook to access the white-label context
 * @throws Error if used outside of WhiteLabelProvider
 */
export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext);

  if (context === undefined) {
    throw new Error("useWhiteLabel must be used within a WhiteLabelProvider");
  }

  return context;
}
