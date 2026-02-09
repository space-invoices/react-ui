import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCookies } from "react-cookie";
import { ACTIVE_ENTITY_COOKIE, ACTIVE_ENVIRONMENT_COOKIE } from "@/ui/components/entities/keys";

import { useSDK } from "@/ui/providers/sdk-provider";

import { EntitiesContext, type Entity, type EntityEnvironment } from "./entities-context";

// Define a constant for the entities cache key
export const ENTITIES_QUERY_KEY = ["entities"] as const;

function LoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

type EntitiesProviderProps = {
  children: ReactNode;
  initialActiveEntity?: Entity | null;
  onNoEntities?: () => void;
  cookieDomain?: string;
  /** When provided (from URL param), this entity ID is used as the source of truth instead of the cookie */
  urlEntityId?: string;
};

export function EntitiesProvider({
  children,
  initialActiveEntity,
  onNoEntities,
  cookieDomain,
  urlEntityId,
}: EntitiesProviderProps) {
  const { sdk, isInitialized } = useSDK();
  const [cookies, setCookie, removeCookie] = useCookies([ACTIVE_ENTITY_COOKIE, ACTIVE_ENVIRONMENT_COOKIE]);
  const isInitialMount = useRef(true);
  const initialEnvironmentFromCookie = cookies[ACTIVE_ENVIRONMENT_COOKIE] as EntityEnvironment | undefined;
  const initialEntityIdFromCookie = cookies[ACTIVE_ENTITY_COOKIE] as string | undefined;

  // URL entity ID takes precedence over cookie
  const resolvedEntityId = urlEntityId ?? initialEntityIdFromCookie;

  const resolvedInitialEnvironment: EntityEnvironment =
    initialEnvironmentFromCookie ?? (initialActiveEntity?.environment as EntityEnvironment | undefined) ?? "live";

  const [environment, setEnvironmentState] = useState<EntityEnvironment>(resolvedInitialEnvironment);
  const previousEnvironment = useRef(environment);

  // Store the initial entity ID (from URL or cookie) so we can match it when entities load
  const initialEntityIdRef = useRef(resolvedEntityId);

  // Initialize active entity from prop if it matches the selected environment
  const [activeEntityState, setActiveEntityState] = useState<Entity | null>(() => {
    if (initialActiveEntity && initialActiveEntity.environment === resolvedInitialEnvironment) {
      return initialActiveEntity;
    }

    return null;
  });

  const {
    data: entities = [],
    isLoading,
    refetch,
    isError,
    error,
    status,
  } = useQuery({
    queryKey: [...ENTITIES_QUERY_KEY, environment],
    queryFn: async () => {
      if (!sdk) return [];

      // Pass environment to filter entities for user tokens
      const response = await sdk.entities.list({ limit: 100, environment });
      return response.data;
    },
    enabled: !!sdk && isInitialized,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // When no entities in current environment, check the other before giving up
  const hasCalledNoEntities = useRef(false);
  const hasTriedFallback = useRef(false);
  useEffect(() => {
    if (isLoading || entities.length > 0 || hasCalledNoEntities.current) return;

    // Try the other environment before calling onNoEntities
    if (!hasTriedFallback.current && sdk) {
      hasTriedFallback.current = true;
      const altEnv = environment === "live" ? "sandbox" : "live";
      sdk.entities
        .list({ limit: 1, environment: altEnv })
        .then((res) => {
          if (res.data.length > 0) {
            // Other environment has entities — auto-switch
            setEnvironmentState(altEnv as EntityEnvironment);
          } else {
            hasCalledNoEntities.current = true;
            onNoEntities?.();
          }
        })
        .catch(() => {
          hasCalledNoEntities.current = true;
          onNoEntities?.();
        });
      return;
    }

    if (!hasTriedFallback.current) return;
    hasCalledNoEntities.current = true;
    onNoEntities?.();
  }, [isLoading, entities.length, onNoEntities, sdk, environment]);

  // Memoize entities to prevent unnecessary re-renders
  const memoizedEntities = useMemo(() => entities, [entities]);

  useEffect(() => {
    if (previousEnvironment.current !== environment) {
      previousEnvironment.current = environment;
      setActiveEntityState(null);
    }
  }, [environment]);

  // Sync active entity when entities list changes
  // Use ref to read current activeEntityState without causing re-runs
  const activeEntityRef = useRef(activeEntityState);
  activeEntityRef.current = activeEntityState;

  // When urlEntityId changes (e.g. entity switcher navigates to new URL), update the ref
  useEffect(() => {
    if (urlEntityId) {
      initialEntityIdRef.current = urlEntityId;
    }
  }, [urlEntityId]);

  useEffect(() => {
    if (!memoizedEntities.length) return;

    const currentActive = activeEntityRef.current;
    // When URL entity ID is provided, always try to match it first
    const targetEntityId = urlEntityId ?? currentActive?.id;

    try {
      if (targetEntityId) {
        const updatedEntity = memoizedEntities.find((entity) => entity.id === targetEntityId);

        if (updatedEntity) {
          // Always update with fresh data from the server
          setActiveEntityState(updatedEntity);
        } else if (currentActive) {
          // URL entity not found but we have a current active — keep it or fall back
          const stillExists = memoizedEntities.find((entity) => entity.id === currentActive.id);
          setActiveEntityState(stillExists ?? memoizedEntities[0]);
        } else {
          setActiveEntityState(memoizedEntities[0]);
        }
      } else {
        // No active entity yet — try to match by cookie/URL ID, then fall back to first
        const entityId = initialEntityIdRef.current;
        const matchedEntity = entityId ? memoizedEntities.find((entity) => entity.id === entityId) : undefined;
        setActiveEntityState(matchedEntity ?? memoizedEntities[0]);
      }
    } catch (_e) {
      if (memoizedEntities.length > 0) {
        setActiveEntityState(memoizedEntities[0]);
      }
    } finally {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
  }, [memoizedEntities, urlEntityId]); // Re-run when URL entity changes

  const cookieOpts = useMemo(
    () => ({
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax" as const,
      ...(cookieDomain && { domain: cookieDomain }),
    }),
    [cookieDomain],
  );

  // Update cookie when active entity changes (store only ID)
  useEffect(() => {
    if (activeEntityState) {
      setCookie(ACTIVE_ENTITY_COOKIE, activeEntityState.id, cookieOpts);
    } else {
      removeCookie(ACTIVE_ENTITY_COOKIE, cookieOpts);
    }
  }, [activeEntityState, setCookie, removeCookie, cookieOpts]);

  useEffect(() => {
    setCookie(ACTIVE_ENVIRONMENT_COOKIE, environment, cookieOpts);
  }, [environment, setCookie, cookieOpts]);

  const refetchEntities = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleEnvironmentChange = useCallback((nextEnvironment: EntityEnvironment) => {
    setEnvironmentState((current) => (current === nextEnvironment ? current : nextEnvironment));
  }, []);

  const value = useMemo(
    () => ({
      entities: memoizedEntities,
      activeEntity: activeEntityState,
      setActiveEntity: setActiveEntityState,
      environment,
      setEnvironment: handleEnvironmentChange,
      isLoading,
      refetchEntities,
      isError,
      error,
      status,
    }),
    [
      memoizedEntities,
      activeEntityState,
      environment,
      handleEnvironmentChange,
      isLoading,
      refetchEntities,
      isError,
      error,
      status,
    ],
  );

  // Show loading state only if entities are still loading
  if (isLoading) {
    return <LoadingFallback />;
  }

  return <EntitiesContext value={value}>{children}</EntitiesContext>;
}
