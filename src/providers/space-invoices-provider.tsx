"use client";

import { getAccountId, initSDK, type SDKConfig, setAccountId } from "@spaceinvoices/js-sdk";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  const sdkConfigRef = useRef<
    | { accessToken: SDKConfig["accessToken"]; accountId: string | null; basePath?: string; clientName?: string }
    | undefined
  >(undefined);
  const sdkAccountIdRef = useRef<string | null | undefined>(undefined);

  onUnauthorizedRef.current = onUnauthorized;

  const sdkConfig = sdkConfigRef.current;
  if (
    !sdkConfig ||
    sdkConfig.accessToken !== accessToken ||
    sdkConfig.accountId !== accountId ||
    sdkConfig.basePath !== basePath ||
    sdkConfig.clientName !== clientName
  ) {
    sdkConfigRef.current = { accessToken, accountId, basePath, clientName };
    initSDK({
      accessToken,
      accountId,
      ...(basePath && { basePath }),
      ...(clientName && { clientName }),
      onUnauthorized: (response) => onUnauthorizedRef.current?.(response),
    });
  }

  if (sdkAccountIdRef.current !== accountId) {
    sdkAccountIdRef.current = accountId;
    setAccountId(accountId);
  }

  useEffect(() => {
    let cancelled = false;

    setIsResolvingAccessToken(true);
    setError(null);

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
  }, [accessToken]);

  useEffect(() => {
    return () => {
      if (getAccountId() === accountId) {
        setAccountId(null);
      }
    };
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
