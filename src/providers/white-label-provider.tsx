import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type WhiteLabelConfig = {
  slug: string;
  name: string;
  hiddenFeatures: string[]; // Features hidden from UI (still available via API)
  halAppId: string | null; // Hal app ID for chat widget (null = no Hal integration)
};

// Default config until API responds (Space Invoices = all features visible)
const DEFAULT_CONFIG: WhiteLabelConfig = {
  slug: "space-invoices",
  name: "Space Invoices",
  hiddenFeatures: [],
  halAppId: null,
};

type WhiteLabelContextType = WhiteLabelConfig & {
  /** Check if a feature is visible (not hidden) for this white-label */
  isFeatureVisible: (feature: string) => boolean;
  isLoading: boolean;
};

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

// Add a name to help with debugging
WhiteLabelContext.displayName = "WhiteLabelContext";

type WhiteLabelProviderProps = {
  children: ReactNode;
  /** Optional API base URL (defaults to empty string for same-origin) */
  apiBaseUrl?: string;
};

/**
 * WhiteLabelProvider component
 * Fetches white-label configuration from the API and provides it to the application
 */
export function WhiteLabelProvider({ children, apiBaseUrl = "" }: WhiteLabelProviderProps) {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/white-labels/current`);
        if (response.ok) {
          const data = await response.json();
          // Map snake_case API response to camelCase internal state
          setConfig({
            slug: data.slug,
            name: data.name,
            hiddenFeatures: data.hidden_features,
            halAppId: data.hal_app_id ?? null,
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

  const isFeatureVisible = useCallback(
    (feature: string) => !config.hiddenFeatures.includes(feature),
    [config.hiddenFeatures],
  );

  const value = useMemo(
    () => ({
      ...config,
      isFeatureVisible,
      isLoading,
    }),
    [config, isLoading, isFeatureVisible],
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
