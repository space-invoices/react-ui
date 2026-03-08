import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

// Mock invoice data
const mockInvoices = [
  {
    id: "inv_1",
    date: "2024-06-15",
    total_with_tax: 1000,
    currency_code: "EUR",
    status: "paid",
    voided_at: null,
    customer: { id: "cust_1", name: "Customer A" },
  },
  {
    id: "inv_2",
    date: "2024-06-10",
    total_with_tax: 500,
    currency_code: "EUR",
    status: "pending",
    voided_at: null,
    customer: { id: "cust_2", name: "Customer B" },
  },
  {
    id: "inv_3",
    date: "2024-05-20",
    total_with_tax: 750,
    currency_code: "EUR",
    status: "overdue",
    voided_at: null,
    customer: { id: "cust_1", name: "Customer A" },
  },
];

// Mock payment data
const mockPayments = [
  { id: "pay_1", date: "2024-06-15", amount: 1000, type: "bank_transfer", invoice: { currency_code: "EUR" } },
  { id: "pay_2", date: "2024-06-10", amount: 500, type: "cash", invoice: { currency_code: "EUR" } },
  { id: "pay_3", date: "2024-05-20", amount: 750, type: "card", invoice: { currency_code: "EUR" } },
];

// Helper to get last 6 months in YYYY-MM format
function getLastMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }
  return months;
}

// Mock entityStats responses based on query type
// The real SDK receives an array of queries and returns an array of results
function resolveQuery(query: any) {
  const table = query.table;
  const groupBy = query.group_by || [];

  // Payment trend data - group by month
  if (table === "payments" && groupBy.includes("month")) {
    return {
      data: getLastMonths(6).map((month) => ({
        month,
        amount: 1000,
        currency_code: "EUR",
      })),
    };
  }

  // Payment methods data - group by type
  if (table === "payments" && groupBy.includes("type")) {
    return {
      data: [
        { type: "bank_transfer", amount: 2000, currency_code: "EUR" },
        { type: "cash", amount: 500, currency_code: "EUR" },
        { type: "card", amount: 1500, currency_code: "EUR" },
      ],
    };
  }

  // Revenue trend data - group by month (invoices table)
  if (table === "invoices" && groupBy.includes("month")) {
    return {
      data: getLastMonths(6).map((month) => ({
        month,
        revenue: 2000,
        quote_currency: "EUR",
      })),
    };
  }

  // Credit notes trend data
  if (table === "credit_notes" && groupBy.includes("month")) {
    return { data: [] };
  }

  // Collection rate queries (no group_by, sum metrics)
  const metrics = query.metrics || [];
  const hasSumMetric = metrics.some((m: any) => m.type === "sum");

  if (table === "invoices" && hasSumMetric && !groupBy.length) {
    return { data: [{ total: 10000 }] };
  }

  if (table === "payments" && hasSumMetric && !groupBy.length) {
    const filters = query.filters || {};
    // Invoice payments (credit_note_id IS NULL)
    if (filters.credit_note_id === null) {
      return { data: [{ total: 7000 }] };
    }
    // Credit note payments (credit_note_id IS NOT NULL)
    if (filters.credit_note_id && typeof filters.credit_note_id === "object" && filters.credit_note_id.not === null) {
      return { data: [{ total: 500 }] };
    }
  }

  if (table === "credit_notes" && hasSumMetric && !groupBy.length) {
    return { data: [{ total: 2000 }] };
  }

  // Top customers data
  if (table === "invoices" && groupBy.includes("customer_name")) {
    return {
      data: [
        { customer_name: "Customer A", customer_id: "cust_1", revenue: 5000, quote_currency: "EUR" },
        { customer_name: "Customer B", customer_id: "cust_2", revenue: 3000, quote_currency: "EUR" },
      ],
    };
  }

  // Default empty response
  return { data: [] };
}

const mockQueryEntityStats = mock(async (queries: any[], _options?: { entity_id?: string }) => {
  return queries.map(resolveQuery);
});

const mockSDK = {
  invoices: {
    list: mock(async () => ({ data: mockInvoices })),
  },
  payments: {
    list: mock(async () => ({ data: mockPayments })),
  },
  customers: {
    list: mock(async () => ({ data: [] })),
  },
  items: {
    list: mock(async () => ({ data: [] })),
  },
  estimates: {
    list: mock(async () => ({ data: [] })),
  },
  entityStats: {
    queryEntityStats: mockQueryEntityStats,
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

import { useCollectionRateData } from "@/ui/components/dashboard/collection-rate-card/use-collection-rate";
import { useInvoiceStatusData } from "@/ui/components/dashboard/invoice-status-chart";
import { usePaymentMethodsData } from "@/ui/components/dashboard/payment-methods-chart";
import { usePaymentTrendData } from "@/ui/components/dashboard/payment-trend-chart";
// Import hooks after mocking
import { useRevenueTrendData } from "@/ui/components/dashboard/revenue-trend-chart";
import { useRevenueData, useStatsCountsData } from "@/ui/components/dashboard/shared";
import { useTopCustomersData } from "@/ui/components/dashboard/top-customers-chart";

describe("Dashboard Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSDK.invoices.list.mockClear();
    mockSDK.payments.list.mockClear();
    mockSDK.customers.list.mockClear();
    mockSDK.items.list.mockClear();
    mockSDK.estimates.list.mockClear();
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

  describe("useRevenueTrendData", () => {
    it("should return empty data when no entityId provided", async () => {
      const { result } = renderHook(() => useRevenueTrendData(undefined), { wrapper });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch and aggregate revenue by month", async () => {
      const { result } = renderHook(() => useRevenueTrendData("ent_123"), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data.length).toBe(6); // Last 6 months
      expect(result.current.currency).toBe("EUR");
      expect(mockQueryEntityStats).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            table: "invoices",
            group_by: expect.arrayContaining(["month"]),
          }),
        ]),
        expect.objectContaining({ entity_id: "ent_123" }),
      );
    });
  });

  describe("useInvoiceStatusData", () => {
    it("should return default counts when no entityId provided", async () => {
      const { result } = renderHook(() => useInvoiceStatusData(undefined), { wrapper });

      expect(result.current.data).toEqual({ paid: 0, pending: 0, overdue: 0, voided: 0 });
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch and group invoices by status", async () => {
      const { result } = renderHook(() => useInvoiceStatusData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock resolveQuery returns empty data for invoice count queries,
      // so all status counts should be 0
      expect(result.current.data.paid).toBe(0);
      expect(result.current.data.pending).toBe(0);
      expect(result.current.data.overdue).toBe(0);
      expect(result.current.data.voided).toBe(0);
    });
  });

  describe("usePaymentTrendData", () => {
    it("should return empty data when no entityId provided", async () => {
      const { result } = renderHook(() => usePaymentTrendData(undefined), { wrapper });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch and aggregate payments by month", async () => {
      const { result } = renderHook(() => usePaymentTrendData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data.length).toBe(6); // Last 6 months
      expect(result.current.currency).toBe("EUR");
      expect(mockQueryEntityStats).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            table: "payments",
            group_by: expect.arrayContaining(["month"]),
          }),
        ]),
        expect.objectContaining({ entity_id: "ent_123" }),
      );
    });
  });

  describe("usePaymentMethodsData", () => {
    it("should return empty data when no entityId provided", async () => {
      const { result } = renderHook(() => usePaymentMethodsData(undefined), { wrapper });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch and group payments by type", async () => {
      const { result } = renderHook(() => usePaymentMethodsData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock returns 3 payment types with specific amounts
      expect(result.current.data.length).toBe(3);
      const byType = Object.fromEntries(result.current.data.map((d) => [d.type, d.amount]));
      expect(byType.bank_transfer).toBe(2000);
      expect(byType.cash).toBe(500);
      expect(byType.card).toBe(1500);
    });
  });

  describe("useTopCustomersData", () => {
    it("should return empty data when no entityId provided", async () => {
      const { result } = renderHook(() => useTopCustomersData(undefined), { wrapper });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch and rank customers by revenue", async () => {
      const { result } = renderHook(() => useTopCustomersData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock returns Customer A (5000) and Customer B (3000), pre-sorted by revenue
      // Hook transforms customer_name → name
      expect(result.current.data.length).toBe(2);
      expect(result.current.currency).toBe("EUR");
      expect(result.current.data[0].name).toBe("Customer A");
      expect(result.current.data[0].revenue).toBe(5000);
      expect(result.current.data[1].name).toBe("Customer B");
      expect(result.current.data[1].revenue).toBe(3000);
    });
  });

  describe("useRevenueData", () => {
    it("should return default values when no entityId provided", async () => {
      const { result } = renderHook(() => useRevenueData(undefined), { wrapper });

      expect(result.current.data.thisMonth).toBe(0);
      expect(result.current.data.thisYear).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it("should calculate revenue metrics", async () => {
      const { result } = renderHook(() => useRevenueData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Revenue metrics should be numeric values (computed from mock data)
      expect(result.current.data.currency).toBe("EUR");
      expect(result.current.data.thisMonth).toBeGreaterThanOrEqual(0);
      expect(result.current.data.thisYear).toBeGreaterThanOrEqual(0);
      expect(result.current.data.outstanding).toBeGreaterThanOrEqual(0);
      expect(result.current.data.overdue).toBeGreaterThanOrEqual(0);
    });
  });

  describe("useStatsCountsData", () => {
    it("should return zero counts when no entityId provided", async () => {
      const { result } = renderHook(() => useStatsCountsData(undefined), { wrapper });

      expect(result.current.data.invoices).toBe(0);
      expect(result.current.data.customers).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch counts for all resource types", async () => {
      const { result } = renderHook(() => useStatsCountsData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock resolveQuery returns empty data for count queries (no group_by match),
      // so counts should be 0
      expect(result.current.data.invoices).toBe(0);
      expect(result.current.data.customers).toBe(0);
      expect(result.current.data.items).toBe(0);
      expect(result.current.data.estimates).toBe(0);
    });
  });

  describe("useCollectionRateData", () => {
    it("should return defaults when no entityId provided", async () => {
      const { result } = renderHook(() => useCollectionRateData(undefined), { wrapper });

      expect(result.current.data.collectionRate).toBe(0);
      expect(result.current.data.totalCollected).toBe(0);
      expect(result.current.data.totalInvoiced).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it("should calculate correct collection rate values", async () => {
      const { result } = renderHook(() => useCollectionRateData("ent_123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // netInvoiced = totalInvoiced(10000) - cnTotal(2000) = 8000
      // netCollected = invoicePayments(7000) - cnPayments(500) = 6500
      // collectionRate = (6500 / 8000) * 100 = 81.25
      expect(result.current.data.totalInvoiced).toBe(8000);
      expect(result.current.data.totalCollected).toBe(6500);
      expect(result.current.data.collectionRate).toBe(81.25);
      expect(result.current.data.currency).toBe("EUR");
    });

    it("should handle zero invoiced without division by zero", async () => {
      // Override to return 0 for all queries
      mockQueryEntityStats.mockImplementationOnce(async (queries: any[]) => {
        return queries.map(() => ({ data: [{ total: 0 }] }));
      });

      const { result } = renderHook(() => useCollectionRateData("ent_zero"), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data.collectionRate).toBe(0);
      expect(result.current.data.totalInvoiced).toBe(0);
      expect(result.current.data.totalCollected).toBe(0);
    });
  });
});
