import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

const mockSDK = {
  fursSettings: {
    get: mock(async () => ({})),
    update: mock(async () => ({})),
    uploadCertificate: mock(async () => ({})),
  },
  fursFiscalization: {
    listPremises: mock(async () => []),
    registerRealEstatePremise: mock(async () => ({})),
    registerMovablePremise: mock(async () => ({})),
    closePremise: mock(async () => ({})),
    registerDevice: mock(async () => ({})),
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import {
  fursQueryKeys,
  useClosePremise,
  useFursPremises,
  useFursSettings,
  useRegisterElectronicDevice,
  useRegisterMovablePremise,
  useRegisterRealEstatePremise,
  useUpdateFursSettings,
  useUploadFursCertificate,
} from "@/ui/components/entities/furs-settings-form/furs-settings.hooks";

describe("FURS Settings Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Clear all SDK mocks
    mockSDK.fursSettings.get.mockClear();
    mockSDK.fursSettings.update.mockClear();
    mockSDK.fursSettings.uploadCertificate.mockClear();
    mockSDK.fursFiscalization.listPremises.mockClear();
    mockSDK.fursFiscalization.registerRealEstatePremise.mockClear();
    mockSDK.fursFiscalization.registerMovablePremise.mockClear();
    mockSDK.fursFiscalization.closePremise.mockClear();
    mockSDK.fursFiscalization.registerDevice.mockClear();

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
    });
  });

  describe("useFursSettings", () => {
    it("should fetch FURS settings successfully", async () => {
      const mockSettings = {
        enabled: true,
        has_certificate: true,
        tax_number: "12345678",
      };

      mockSDK.fursSettings.get.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useFursSettings("ent_123"), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(mockSDK.fursSettings.get).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle error when SDK not initialized", async () => {
      const { result } = renderHook(() => useFursSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.fursSettings.get).not.toHaveBeenCalled();
    });

    it("should not fetch when entityId is empty", () => {
      const { result } = renderHook(() => useFursSettings(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.fursSettings.get).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateFursSettings", () => {
    it("should update FURS settings successfully", async () => {
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
    it("should upload certificate successfully", async () => {
      const mockResponse = {
        has_certificate: true,
        certificate_valid_until: "2025-12-31",
      };

      mockSDK.fursSettings.uploadCertificate.mockResolvedValue(mockResponse);

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

      // SDK signature: uploadCertificate(file, passphrase, { entity_id })
      expect(mockSDK.fursSettings.uploadCertificate).toHaveBeenCalledWith(mockFile, "secret123", {
        entity_id: "ent_123",
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should invalidate settings query after upload", async () => {
      mockSDK.fursSettings.uploadCertificate.mockResolvedValue({});

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
      mockSDK.fursSettings.uploadCertificate.mockRejectedValue(new Error("Invalid certificate or passphrase"));

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
    it("should fetch premises list successfully", async () => {
      const mockPremises = [
        { id: "prem_1", name: "Main Office", type: "real_estate" },
        { id: "prem_2", name: "Mobile Unit", type: "movable" },
      ];

      mockSDK.fursFiscalization.listPremises.mockResolvedValue(mockPremises);

      const { result } = renderHook(() => useFursPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPremises);
      expect(mockSDK.fursFiscalization.listPremises).toHaveBeenCalledWith({
        entity_id: "ent_123",
      });
    });

    it("should handle empty premises list", async () => {
      mockSDK.fursFiscalization.listPremises.mockResolvedValue([]);

      const { result } = renderHook(() => useFursPremises("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useRegisterRealEstatePremise", () => {
    it("should register real estate premise successfully", async () => {
      const mockResponse = {
        id: "prem_123",
        type: "real_estate",
      };

      mockSDK.fursFiscalization.registerRealEstatePremise.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterRealEstatePremise(), { wrapper });

      const premiseData = {
        business_premise_id: "BP01",
        address: "Main Street 123",
        cadastral_number: 1234,
      };

      result.current.mutate({
        entityId: "ent_123",
        data: premiseData,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerRealEstatePremise(data, { entity_id })
      expect(mockSDK.fursFiscalization.registerRealEstatePremise).toHaveBeenCalledWith(premiseData, {
        entity_id: "ent_123",
      });
    });

    it("should invalidate premises list after registration", async () => {
      mockSDK.fursFiscalization.registerRealEstatePremise.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterRealEstatePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP01" },
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
    it("should register movable premise successfully", async () => {
      mockSDK.fursFiscalization.registerMovablePremise.mockResolvedValue({
        id: "prem_456",
      });

      const { result } = renderHook(() => useRegisterMovablePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP02" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerMovablePremise(data, { entity_id })
      expect(mockSDK.fursFiscalization.registerMovablePremise).toHaveBeenCalledWith(
        { business_premise_id: "BP02" },
        { entity_id: "ent_123" },
      );
    });

    it("should invalidate premises list after registration", async () => {
      mockSDK.fursFiscalization.registerMovablePremise.mockResolvedValue({});

      const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRegisterMovablePremise(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        data: { business_premise_id: "BP02" },
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
    it("should close premise successfully", async () => {
      mockSDK.fursFiscalization.closePremise.mockResolvedValue({
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

      // SDK signature: closePremise(premiseId, { entity_id })
      expect(mockSDK.fursFiscalization.closePremise).toHaveBeenCalledWith("prem_123", { entity_id: "ent_123" });
    });

    it("should invalidate premises list after closing", async () => {
      mockSDK.fursFiscalization.closePremise.mockResolvedValue({});

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
      mockSDK.fursFiscalization.closePremise.mockRejectedValue(new Error("Premise has active devices"));

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
    it("should register electronic device successfully", async () => {
      const mockResponse = {
        id: "dev_123",
        name: "Cash Register 1",
      };

      mockSDK.fursFiscalization.registerDevice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterElectronicDevice(), { wrapper });

      result.current.mutate({
        entityId: "ent_123",
        premiseId: "prem_123",
        deviceName: "Cash Register 1",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: registerDevice(premiseId, data, { entity_id })
      expect(mockSDK.fursFiscalization.registerDevice).toHaveBeenCalledWith(
        "prem_123",
        { name: "Cash Register 1" },
        { entity_id: "ent_123" },
      );

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should invalidate both premises and devices queries", async () => {
      mockSDK.fursFiscalization.registerDevice.mockResolvedValue({});

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
      mockSDK.fursFiscalization.registerDevice.mockRejectedValue(new Error("Device name already exists"));

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
});
