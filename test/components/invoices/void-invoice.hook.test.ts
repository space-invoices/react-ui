import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { useVoidInvoice } from "@/ui/components/invoices/invoices-furs.hooks";

const mockVoid = mock(async () => ({}));

const mockSDK = {
  invoices: {
    void: mockVoid,
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

describe("useVoidInvoice Hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockVoid.mockClear();
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

  it("should void invoice successfully", async () => {
    const mockVoidedInvoice = {
      id: "inv_123",
      status: "voided",
      voided_at: new Date().toISOString(),
    };

    mockSDK.invoices.void.mockResolvedValue(mockVoidedInvoice);

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
      reason: "Customer requested cancellation",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // SDK signature: void(id, data, { entity_id })
    expect(mockSDK.invoices.void).toHaveBeenCalledWith(
      "inv_123",
      { reason: "Customer requested cancellation" },
      { entity_id: "ent_123" },
    );

    expect(result.current.data).toEqual(mockVoidedInvoice as any);
  });

  it("should void invoice without reason", async () => {
    mockSDK.invoices.void.mockResolvedValue({ id: "inv_123" });

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // SDK signature: void(id, data, { entity_id })
    expect(mockSDK.invoices.void).toHaveBeenCalledWith("inv_123", { reason: undefined }, { entity_id: "ent_123" });
  });

  it("should handle void invoice error", async () => {
    mockSDK.invoices.void.mockRejectedValue(new Error("Cannot void already voided invoice"));

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error).message).toBe("Cannot void already voided invoice");
  });

  it("should invalidate invoice queries on success", async () => {
    mockSDK.invoices.void.mockResolvedValue({ id: "inv_123" });

    const invalidateQueriesSpy = spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["invoices"],
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["documents", "invoice", "inv_123"],
    });
  });

  it("should handle multiple void operations", async () => {
    mockSDK.invoices.void.mockResolvedValue({ id: "inv_123" });

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    // First void
    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Second void
    mockSDK.invoices.void.mockResolvedValue({ id: "inv_456" });

    result.current.mutate({
      invoiceId: "inv_456",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSDK.invoices.void).toHaveBeenCalledTimes(2);
  });

  it("should track loading state during void operation", async () => {
    mockSDK.invoices.void.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "inv_123" }), 100)),
    );

    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    expect(result.current.isPending).toBe(false);

    result.current.mutate({
      invoiceId: "inv_123",
      entityId: "ent_123",
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
