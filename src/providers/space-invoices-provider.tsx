"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setAccountId } from "../../../js-sdk/src/mutator/custom-fetch";
import { initSDK } from "../../../js-sdk/src/sdk/init";
import type { SDKConfig } from "../../../js-sdk/src/sdk/types";

export type SpaceInvoicesRuntimeContextType = {
  accessToken: string | null;
  accountId: string | null;
  basePath?: string;
  clientName?: string;
  hasAccessToken: boolean;
  isResolvingAccessToken: boolean;
  error: Error | null;
  getAccessToken: () => Promise<string>;
};

const SpaceInvoicesRuntimeContext = createContext<SpaceInvoicesRuntimeContextType | undefined>(undefined);

SpaceInvoicesRuntimeContext.displayName = "SpaceInvoicesRuntimeContext";

export type SpaceInvoicesProviderProps = {
  children: ReactNode;
  accessToken: SDKConfig["accessToken"];
  accountId?: string | null;
  basePath?: string;
  clientName?: string;
  onUnauthorized?: SDKConfig["onUnauthorized"];
};

async function resolveAccessToken(accessToken: SDKConfig["accessToken"]): Promise<string> {
  const resolved = typeof accessToken === "function" ? await accessToken() : accessToken;
  return resolved ?? "";
}

export function SpaceInvoicesProvider({
  children,
  accessToken,
  accountId = null,
  basePath,
  clientName,
  onUnauthorized,
}: SpaceInvoicesProviderProps) {
  const [resolvedAccessToken, setResolvedAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isResolvingAccessToken, setIsResolvingAccessToken] = useState(true);
  const onUnauthorizedRef = useRef(onUnauthorized);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    let cancelled = false;

    setIsResolvingAccessToken(true);
    setError(null);

    initSDK({
      accessToken,
      ...(basePath && { basePath }),
      ...(clientName && { clientName }),
      ...(onUnauthorizedRef.current && {
        onUnauthorized: (response) => onUnauthorizedRef.current?.(response),
      }),
    });

    void resolveAccessToken(accessToken)
      .then((token) => {
        if (cancelled) return;
        setResolvedAccessToken(token || null);
      })
      .catch((cause) => {
        if (cancelled) return;
        setResolvedAccessToken(null);
        setError(cause instanceof Error ? cause : new Error("Failed to resolve Space Invoices access token"));
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingAccessToken(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, basePath, clientName]);

  useEffect(() => {
    setAccountId(accountId);
  }, [accountId]);

  const value = useMemo<SpaceInvoicesRuntimeContextType>(
    () => ({
      accessToken: resolvedAccessToken,
      accountId,
      basePath,
      clientName,
      hasAccessToken: Boolean(resolvedAccessToken),
      isResolvingAccessToken,
      error,
      getAccessToken: () => resolveAccessToken(accessToken),
    }),
    [resolvedAccessToken, accountId, basePath, clientName, isResolvingAccessToken, error, accessToken],
  );

  return <SpaceInvoicesRuntimeContext.Provider value={value}>{children}</SpaceInvoicesRuntimeContext.Provider>;
}

export function useSpaceInvoicesRuntime() {
  const context = useContext(SpaceInvoicesRuntimeContext);

  if (!context) {
    throw new Error("useSpaceInvoicesRuntime must be used within a SpaceInvoicesProvider");
  }

  return context;
}

export function useSpaceInvoicesRuntimeOptional() {
  return useContext(SpaceInvoicesRuntimeContext) ?? null;
}

export function useAccessToken() {
  const context = useSpaceInvoicesRuntimeOptional();
  return context?.accessToken ?? null;
}
