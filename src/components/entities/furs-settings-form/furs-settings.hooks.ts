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
import { downloadBlob, fursCertificate, fursDevices, fursPremises, fursSettings, users } from "@spaceinvoices/js-sdk";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

type TranslationFn = (key: string) => string;
type InternalActFormat = "pdf" | "docx";
type FursInternalActApi = {
  generateFursInternalActPdf?: (options?: { entity_id?: string; signal?: AbortSignal }) => Promise<Blob>;
  generateFursInternalActDocx?: (options?: { entity_id?: string; signal?: AbortSignal }) => Promise<Blob>;
  downloadPdf?: (options?: { entity_id?: string; signal?: AbortSignal }) => Promise<Blob>;
  downloadDocx?: (options?: { entity_id?: string; signal?: AbortSignal }) => Promise<Blob>;
};

function getInternalActDownloadFilename(format: InternalActFormat) {
  const date = new Date().toISOString().slice(0, 10);
  return `furs-interni-akt-${date}.${format}`;
}

function getInternalActDownloadSuccessKey(format: InternalActFormat) {
  return format === "pdf" ? "Internal act PDF downloaded" : "Internal act DOCX downloaded";
}

function getInternalActDownloadPendingKey(format: InternalActFormat) {
  return format === "pdf" ? "Preparing PDF..." : "Preparing DOCX...";
}

function getInternalActDownloadErrorDescription(error: unknown, t: TranslationFn) {
  const apiMessage = (error as any)?.data?.message || (error as Error | undefined)?.message;

  if (typeof apiMessage === "string") {
    const normalizedMessage = apiMessage.toLowerCase();

    if (normalizedMessage.includes("certificate")) {
      return t("Upload a valid certificate to download the internal act");
    }

    if (normalizedMessage.includes("premise")) {
      return t("Register at least one active business premise to download the internal act");
    }

    if (normalizedMessage.includes("device")) {
      return t("Register at least one electronic device to download the internal act");
    }

    return apiMessage;
  }

  return t("Internal act download unavailable");
}

function getInternalActDownloader(api: FursInternalActApi, format: InternalActFormat) {
  if (format === "pdf") {
    return api.generateFursInternalActPdf ?? api.downloadPdf;
  }

  return api.generateFursInternalActDocx ?? api.downloadDocx;
}

async function loadFursInternalActApi(): Promise<FursInternalActApi> {
  try {
    const module = (await import("../../../../../js-sdk/src/sdk/furs-internal-act.ts")) as unknown as {
      fursInternalAct?: FursInternalActApi;
    };

    if (!module.fursInternalAct) {
      throw new Error("FURS internal act SDK module is not available");
    }

    return module.fursInternalAct;
  } catch (error) {
    throw new Error("FURS internal act download is not available yet", {
      cause: error,
    });
  }
}

/**
 * Hook: Get FURS settings
 */
export function useFursSettings(
  entityId: string,
  options?: Omit<UseQueryOptions<GetFursSettings200>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: fursQueryKeys.settings(entityId),
    queryFn: async () => {
      if (!entityId) throw new Error("Entity ID required");
      return fursSettings.list({ entity_id: entityId });
    },
    enabled: !!entityId,
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      return fursSettings.update(data, { entity_id: entityId });
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, file, passphrase }) => {
      return fursCertificate.uploadFursCertificate({ file, passphrase }, { entity_id: entityId });
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
  return useQuery({
    queryKey: fursQueryKeys.premises(entityId),
    queryFn: async () => fursPremises.listFursBusinessPremises({ entity_id: entityId }),
    enabled: !!entityId,
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      return fursPremises.registerFursRealEstatePremise(data, { entity_id: entityId });
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      return fursPremises.registerFursMovablePremise(data, { entity_id: entityId });
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId }) => {
      return fursPremises.closeFursBusinessPremise(premiseId, { entity_id: entityId });
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, premiseId, deviceName }) => {
      return fursDevices.registerFursElectronicDevice(premiseId, { name: deviceName }, { entity_id: entityId });
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
  return useQuery({
    queryKey: fursQueryKeys.currentUser(),
    queryFn: async () => users.getMe(),
    enabled: options?.enabled,
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
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ entityId, data }) => {
      return users.updateFursSettings(data, { entity_id: entityId });
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

/**
 * Hook: Download the FURS internal act in PDF or DOCX format.
 */
export function useFursInternalActDownloads(t: TranslationFn) {
  const [downloadFormat, setDownloadFormat] = useState<InternalActFormat | null>(null);

  const downloadInternalAct = async (entityId: string, format: InternalActFormat) => {
    if (!entityId) {
      toast.error(t("Failed to download internal act"), {
        description: t("Internal act download unavailable"),
      });
      return;
    }

    toast.message(t(getInternalActDownloadPendingKey(format)));
    setDownloadFormat(format);

    try {
      const fursInternalAct = await loadFursInternalActApi();
      const downloadInternalActFile = getInternalActDownloader(fursInternalAct, format);

      if (!downloadInternalActFile) {
        throw new Error("FURS internal act download is not available yet");
      }

      const blob = await downloadInternalActFile({ entity_id: entityId });

      downloadBlob(blob, getInternalActDownloadFilename(format));

      toast.success(t(getInternalActDownloadSuccessKey(format)), {
        description: t(
          "The internal act contains your current business premises, devices, and invoice numbering setup.",
        ),
      });
    } catch (error) {
      console.error("Error downloading FURS internal act:", error);

      toast.error(t("Failed to download internal act"), {
        description: getInternalActDownloadErrorDescription(error, t),
      });
    } finally {
      setDownloadFormat(null);
    }
  };

  return {
    downloadFursInternalActPdf: async (entityId: string) => downloadInternalAct(entityId, "pdf"),
    downloadFursInternalActDocx: async (entityId: string) => downloadInternalAct(entityId, "docx"),
    isDownloadingPdf: downloadFormat === "pdf",
    isDownloadingDocx: downloadFormat === "docx",
  };
}
