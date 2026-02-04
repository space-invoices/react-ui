import SDK from "@spaceinvoices/js-sdk";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_COOKIES } from "@/ui/lib/auth";
import { flushCookies, getCookie } from "@/ui/lib/browser-cookies";

/**
 * SDK context type definition
 * Note: SDK is guaranteed to be non-null when accessing this context
 * The provider blocks rendering until SDK is initialized
 */
type SDKContextType = {
  sdk: SDK; // Non-null - guaranteed by provider
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  reinitialize: () => Promise<void>;
};

/**
 * SDK context with default values
 * Note: These defaults are never actually used because the provider
 * blocks rendering until SDK is initialized
 */
const SDKContext = createContext<SDKContextType | undefined>(undefined);

// Add a name to help with debugging
SDKContext.displayName = "SDKContext";

type SDKProviderProps = {
  children: ReactNode;
  onUnauthorized?: (response: Response) => void;
  fallbackLoading?: ReactNode;
  fallbackError?: (error: Error) => ReactNode;
  fallbackUnauthorized?: ReactNode;
};

/**
 * SDK Provider component
 * Responsible for initializing the SDK and providing it to the application
 */
export function SDKProvider({
  children,
  onUnauthorized,
  fallbackLoading = <div className="p-4">Initializing SDK...</div>,
  fallbackError = (error) => <div className="p-4 text-red-500">Error initializing SDK: {error.message}</div>,
  fallbackUnauthorized = <div className="p-4 text-amber-500">No SDK available. Please log in first.</div>,
}: SDKProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sdk, setSdk] = useState<SDK | null>(null);

  /**
   * Initialize the SDK with the current auth token
   */
  const initializeSDK = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getCookie(AUTH_COOKIES.TOKEN);

      if (!token) {
        setIsInitialized(false);
        setSdk(null);
        setIsLoading(false);
        return;
      }

      const basePath = import.meta.env?.VITE_API_URL || import.meta.env?.BUN_PUBLIC_API_URL || undefined;
      const newSDK = new SDK({
        accessToken: token,
        ...(basePath && { basePath }),
        onUnauthorized: (response: Response) => {
          flushCookies();
          onUnauthorized?.(response);
        },
      });

      setSdk(newSDK);
      setIsInitialized(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to initialize SDK"));
      setSdk(null);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize SDK on component mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: initializeSDK is intentionally omitted - should only run once on mount
  useEffect(() => {
    initializeSDK();
  }, []); // Empty dependency array - only run on mount

  // IMPORTANT: useMemo must be called BEFORE any conditional returns
  // to satisfy React's Rules of Hooks
  // biome-ignore lint/correctness/useExhaustiveDependencies: initializeSDK is stable (doesn't change) and including it would cause unnecessary re-renders
  const value = useMemo(
    () => ({
      sdk: sdk as SDK, // Will be non-null when children render (checked below)
      isInitialized,
      isLoading,
      error,
      reinitialize: initializeSDK,
    }),
    [sdk, isInitialized, isLoading, error], // Don't include initializeSDK - it's stable but causes re-renders
  );

  // Render appropriate UI based on SDK state
  // Children only render when SDK is guaranteed non-null
  if (isLoading) {
    return <>{fallbackLoading}</>;
  }

  if (error) {
    return <>{fallbackError(error)}</>;
  }

  if (!sdk || !isInitialized) {
    return <>{fallbackUnauthorized}</>;
  }

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
}

/**
 * Hook to access the SDK context
 * @throws Error if used outside of SDKProvider
 */
export function useSDK() {
  const context = useContext(SDKContext);

  if (context === undefined) {
    throw new Error("useSDK must be used within an SDKProvider");
  }

  return context;
}

/**
 * Optional hook that returns null if not in SDKProvider
 * Useful for components that may be used with or without SDK context
 */
export function useSDKOptional() {
  const context = useContext(SDKContext);
  return context ?? null;
}

/**
 * Get access token from SDK context (helper for WLSubscriptionProvider)
 */
export function useAccessToken(): string | null {
  const context = useContext(SDKContext);
  if (!context?.sdk) return null;

  // Access token is stored in SDK configuration
  // We need to get it from the auth cookie since SDK doesn't expose it directly
  const token = getCookie(AUTH_COOKIES.TOKEN);
  return token ?? null;
}
