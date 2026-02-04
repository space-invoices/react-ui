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
};

export function EntitiesProvider({ children, initialActiveEntity, onNoEntities }: EntitiesProviderProps) {
  const { sdk, isInitialized } = useSDK();
  const [cookies, setCookie, removeCookie] = useCookies([ACTIVE_ENTITY_COOKIE, ACTIVE_ENVIRONMENT_COOKIE]);
  const isInitialMount = useRef(true);
  const initialEnvironmentFromCookie = cookies[ACTIVE_ENVIRONMENT_COOKIE] as EntityEnvironment | undefined;
  const initialEntityFromCookie = cookies[ACTIVE_ENTITY_COOKIE] as Entity | undefined;

  const resolvedInitialEnvironment: EntityEnvironment =
    initialEnvironmentFromCookie ??
    (initialEntityFromCookie?.environment as EntityEnvironment | undefined) ??
    (initialActiveEntity?.environment as EntityEnvironment | undefined) ??
    "live";

  const [environment, setEnvironmentState] = useState<EntityEnvironment>(resolvedInitialEnvironment);
  const previousEnvironment = useRef(environment);

  // Initialize active entity from cookie or prop that matches the selected environment
  const [activeEntityState, setActiveEntityState] = useState<Entity | null>(() => {
    try {
      if (initialEntityFromCookie && initialEntityFromCookie.environment === resolvedInitialEnvironment) {
        return initialEntityFromCookie;
      }
    } catch (_e) {
      // Ignore cookie parsing errors
    }

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

  // Redirect to add entity page when no entities exist
  const hasCalledNoEntities = useRef(false);
  useEffect(() => {
    if (!isLoading && entities.length === 0 && !hasCalledNoEntities.current) {
      hasCalledNoEntities.current = true;
      onNoEntities?.();
    }
  }, [isLoading, entities.length, onNoEntities]);

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

  useEffect(() => {
    if (!memoizedEntities.length) return;

    const currentActive = activeEntityRef.current;

    try {
      if (currentActive) {
        const updatedEntity = memoizedEntities.find((entity) => entity.id === currentActive.id);

        if (updatedEntity) {
          // Always update with fresh data from the server
          setActiveEntityState(updatedEntity);
        } else {
          // If active entity no longer exists, fall back to first entity
          setActiveEntityState(memoizedEntities[0]);
        }
      } else {
        setActiveEntityState(memoizedEntities[0]);
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
  }, [memoizedEntities]); // Only depend on entities list

  // Update cookie when active entity changes
  useEffect(() => {
    if (activeEntityState) {
      setCookie(ACTIVE_ENTITY_COOKIE, activeEntityState, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      removeCookie(ACTIVE_ENTITY_COOKIE, { path: "/" });
    }
  }, [activeEntityState, setCookie, removeCookie]);

  useEffect(() => {
    setCookie(ACTIVE_ENVIRONMENT_COOKIE, environment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }, [environment, setCookie]);

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
