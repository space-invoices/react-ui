/**
 * FURS Settings Hooks
 * TanStack Query hooks for FURS settings management
 */

import type {
  FursBusinessPremise,
  GetFursSettings200,
  RegisterFursMovablePremiseBody,
  RegisterFursRealEstatePremiseBody,
  UpdateFursSettingsBody,
  UpdateUserFursSettingsBody,
  UploadFursCertificate200,
  User,
} from "@spaceinvoices/js-sdk";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useSDK } from "../../../providers/sdk-provider";

/**
 * Query Keys
 */
export const fursQueryKeys = {
  settings: (entityId: string) => ["furs", "settings", entityId] as const,
  premises: (entityId: string) => ["furs", "premises", entityId] as const,
  premise: (premiseId: string) => ["furs", "premise", premiseId] as const,
  devices: (premiseId: string) => ["furs", "devices", premiseId] as const,
  currentUser: () => ["user", "me"] as const,
};

/**
 * Hook: Get FURS settings
 */
export function useFursSettings(
  entityId: string,
  options?: Omit<UseQueryOptions<GetFursSettings200>, "queryKey" | "queryFn">,
) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: fursQueryKeys.settings(entityId),
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");
      if (!entityId) throw new Error("Entity ID required");
      return sdk.fursSettings.list({ entity_id: entityId });
    },
    enabled: !!sdk && !!entityId,
    staleTime: 0, // Always fetch fresh data
    ...options,
  });
}

/**
 * Hook: Update FURS settings
 */
export function useUpdateFursSettings(
  options?: UseMutationOptions<GetFursSettings200, Error, { entityId: string; data: UpdateFursSettingsBody }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursSettings.update(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate settings query
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.settings(variables.entityId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Upload FURS certificate
 */
export function useUploadFursCertificate(
  options?: UseMutationOptions<UploadFursCertificate200, Error, { entityId: string; file: Blob; passphrase: string }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, file, passphrase }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursCertificate.uploadFursCertificate({ file, passphrase }, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate settings query to refresh certificate status
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.settings(variables.entityId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: List business premises
 */
export function useFursPremises(
  entityId: string,
  options?: Omit<UseQueryOptions<FursBusinessPremise[]>, "queryKey" | "queryFn">,
) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: fursQueryKeys.premises(entityId),
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursPremises.listFursBusinessPremises({ entity_id: entityId });
    },
    enabled: !!sdk,
    staleTime: 0, // Always fetch fresh data to reflect device changes
    ...options,
  });
}

/**
 * Hook: Register real estate premise
 */
export function useRegisterRealEstatePremise(
  options?: UseMutationOptions<any, Error, { entityId: string; data: RegisterFursRealEstatePremiseBody }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursPremises.registerFursRealEstatePremise(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate premises list
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.premises(variables.entityId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Register movable premise
 */
export function useRegisterMovablePremise(
  options?: UseMutationOptions<any, Error, { entityId: string; data: RegisterFursMovablePremiseBody }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursPremises.registerFursMovablePremise(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate premises list
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.premises(variables.entityId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Close premise
 */
export function useClosePremise(options?: UseMutationOptions<any, Error, { entityId: string; premiseId: string }>) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursPremises.closeFursBusinessPremise(premiseId, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate premises list
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.premises(variables.entityId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * Hook: Register electronic device
 */
export function useRegisterElectronicDevice(
  options?: UseMutationOptions<any, Error, { entityId: string; premiseId: string; deviceName: string }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId, deviceName }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.fursDevices.registerFursElectronicDevice(premiseId, { name: deviceName }, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate premises list to refresh devices
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.premises(variables.entityId),
      });
      // Invalidate devices list for this premise
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.devices(variables.premiseId),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}

/**
 * User FURS settings type (stored in user.settings as furs_<entity_id>)
 */
export interface UserFursSettings {
  operator_tax_number?: string;
  operator_label?: string;
}

/**
 * Hook: Get current user
 */
export function useCurrentUser(options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: fursQueryKeys.currentUser(),
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.users.getMe();
    },
    enabled: !!sdk,
    staleTime: 1000 * 60 * 5, // 5 minutes - user data doesn't change often
    ...options,
  });
}

/**
 * Hook: Get user FURS settings for a specific entity
 * Extracts FURS settings from user.settings using the furs_<entity_id> key
 */
export function useUserFursSettings(entityId: string, options?: { enabled?: boolean }) {
  const {
    data: user,
    isLoading,
    error,
    ...rest
  } = useCurrentUser(options?.enabled === false ? { enabled: false } : undefined);

  const userFursSettings = useMemo<UserFursSettings | null>(() => {
    if (!user?.settings) return null;
    const key = `furs_${entityId}`;
    const settings = (user.settings as Record<string, unknown>)[key];
    if (!settings || typeof settings !== "object") return null;
    return settings as UserFursSettings;
  }, [user?.settings, entityId]);

  return { data: userFursSettings, user, isLoading, error, ...rest };
}

/**
 * Hook: Update user FURS settings for a specific entity
 */
export function useUpdateUserFursSettings(
  options?: UseMutationOptions<User, Error, { entityId: string; data: UpdateUserFursSettingsBody }>,
) {
  const { sdk } = useSDK();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      if (!sdk) throw new Error("SDK not initialized");
      return sdk.users.updateFursSettings(data, { entity_id: entityId });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate current user query to refresh settings
      queryClient.invalidateQueries({
        queryKey: fursQueryKeys.currentUser(),
      });
      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        (options.onSuccess as (d: any, v: any, c: any) => void)(data, variables, context);
      }
    },
  });
}
