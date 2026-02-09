import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  CREDIT_NOTES_CACHE_KEY,
  useCreateCreditNote,
  useDeleteCreditNote,
  useUpdateCreditNote,
} from "@/ui/components/credit-notes/credit-notes.hooks";

// Mock the SDK provider - uses new SDK method names
const mockCreditNotesApi = {
  create: mock(),
  update: mock(),
  delete: mock(),
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: {
      creditNotes: mockCreditNotesApi,
    },
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

describe("Credit Notes Hooks (Factory-based)", () => {
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
    mockCreditNotesApi.create.mockReset();
    mockCreditNotesApi.update.mockReset();
    mockCreditNotesApi.delete.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useCreateCreditNote", () => {
    test("should call createCreditNote with correct parameters", async () => {
      const mockCreditNote = {
        id: "cn_123",
        number: "CN-001",
        date: "2024-01-01",
        items: [],
      };

      mockCreditNotesApi.create.mockResolvedValue(mockCreditNote);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useCreateCreditNote({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      const inputData = {
        number: "CN-001",
        date: "2024-01-01",
        items: [],
      };

      result.current.mutate(inputData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: create(data, { entity_id })
      expect(mockCreditNotesApi.create).toHaveBeenCalledWith(inputData, { entity_id: "entity-123" });
      expect(onSuccess).toHaveBeenCalledWith(mockCreditNote, inputData, expect.anything());
    });

    test("should call onError when creation fails", async () => {
      const error = new Error("Creation failed");
      mockCreditNotesApi.create.mockRejectedValue(error);

      const onError = mock();
      const { result } = renderHook(
        () =>
          useCreateCreditNote({
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

  describe("useUpdateCreditNote", () => {
    test("should call updateCreditNote with correct parameters", async () => {
      const mockUpdatedCreditNote = {
        id: "cn_123",
        number: "CN-001-UPDATED",
        date: "2024-01-01",
        items: [],
      };

      mockCreditNotesApi.update.mockResolvedValue(mockUpdatedCreditNote);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useUpdateCreditNote({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      const updateData = {
        id: "cn_123",
        data: {
          number: "CN-001-UPDATED",
        },
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: update(id, data, { entity_id })
      expect(mockCreditNotesApi.update).toHaveBeenCalledWith(
        "cn_123",
        { number: "CN-001-UPDATED" },
        { entity_id: "entity-123" },
      );
      expect(onSuccess).toHaveBeenCalledWith(mockUpdatedCreditNote, updateData, expect.anything());
    });
  });

  describe("useDeleteCreditNote", () => {
    test("should call delete with correct parameters", async () => {
      mockCreditNotesApi.delete.mockResolvedValue(undefined);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useDeleteCreditNote({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      // Factory expects { id } for delete methods
      const deleteData = { id: "cn_123" };
      result.current.mutate(deleteData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: delete(id, { entity_id })
      expect(mockCreditNotesApi.delete).toHaveBeenCalledWith("cn_123", { entity_id: "entity-123" });
      // Delete onSuccess receives (data=undefined, variables, context=undefined for delete)
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess.mock.calls[0][0]).toBeUndefined();
      expect(onSuccess.mock.calls[0][1]).toEqual(deleteData);
    });
  });

  describe("Cache key export", () => {
    test("should export CREDIT_NOTES_CACHE_KEY constant", () => {
      expect(CREDIT_NOTES_CACHE_KEY).toBe("credit-notes");
    });
  });
});
