/**
 * FINA (Croatia) Settings Hooks
 * TanStack Query hooks for FINA fiscalization settings management
 */

import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSDK } from "../../../providers/sdk-provider";

/**
 * Query Keys
 */
export const finaQueryKeys = {
  settings: (entityId: string) => ["fina", "settings", entityId] as const,
  premises: (entityId: string) => ["fina", "premises", entityId] as const,
  premise: (premiseId: string) => ["fina", "premise", premiseId] as const,
  devices: (premiseId: string) => ["fina", "devices", premiseId] as const,
};

/**
 * Hook: Get FINA settings
 */
export function useFinaSettings(entityId: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: finaQueryKeys.settings(entityId),
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");
      if (!entityId) throw new Error("Entity ID required");
      return sdk.finaSettings.list({ entity_id: entityId });
    },
    enabled: !!sdk && !!entityId,
    staleTime: 0,
    ...options,
  });
}

/**
 * Hook: Update FINA settings
 */
export function useUpdateFinaSettings(options?: UseMutationOptions<any, Error, { entityId: string; data: any }>) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaSettings.update(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.settings(variables.entityId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Upload FINA certificate
 */
export function useUploadFinaCertificate(
  options?: UseMutationOptions<any, Error, { entityId: string; file: Blob; passphrase: string }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, file, passphrase }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaCertificate.uploadFinaCertificate({ file, passphrase }, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.settings(variables.entityId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: List FINA business premises
 */
export function useFinaPremises(entityId: string, options?: Omit<UseQueryOptions<any[]>, "queryKey" | "queryFn">) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: finaQueryKeys.premises(entityId),
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaPremises.listFinaPremises({ entity_id: entityId });
    },
    enabled: !!sdk,
    staleTime: 0,
    ...options,
  });
}

/**
 * Hook: Register real estate premise
 */
export function useRegisterFinaRealEstatePremise(
  options?: UseMutationOptions<any, Error, { entityId: string; data: any }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaPremises.registerFinaRealEstatePremise(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.premises(variables.entityId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Register movable premise
 */
export function useRegisterFinaMovablePremise(
  options?: UseMutationOptions<any, Error, { entityId: string; data: any }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaPremises.registerFinaMovablePremise(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.premises(variables.entityId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Close premise
 */
export function useCloseFinaPremise(options?: UseMutationOptions<any, Error, { entityId: string; premiseId: string }>) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaPremises.closeFinaPremise(premiseId, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.premises(variables.entityId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Register electronic device
 */
export function useRegisterFinaElectronicDevice(
  options?: UseMutationOptions<any, Error, { entityId: string; premiseId: string; deviceId: string }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId, deviceId }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.finaDevices.registerFinaDevice(premiseId, { device_id: deviceId }, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.premises(variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: finaQueryKeys.devices(variables.premiseId),
      });
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}
