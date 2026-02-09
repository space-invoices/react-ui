import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

// Mock entityStats responses
const mockQueryEntityStats = mock(async (query: any, _options?: { entity_id?: string }) => {
  if (query.table === "invoice_taxes") {
    return {
      data: [
        { rate: 22, tax_total: 1100, quote_currency: "EUR" },
        { rate: 9.5, tax_total: 475, quote_currency: "EUR" },
      ],
    };
  }
  return { data: [] };
});

const mockSDK = {
  entityStats: {
    queryEntityStats: mockQueryEntityStats,
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import { useTaxCollectedData } from "@/ui/components/dashboard/tax-collected-card/use-tax-collected";

describe("useTaxCollectedData", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockQueryEntityStats.mockClear();
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

  it("should return loading state initially", () => {
    const { result } = renderHook(() => useTaxCollectedData("ent_123"), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("should return empty data when entityId is undefined", () => {
    const { result } = renderHook(() => useTaxCollectedData(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data.previousMonth.taxes).toEqual([]);
    expect(result.current.data.currentYear.taxes).toEqual([]);
  });

  it("should fetch and transform previous month taxes", async () => {
    const { result } = renderHook(() => useTaxCollectedData("ent_123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have called stats API for both prev month and year
    expect(mockQueryEntityStats).toHaveBeenCalledTimes(2);
    expect(result.current.data.previousMonth.taxes.length).toBeGreaterThan(0);
    expect(result.current.data.previousMonth.taxes[0]).toHaveProperty("rate");
    expect(result.current.data.previousMonth.taxes[0]).toHaveProperty("amount");
  });

  it("should fetch and transform current year taxes", async () => {
    const { result } = renderHook(() => useTaxCollectedData("ent_123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.currentYear.taxes.length).toBeGreaterThan(0);
    expect(result.current.data.currentYear.total).toBeGreaterThan(0);
    expect(result.current.data.currentYear.label).toMatch(/\d{4}/);
  });

  it("should default currency to EUR when no data", () => {
    mockQueryEntityStats.mockImplementation(async () => ({ data: [] }));

    const { result } = renderHook(() => useTaxCollectedData(undefined), { wrapper });

    expect(result.current.data.currency).toBe("EUR");
  });
});
