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
const mockQueryEntityStats = mock(async (query: any, _options?: { entity_id?: string }) => {
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
        currency_code: "EUR",
      })),
    };
  }

  // Top customers data
  if (table === "invoices" && groupBy.includes("customer_name")) {
    return {
      data: [
        { customer_name: "Customer A", customer_id: "cust_1", revenue: 5000, currency_code: "EUR" },
        { customer_name: "Customer B", customer_id: "cust_2", revenue: 3000, currency_code: "EUR" },
      ],
    };
  }

  // Default empty response
  return { data: [] };
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
        expect.objectContaining({
          table: "invoices",
          group_by: expect.arrayContaining(["month"]),
        }),
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

      // Should have status breakdown object
      expect(typeof result.current.data.paid).toBe("number");
      expect(typeof result.current.data.pending).toBe("number");
      expect(typeof result.current.data.overdue).toBe("number");
      expect(typeof result.current.data.voided).toBe("number");
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
        expect.objectContaining({
          table: "payments",
          group_by: expect.arrayContaining(["month"]),
        }),
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

      // Should have grouped by payment type
      expect(result.current.data.length).toBeGreaterThan(0);
      const types = result.current.data.map((d) => d.type);
      expect(types).toContain("bank_transfer");
      expect(types).toContain("cash");
      expect(types).toContain("card");
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

      // Should have top customers sorted by revenue
      expect(result.current.data.length).toBeGreaterThan(0);
      expect(result.current.currency).toBe("EUR");
      // First customer should have highest revenue
      if (result.current.data.length > 1) {
        expect(result.current.data[0].revenue).toBeGreaterThanOrEqual(result.current.data[1].revenue);
      }
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

      expect(result.current.data.currency).toBe("EUR");
      expect(typeof result.current.data.thisMonth).toBe("number");
      expect(typeof result.current.data.thisYear).toBe("number");
      expect(typeof result.current.data.outstanding).toBe("number");
      expect(typeof result.current.data.overdue).toBe("number");
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

      // Verify the structure of returned data
      expect(typeof result.current.data.invoices).toBe("number");
      expect(typeof result.current.data.customers).toBe("number");
      expect(typeof result.current.data.items).toBe("number");
      expect(typeof result.current.data.estimates).toBe("number");
    });
  });
});
