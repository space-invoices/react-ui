import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  ADVANCE_INVOICES_CACHE_KEY,
  getLastUsedFursCombo,
  setLastUsedFursCombo,
  useCreateAdvanceInvoice,
} from "@/ui/components/advance-invoices/advance-invoices.hooks";

// Mock the SDK provider - uses new SDK method names
const mockAdvanceInvoicesApi = {
  create: mock(),
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: {
      advanceInvoices: mockAdvanceInvoicesApi,
    },
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

describe("Advance Invoices Hooks", () => {
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
    mockAdvanceInvoicesApi.create.mockReset();

    // Clear localStorage for FURS combo tests
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useCreateAdvanceInvoice", () => {
    test("should call createAdvanceInvoice with correct parameters", async () => {
      const mockAdvanceInvoice = {
        id: "adv_123",
        number: "ADV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
        total: 1000,
        total_with_tax: 1220,
      };

      mockAdvanceInvoicesApi.create.mockResolvedValue(mockAdvanceInvoice);

      const onSuccess = mock();
      const { result } = renderHook(
        () =>
          useCreateAdvanceInvoice({
            entityId: "entity-123",
            onSuccess,
          }),
        { wrapper },
      );

      const inputData = {
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [{ name: "Prepayment", quantity: 1, price: 1000 }],
      };

      result.current.mutate(inputData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // SDK signature: create(data, { entity_id })
      expect(mockAdvanceInvoicesApi.create).toHaveBeenCalledWith(inputData, { entity_id: "entity-123" });
      expect(onSuccess).toHaveBeenCalledWith(mockAdvanceInvoice);
    });

    test("should call onError when creation fails", async () => {
      const error = new Error("Creation failed");
      mockAdvanceInvoicesApi.create.mockRejectedValue(error);

      const onError = mock();
      const { result } = renderHook(
        () =>
          useCreateAdvanceInvoice({
            entityId: "entity-123",
            onError,
          }),
        { wrapper },
      );

      result.current.mutate({
        date: "2024-01-01",
        items: [{ name: "Prepayment", quantity: 1, price: 1000 }],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // React Query passes error to onError
      expect(onError.mock.calls[0][0]).toBe(error);
    });

    test("should invalidate advance invoices cache on success", async () => {
      const mockAdvanceInvoice = {
        id: "adv_123",
        number: "ADV-001",
        items: [],
      };

      mockAdvanceInvoicesApi.create.mockResolvedValue(mockAdvanceInvoice);

      const invalidateSpy = mock();
      queryClient.invalidateQueries = invalidateSpy;

      const { result } = renderHook(
        () =>
          useCreateAdvanceInvoice({
            entityId: "entity-123",
          }),
        { wrapper },
      );

      result.current.mutate({
        items: [{ name: "Prepayment", quantity: 1, price: 1000 }],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check cache invalidation was called
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe("Cache key export", () => {
    test("should export ADVANCE_INVOICES_CACHE_KEY constant", () => {
      expect(ADVANCE_INVOICES_CACHE_KEY).toBe("advance-invoices");
    });
  });

  describe("FURS Last-Used Combo (localStorage)", () => {
    test("getLastUsedFursCombo returns null when no combo stored", () => {
      const result = getLastUsedFursCombo("entity-123");
      expect(result).toBeNull();
    });

    test("setLastUsedFursCombo stores combo in localStorage", () => {
      const combo = {
        business_premise_name: "PREMISE1",
        electronic_device_name: "DEVICE1",
      };

      setLastUsedFursCombo("entity-123", combo);

      const stored = getLastUsedFursCombo("entity-123");
      expect(stored).toEqual(combo);
    });

    test("getLastUsedFursCombo returns entity-specific combo", () => {
      const combo1 = {
        business_premise_name: "PREMISE1",
        electronic_device_name: "DEVICE1",
      };
      const combo2 = {
        business_premise_name: "PREMISE2",
        electronic_device_name: "DEVICE2",
      };

      setLastUsedFursCombo("entity-1", combo1);
      setLastUsedFursCombo("entity-2", combo2);

      expect(getLastUsedFursCombo("entity-1")).toEqual(combo1);
      expect(getLastUsedFursCombo("entity-2")).toEqual(combo2);
    });
  });
});
