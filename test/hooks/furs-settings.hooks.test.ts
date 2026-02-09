import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

/**
 * Mock SDK with correct typed method names matching the actual SDK.
 * These correspond to the operationIds in the OpenAPI spec:
 * - sdk.fursSettings.list (getFursSettings)
 * - sdk.fursSettings.update (updateFursSettings)
 * - sdk.fursCertificate.uploadFursCertificate (uploadFursCertificate)
 * - sdk.fursFiscalization.listFursBusinessPremises (listFursBusinessPremises)
 * - sdk.fursFiscalization.registerFursRealEstatePremise
 * - sdk.fursFiscalization.registerFursMovablePremise
 * - sdk.fursFiscalization.closeFursBusinessPremise
 * - sdk.fursFiscalization.registerFursElectronicDevice
 * - sdk.users.update (updateUser)
 * - sdk.users.getMe (getMe)
 */
const mockSDK = {
  fursSettings: {
    list: mock(async () => ({})),
    update: mock(async () => ({})),
  },
  fursCertificate: {
    uploadFursCertificate: mock(async () => ({})),
  },
  fursFiscalization: {
    listFursBusinessPremises: mock(async () => []),
    registerFursRealEstatePremise: mock(async () => ({})),
    registerFursMovablePremise: mock(async () => ({})),
    closeFursBusinessPremise: mock(async () => ({})),
    registerFursElectronicDevice: mock(async () => ({})),
  },
  users: {
    update: mock(async () => ({})),
    getMe: mock(async () => ({})),
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import {
  fursQueryKeys,
  useClosePremise,
  useCurrentUser,
  useFursPremises,
  useFursSettings,
  useRegisterElectronicDevice,
  useRegisterMovablePremise,
  useRegisterRealEstatePremise,
  useUpdateFursSettings,
  useUpdateUserFursSettings,
  useUploadFursCertificate,
} from "@/ui/components/entities/furs-settings-form/furs-settings.hooks";

describe("FURS Settings Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Clear all SDK mocks
    mockSDK.fursSettings.list.mockClear();
    mockSDK.fursSettings.update.mockClear();
    mockSDK.fursCertificate.uploadFursCertificate.mockClear();
    mockSDK.fursFiscalization.listFursBusinessPremises.mockClear();
    mockSDK.fursFiscalization.registerFursRealEstatePremise.mockClear();
    mockSDK.fursFiscalization.registerFursMovablePremise.mockClear();
    mockSDK.fursFiscalization.closeFursBusinessPremise.mockClear();
    mockSDK.fursFiscalization.registerFursElectronicDevice.mockClear();
    mockSDK.users.update.mockClear();
    mockSDK.users.getMe.mockClear();

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

  describe("fursQueryKeys", () => {
    it("should generate correct query keys", () => {
      expect(fursQueryKeys.settings("ent_123")).toEqual(["furs", "settings", "ent_123"]);
      expect(fursQueryKeys.premises("ent_123")).toEqual(["furs", "premises", "ent_123"]);
      expect(fursQueryKeys.premise("prem_123")).toEqual(["furs", "premise", "prem_123"]);
      expect(fursQueryKeys.devices("prem_123")).toEqual(["furs", "devices", "prem_123"]);
      expect(fursQueryKeys.currentUser()).toEqual(["user", "me"]);
    });
  });

  describe("useFursSettings", () => {
    it("should call sdk.fursSettings.list with correct entity_id", async () => {
      const mockSettings = {
        enabled: true,
        has_certificate: true,
        tax_number: "12345678",
      };

      mockSDK.fursSettings.list.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useFursSettings("ent_123"), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(mockSDK.fursSettings.list).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle error when SDK not initialized", async () => {
      const { result } = renderHook(() => useFursSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.fursSettings.list).not.toHaveBeenCalled();
    });

    it("should not fetch when entityId is empty", () => {
      const { result } = renderHook(() => useFursSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.fursSettings.list).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateFursSettings", () => {
    it("should call sdk.fursSettings.update with correct args", async () => {
      const mockUpdatedSettings = {
        enabled: true,
        has_certificate: false,
      };

      mockSDK.fursSettings.update.mockResolvedValue(mockUpdatedSettings);

      const { result } = renderHook(() => useUpdateFursSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { enabled: true },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: update(data, { entity_id })
      expect(mockSDK.fursSettings.update).toHaveBeenCalledWith({ enabled: true }, { entity_id: "ent_123" });

      expect(result.current.data).toEqual(mockUpdatedSettings);
    });

    it("should invalidate settings query on success", async () => {
      mockSDK.fursSettings.update.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateFursSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { enabled: false },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "settings", "ent_123"],
      });
    });

    it("should handle update error", async () => {
      mockSDK.fursSettings.update.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateFursSettings(), { wrapper });

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

  describe("useUploadFursCertificate", () => {
    it("should call sdk.fursCertificate.uploadFursCertificate with { file, passphrase } body", async () => {
      const mockResponse = {
        has_certificate: true,
        certificate_valid_until: "2025-12-31",
      };

      mockSDK.fursCertificate.uploadFursCertificate.mockResolvedValue(mockResponse);

      const mockFile = new Blob(["certificate data"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFursCertificate(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        file: mockFile,
        passphrase: "secret123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: uploadFursCertificate({ file, passphrase }, { entity_id })
      expect(mockSDK.fursCertificate.uploadFursCertificate).toHaveBeenCalledWith(
        { file: mockFile, passphrase: "secret123" },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockResponse as any);
    });

    it("should invalidate settings query after upload", async () => {
      mockSDK.fursCertificate.uploadFursCertificate.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const mockFile = new Blob(["cert"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFursCertificate(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        file: mockFile,
        passphrase: "pass",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "settings", "ent_123"],
      });
    });

    it("should handle upload error", async () => {
      mockSDK.fursCertificate.uploadFursCertificate.mockRejectedValue(new Error("Invalid certificate or passphrase"));

      const mockFile = new Blob(["bad cert"], { type: "application/x-pkcs12" });

      const { result } = renderHook(() => useUploadFursCertificate(), { wrapper });

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

  describe("useFursPremises", () => {
    it("should call sdk.fursFiscalization.listFursBusinessPremises with correct entity_id", async () => {
      const mockPremises = [
        { id: "prem_1", name: "Main Office", type: "real_estate" },
        { id: "prem_2", name: "Mobile Unit", type: "movable" },
      ] as any;

      mockSDK.fursFiscalization.listFursBusinessPremises.mockResolvedValue(mockPremises);

      const { result } = renderHook(() => useFursPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPremises as any);
      expect(mockSDK.fursFiscalization.listFursBusinessPremises).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle empty premises list", async () => {
      mockSDK.fursFiscalization.listFursBusinessPremises.mockResolvedValue([]);

      const { result } = renderHook(() => useFursPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useRegisterRealEstatePremise", () => {
    it("should call sdk.fursFiscalization.registerFursRealEstatePremise", async () => {
      const mockResponse = {
        id: "prem_123",
        type: "real_estate",
      };

      mockSDK.fursFiscalization.registerFursRealEstatePremise.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterRealEstatePremise(), { wrapper });

      const premiseData = {
        business_premise_id: "BP01",
        address: "Main Street 123",
        cadastral_number: 1234,
      } as any;

      result.current.mutate({
        entityId: "ent_123",
        data: premiseData,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerFursRealEstatePremise(data, { entity_id })
      expect(mockSDK.fursFiscalization.registerFursRealEstatePremise).toHaveBeenCalledWith(premiseData, {
        entity_id: "ent_123",
      });
    });

    it("should invalidate premises list after registration", async () => {
      mockSDK.fursFiscalization.registerFursRealEstatePremise.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterRealEstatePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP01" } as any,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "premises", "ent_123"],
      });
    });
  });

  describe("useRegisterMovablePremise", () => {
    it("should call sdk.fursFiscalization.registerFursMovablePremise", async () => {
      mockSDK.fursFiscalization.registerFursMovablePremise.mockResolvedValue({
        id: "prem_456",
      });

      const { result } = renderHook(() => useRegisterMovablePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP02" } as any,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerFursMovablePremise(data, { entity_id })
      expect(mockSDK.fursFiscalization.registerFursMovablePremise).toHaveBeenCalledWith(
        { business_premise_id: "BP02" },
        { entity_id: "ent_123" },
      );
    });

    it("should invalidate premises list after registration", async () => {
      mockSDK.fursFiscalization.registerFursMovablePremise.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterMovablePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP02" } as any,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "premises", "ent_123"],
      });
    });
  });

  describe("useClosePremise", () => {
    it("should call sdk.fursFiscalization.closeFursBusinessPremise", async () => {
      mockSDK.fursFiscalization.closeFursBusinessPremise.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useClosePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: closeFursBusinessPremise(premiseId, { entity_id })
      expect(mockSDK.fursFiscalization.closeFursBusinessPremise).toHaveBeenCalledWith("prem_123", {
        entity_id: "ent_123",
      });
    });

    it("should invalidate premises list after closing", async () => {
      mockSDK.fursFiscalization.closeFursBusinessPremise.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useClosePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "premises", "ent_123"],
      });
    });

    it("should handle close error", async () => {
      mockSDK.fursFiscalization.closeFursBusinessPremise.mockRejectedValue(new Error("Premise has active devices"));

      const { result } = renderHook(() => useClosePremise(), { wrapper });

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

  describe("useRegisterElectronicDevice", () => {
    it("should call sdk.fursFiscalization.registerFursElectronicDevice", async () => {
      const mockResponse = {
        id: "dev_123",
        name: "Cash Register 1",
      };

      mockSDK.fursFiscalization.registerFursElectronicDevice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceName: "Cash Register 1",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerFursElectronicDevice(premiseId, data, { entity_id })
      expect(mockSDK.fursFiscalization.registerFursElectronicDevice).toHaveBeenCalledWith(
        "prem_123",
        { name: "Cash Register 1" },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockResponse as any);
    });

    it("should invalidate both premises and devices queries", async () => {
      mockSDK.fursFiscalization.registerFursElectronicDevice.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceName: "Device 1",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "premises", "ent_123"],
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["furs", "devices", "prem_123"],
      });
    });

    it("should handle device registration error", async () => {
      mockSDK.fursFiscalization.registerFursElectronicDevice.mockRejectedValue(new Error("Device name already exists"));

      const { result } = renderHook(() => useRegisterElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceName: "Duplicate Name",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Device name already exists");
    });
  });

  describe("useCurrentUser", () => {
    it("should call sdk.users.getMe", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        settings: {},
      };

      mockSDK.users.getMe.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser as any);
      expect(mockSDK.users.getMe).toHaveBeenCalled();
    });
  });

  describe("useUpdateUserFursSettings", () => {
    it("should call sdk.users.update with correct args", async () => {
      const mockUpdatedUser = {
        id: "user_123",
        email: "test@example.com",
        settings: {
          furs_ent_123: {
            operator_tax_number: "12345678",
            operator_label: "OP1",
          },
        },
      };

      mockSDK.users.update.mockResolvedValue(mockUpdatedUser);

      const { result } = renderHook(() => useUpdateUserFursSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: {
          operator_tax_number: "12345678",
          operator_label: "OP1",
        } as any,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: update(data, { entity_id })
      expect(mockSDK.users.update).toHaveBeenCalledWith(
        {
          operator_tax_number: "12345678",
          operator_label: "OP1",
        },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockUpdatedUser as any);
    });

    it("should invalidate currentUser query on success", async () => {
      mockSDK.users.update.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateUserFursSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { operator_tax_number: "12345678" } as any,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["user", "me"],
      });
    });

    it("should handle update error", async () => {
      mockSDK.users.update.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateUserFursSettings(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { operator_tax_number: "invalid" } as any,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Update failed");
    });
  });
});
