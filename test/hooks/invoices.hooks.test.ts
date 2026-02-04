import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

const mockSDK = {
  documents: {
    getNextNumber: mock(async () => ({})),
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import { useNextInvoiceNumber } from "@/ui/components/invoices/invoices.hooks";

describe("Invoice Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSDK.documents.getNextNumber.mockClear();

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

  describe("useNextInvoiceNumber", () => {
    it("should fetch next invoice number successfully", async () => {
      const mockResponse = {
        number: "2025-00042",
        furs: null,
      };

      mockSDK.documents.getNextNumber.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useNextInvoiceNumber("ent_123"), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      // SDK signature: getNextNumber(params, { entity_id })
      expect(mockSDK.documents.getNextNumber).toHaveBeenCalledWith(
        {
          type: "invoice",
          business_premise_name: undefined,
          electronic_device_name: undefined,
        },
        { entity_id: "ent_123" },
      );
    });

    it("should fetch FURS-formatted number when FURS params provided", async () => {
      const mockResponse = {
        number: "P1E1123",
        furs: {
          business_premise_name: "P1",
          electronic_device_name: "E1",
        },
      };

      mockSDK.documents.getNextNumber.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () =>
          useNextInvoiceNumber("ent_123", {
            business_premise_name: "P1",
            electronic_device_name: "E1",
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      // SDK signature: getNextNumber(params, { entity_id })
      expect(mockSDK.documents.getNextNumber).toHaveBeenCalledWith(
        {
          type: "invoice",
          business_premise_name: "P1",
          electronic_device_name: "E1",
        },
        { entity_id: "ent_123" },
      );
    });

    it("should not fetch when entityId is empty", () => {
      const { result } = renderHook(() => useNextInvoiceNumber(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.documents.getNextNumber).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(() => useNextInvoiceNumber("ent_123", { enabled: false }), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockSDK.documents.getNextNumber).not.toHaveBeenCalled();
    });

    it("should handle API error", async () => {
      mockSDK.documents.getNextNumber.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useNextInvoiceNumber("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("API Error");
    });

    it("should include FURS params in query key for cache isolation", async () => {
      mockSDK.documents.getNextNumber.mockResolvedValue({ number: "123", furs: null });

      // First call without FURS params
      const { result: result1 } = renderHook(() => useNextInvoiceNumber("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call with FURS params - should make a new request
      const { result: result2 } = renderHook(
        () =>
          useNextInvoiceNumber("ent_123", {
            business_premise_name: "P1",
            electronic_device_name: "E1",
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should have made 2 separate calls (different query keys)
      expect(mockSDK.documents.getNextNumber).toHaveBeenCalledTimes(2);
    });

    it("should handle null number response (for preview unavailable scenarios)", async () => {
      const mockResponse = {
        number: null,
        furs: null,
      };

      mockSDK.documents.getNextNumber.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useNextInvoiceNumber("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.number).toBeNull();
    });
  });
});
