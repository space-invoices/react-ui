import type { GetEntities200DataItem } from "@spaceinvoices/js-sdk";

import { createContext, useContext } from "react";

/** Entity type with country_rules included (from getEntities response) */
export type Entity = GetEntities200DataItem;

export type EntityEnvironment = "live" | "sandbox";

export type EntitiesContextType = {
  entities: Entity[];
  activeEntity: Entity | null;
  setActiveEntity: (entity: Entity | null) => void;
  environment: EntityEnvironment;
  setEnvironment: (environment: EntityEnvironment) => void;
  isLoading: boolean;
  refetchEntities: () => Promise<void>;
  isError: boolean;
  error: Error | null;
  status: "loading" | "error" | "success" | "pending";
};

export const EntitiesContext = createContext<EntitiesContextType | undefined>(undefined);

export const useEntities = () => {
  const context = useContext(EntitiesContext);
  if (!context) {
    throw new Error("useEntities must be used within an EntitiesProvider");
  }
  return context;
};

/** Optional version that returns undefined when outside EntitiesProvider (for public views) */
export const useEntitiesOptional = () => {
  return useContext(EntitiesContext);
};

export const useActiveEntity = () => {
  const { activeEntity, setActiveEntity } = useEntities();
  return { activeEntity, setActiveEntity };
};
