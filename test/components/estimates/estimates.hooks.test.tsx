import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  ESTIMATES_CACHE_KEY,
  useCreateEstimate,
  useDeleteEstimate,
  useUpdateEstimate,
} from "@/ui/components/estimates/estimates.hooks";

// Mock the SDK provider - uses new SDK method names
const mockEstimatesApi = {
  create: mock(),
  update: mock(),
  delete: mock(),
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: {
      estimates: mockEstimatesApi,
    },
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

describe("Estimates Hooks (Factory-based)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockEstimatesApi.create.mockReset();
    mockEstimatesApi.update.mockReset();
    mockEstimatesApi.delete.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useCreateEstimate", () => {
    test("should call createEstimate with correct parameters", async () => {
      const mockEstimate = {
        id: "est_123",
        number: "EST-001",
        date: "2024-01-01",
        date_valid_till: "2024-02-01",
        items: [],
      };

      mockEstimatesApi.create.mockResolvedValue(mockEstimate);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useCreateEstimate({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      const inputData = {
        number: "EST-001",
        date: "2024-01-01",
        date_valid_till: "2024-02-01",
        items: [],
      };

      result.current.mutate(inputData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: create(data, { entity_id })
      expect(mockEstimatesApi.create).toHaveBeenCalledWith(inputData, { entity_id: "entity-123" });
      expect(onSuccess).toHaveBeenCalledWith(mockEstimate, inputData, expect.anything());
    });

    test("should call onError when creation fails", async () => {
      const error = new Error("Creation failed");
      mockEstimatesApi.create.mockRejectedValue(error);

      const onError = mock();
      const { result } = renderHook(
        () =>
          useCreateEstimate({
            entityId: "entity-123",
            onError,
          }),
        { wrapper },
      );

      result.current.mutate({ date: "2024-01-01", items: [] } as any);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // React Query passes additional arguments to onError
      expect(onError.mock.calls[0][0]).toBe(error);
    });
  });

  describe("useUpdateEstimate", () => {
    test("should call updateEstimate with correct parameters", async () => {
      const mockUpdatedEstimate = {
        id: "est_123",
        number: "EST-001-UPDATED",
        date: "2024-01-01",
        date_valid_till: "2024-03-01",
        items: [],
      };

      mockEstimatesApi.update.mockResolvedValue(mockUpdatedEstimate);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useUpdateEstimate({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      const updateData = {
        id: "est_123",
        data: {
          date_valid_till: "2024-03-01",
        },
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: update(id, data, { entity_id })
      expect(mockEstimatesApi.update).toHaveBeenCalledWith(
        "est_123",
        { date_valid_till: "2024-03-01" },
        { entity_id: "entity-123" },
      );
      expect(onSuccess).toHaveBeenCalledWith(mockUpdatedEstimate, updateData, expect.anything());
    });
  });

  describe("useDeleteEstimate", () => {
    test("should call delete with correct parameters", async () => {
      mockEstimatesApi.delete.mockResolvedValue(undefined);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useDeleteEstimate({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      // Factory expects { id } for delete methods
      const deleteData = { id: "est_123" };
      result.current.mutate(deleteData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: delete(id, { entity_id })
      expect(mockEstimatesApi.delete).toHaveBeenCalledWith("est_123", { entity_id: "entity-123" });
      // Delete onSuccess receives (data=undefined, variables, context=undefined for delete)
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess.mock.calls[0][0]).toBeUndefined();
      expect(onSuccess.mock.calls[0][1]).toEqual(deleteData);
    });
  });

  describe("Cache key export", () => {
    test("should export ESTIMATES_CACHE_KEY constant", () => {
      expect(ESTIMATES_CACHE_KEY).toBe("estimates");
    });
  });
});
