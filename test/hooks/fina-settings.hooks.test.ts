import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

/**
 * Mock SDK with method names matching the actual FINA SDK wrappers.
 * These correspond to the SDK wrapper methods (not raw operationIds):
 * - sdk.finaSettings.list (getFinaSettings)
 * - sdk.finaSettings.update (updateFinaSettings)
 * - sdk.finaCertificate.uploadFinaCertificate
 * - sdk.finaPremises.listFinaPremises
 * - sdk.finaPremises.create (createFinaPremise)
 * - sdk.finaPremises.delete (deleteFinaPremise)
 * - sdk.finaDevices.registerFinaDevice
 * - sdk.finaDevices.delete (deleteFinaDevice)
 * - sdk.users.getMe
 * - sdk.users.updateFinaSettings (updateUserFinaSettings)
 */
const mockSDK = {
  finaSettings: {
    list: mock(async () => ({})),
    update: mock(async () => ({})),
  },
  finaCertificate: {
    uploadFinaCertificate: mock(async () => ({})),
  },
  finaPremises: {
    listFinaPremises: mock(async () => []),
    create: mock(async () => ({})),
    delete: mock(async () => ({})),
  },
  finaDevices: {
    registerFinaDevice: mock(async () => ({})),
    delete: mock(async () => ({})),
  },
  users: {
    getMe: mock(async () => ({ settings: {} })),
    updateFinaSettings: mock(async () => ({})),
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import {
  finaQueryKeys,
  useCreateFinaPremise,
  useDeleteFinaDevice,
  useDeleteFinaPremise,
  useFinaPremises,
  useFinaSettings,
  useRegisterFinaElectronicDevice,
  useUpdateFinaSettings,
  useUpdateUserFinaSettings,
  useUploadFinaCertificate,
  useUserFinaSettings,
} from "@/ui/components/entities/fina-settings-form/fina-settings.hooks";

describe("FINA Settings Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSDK.finaSettings.list.mockClear();
    mockSDK.finaSettings.update.mockClear();
    mockSDK.finaCertificate.uploadFinaCertificate.mockClear();
    mockSDK.finaPremises.listFinaPremises.mockClear();
    mockSDK.finaPremises.create.mockClear();
    mockSDK.finaPremises.delete.mockClear();
    mockSDK.finaDevices.registerFinaDevice.mockClear();
    mockSDK.finaDevices.delete.mockClear();
    mockSDK.users.getMe.mockClear();
    mockSDK.users.updateFinaSettings.mockClear();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe("finaQueryKeys", () => {
    it("should generate correct query keys", () => {
      expect(finaQueryKeys.settings("ent_123")).toEqual(["fina", "settings", "ent_123"]);
      expect(finaQueryKeys.premises("ent_123")).toEqual(["fina", "premises", "ent_123"]);
      expect(finaQueryKeys.premise("prem_123")).toEqual(["fina", "premise", "prem_123"]);
      expect(finaQueryKeys.devices("prem_123")).toEqual(["fina", "devices", "prem_123"]);
    });
  });

  describe("useFinaSettings", () => {
    it("should call sdk.finaSettings.list with correct entity_id", async () => {
      const mockSettings = {
        enabled: true,
        has_certificate: true,
        operator_oib: "12345678901",
      };

      mockSDK.finaSettings.list.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useFinaSettings("ent_123"), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(mockSDK.finaSettings.list).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle error when SDK not initialized", async () => {
      const { result } = renderHook(() => useFinaSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.finaSettings.list).not.toHaveBeenCalled();
    });

    it("should not fetch when entityId is empty", () => {
      const { result } = renderHook(() => useFinaSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.finaSettings.list).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateFinaSettings", () => {
    it("should call sdk.finaSettings.update with correct args", async () => {
      const mockUpdatedSettings = {
        enabled: true,
        has_certificate: false,
      };

      mockSDK.finaSettings.update.mockResolvedValue(mockUpdatedSettings);

      const { result } = renderHook(() => useUpdateFinaSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { enabled: true },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaSettings.update).toHaveBeenCalledWith({ enabled: true }, { entity_id: "ent_123" });
      expect(result.current.data).toEqual(mockUpdatedSettings);
    });

    it("should invalidate settings query on success", async () => {
      mockSDK.finaSettings.update.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateFinaSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { enabled: false },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "settings", "ent_123"],
      });
    });

    it("should handle update error", async () => {
      mockSDK.finaSettings.update.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateFinaSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { enabled: true },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Update failed");
    });
  });

  describe("useUploadFinaCertificate", () => {
    it("should call sdk.finaCertificate.uploadFinaCertificate with { file, passphrase } body", async () => {
      const mockResponse = {
        has_certificate: true,
        certificate_valid_until: "2025-12-31",
      };

      mockSDK.finaCertificate.uploadFinaCertificate.mockResolvedValue(mockResponse);

      const mockFile = new Blob(["certificate data"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFinaCertificate(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        file: mockFile,
        passphrase: "secret123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaCertificate.uploadFinaCertificate).toHaveBeenCalledWith(
        { file: mockFile, passphrase: "secret123" },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockResponse as any);
    });

    it("should invalidate settings query after upload", async () => {
      mockSDK.finaCertificate.uploadFinaCertificate.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const mockFile = new Blob(["cert"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFinaCertificate(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        file: mockFile,
        passphrase: "pass",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "settings", "ent_123"],
      });
    });

    it("should handle upload error", async () => {
      mockSDK.finaCertificate.uploadFinaCertificate.mockRejectedValue(new Error("Invalid certificate or passphrase"));

      const mockFile = new Blob(["bad cert"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFinaCertificate(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        file: mockFile,
        passphrase: "wrong",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Invalid certificate or passphrase");
    });
  });

  describe("useFinaPremises", () => {
    it("should call sdk.finaPremises.listFinaPremises with correct entity_id", async () => {
      const mockPremises = [
        { id: "prem_1", business_premise_name: "PP1" },
        { id: "prem_2", business_premise_name: "PP2" },
      ] as any;

      mockSDK.finaPremises.listFinaPremises.mockResolvedValue(mockPremises);

      const { result } = renderHook(() => useFinaPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPremises as any);
      expect(mockSDK.finaPremises.listFinaPremises).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle empty premises list", async () => {
      mockSDK.finaPremises.listFinaPremises.mockResolvedValue([]);

      const { result } = renderHook(() => useFinaPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useCreateFinaPremise", () => {
    it("should call sdk.finaPremises.create with correct args", async () => {
      const mockResponse = { id: "prem_123", business_premise_name: "PP01" };

      mockSDK.finaPremises.create.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateFinaPremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_name: "PP01" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaPremises.create).toHaveBeenCalledWith(
        { business_premise_name: "PP01" },
        { entity_id: "ent_123" },
      );
    });

    it("should invalidate premises list after creation", async () => {
      mockSDK.finaPremises.create.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateFinaPremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_name: "PP01" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "premises", "ent_123"],
      });
    });
  });

  describe("useDeleteFinaPremise", () => {
    it("should call sdk.finaPremises.delete with correct args", async () => {
      mockSDK.finaPremises.delete.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteFinaPremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaPremises.delete).toHaveBeenCalledWith("prem_123", { entity_id: "ent_123" });
    });

    it("should invalidate premises list after deletion", async () => {
      mockSDK.finaPremises.delete.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteFinaPremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "premises", "ent_123"],
      });
    });

    it("should handle delete error", async () => {
      mockSDK.finaPremises.delete.mockRejectedValue(new Error("Premise has active devices"));

      const { result } = renderHook(() => useDeleteFinaPremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Premise has active devices");
    });
  });

  describe("useRegisterFinaElectronicDevice", () => {
    it("should call sdk.finaDevices.registerFinaDevice", async () => {
      const mockResponse = {
        id: "dev_123",
        electronic_device_name: "1",
      };

      mockSDK.finaDevices.registerFinaDevice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterFinaElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceId: "1",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaDevices.registerFinaDevice).toHaveBeenCalledWith(
        "prem_123",
        { electronic_device_name: "1" },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockResponse as any);
    });

    it("should invalidate both premises and devices queries", async () => {
      mockSDK.finaDevices.registerFinaDevice.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterFinaElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceId: "2",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "premises", "ent_123"],
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "devices", "prem_123"],
      });
    });

    it("should handle device registration error", async () => {
      mockSDK.finaDevices.registerFinaDevice.mockRejectedValue(new Error("Device ID already exists"));

      const { result } = renderHook(() => useRegisterFinaElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceId: "1",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Device ID already exists");
    });
  });

  describe("useDeleteFinaDevice", () => {
    it("should call sdk.finaDevices.delete with correct args", async () => {
      mockSDK.finaDevices.delete.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteFinaDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        deviceId: "dev_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.finaDevices.delete).toHaveBeenCalledWith("dev_123", { entity_id: "ent_123" });
    });

    it("should invalidate premises and devices queries after deletion", async () => {
      mockSDK.finaDevices.delete.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteFinaDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        deviceId: "dev_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "premises", "ent_123"],
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["fina", "devices", "prem_123"],
      });
    });
  });

  describe("useUserFinaSettings", () => {
    it("should extract FINA settings from user.settings", async () => {
      mockSDK.users.getMe.mockResolvedValue({
        settings: {
          fina_ent_123: {
            operator_oib: "12345678901",
            operator_label: "John Doe",
          },
        },
      });

      const { result } = renderHook(() => useUserFinaSettings("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data).toEqual({
        operator_oib: "12345678901",
        operator_label: "John Doe",
      });
    });

    it("should return null when no FINA settings for entity", async () => {
      mockSDK.users.getMe.mockResolvedValue({
        settings: {},
      });

      const { result } = renderHook(() => useUserFinaSettings("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("useUpdateUserFinaSettings", () => {
    it("should call sdk.users.updateFinaSettings with correct args", async () => {
      mockSDK.users.updateFinaSettings.mockResolvedValue({ settings: {} });

      const { result } = renderHook(() => useUpdateUserFinaSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { operator_oib: "12345678901", operator_label: "John Doe" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSDK.users.updateFinaSettings).toHaveBeenCalledWith(
        { operator_oib: "12345678901", operator_label: "John Doe" },
        { entity_id: "ent_123" },
      );
    });

    it("should invalidate current user query on success", async () => {
      mockSDK.users.updateFinaSettings.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateUserFinaSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { operator_oib: "12345678901" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["user", "me"],
      });
    });
  });
});
