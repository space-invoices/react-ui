import { beforeEach, describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockSDK, createTestSetup, resetSDKMocks } from "../../../test/test-utils";
import { CUSTOMERS_CACHE_KEY, useCustomerSearch, useRecentCustomers } from "./customers.hooks";

describe("customers.hooks", () => {
  let sdk: ReturnType<typeof createMockSDK>;

  beforeEach(() => {
    sdk = createMockSDK();
    resetSDKMocks(sdk);
  });

  describe("useCustomerSearch", () => {
    test("searches customers with search term", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";
      const searchTerm = "John";

      sdk.customers.list.mockResolvedValueOnce({
        data: [
          { id: "customer-1", name: "John Doe", email: "john@example.com" },
          { id: "customer-2", name: "John Smith", email: "johnsmith@example.com" },
        ] as any,
        pagination: { total: 2 },
      });

      const { result } = renderHook(() => useCustomerSearch(entityId, searchTerm), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sdk.customers.list).toHaveBeenCalledWith({
        entity_id: entityId,
        search: searchTerm,
        limit: 10,
      });

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data[0].name).toBe("John Doe");
    });

    test("does not call API when search term is empty", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";
      const searchTerm = "";

      renderHook(() => useCustomerSearch(entityId, searchTerm), { wrapper });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not call API when search is empty
      expect(sdk.customers.list).not.toHaveBeenCalled();
    });

    test("is disabled when entityId is missing", () => {
      const { wrapper } = createTestSetup({ sdk });
      const searchTerm = "John";

      const { result } = renderHook(() => useCustomerSearch("", searchTerm), { wrapper });

      // Should not make API call
      expect(sdk.customers.list).not.toHaveBeenCalled();

      // Query should be disabled
      expect(result.current.isFetching).toBe(false);
    });

    test("is disabled when search term is empty", () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      const { result } = renderHook(() => useCustomerSearch(entityId, ""), { wrapper });

      // Query should be disabled (but returns empty data immediately)
      expect(result.current.isFetching).toBe(false);
    });

    test("limits results to 10 customers", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";
      const searchTerm = "test";

      sdk.customers.list.mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `customer-${i}`,
          name: `Test Customer ${i}`,
          email: `test${i}@example.com`,
        })) as any,
        pagination: { total: 10 },
      });

      const { result } = renderHook(() => useCustomerSearch(entityId, searchTerm), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sdk.customers.list).toHaveBeenCalledWith({
        entity_id: entityId,
        search: searchTerm,
        limit: 10,
      });
    });

    test("creates unique cache keys for different searches", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockResolvedValue({
        data: [{ id: "customer-1", name: "Test", email: "test@example.com" }] as any,
        pagination: { total: 1 },
      });

      // First search
      const { result: result1 } = renderHook(() => useCustomerSearch(entityId, "john"), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second search with different term
      const { result: result2 } = renderHook(() => useCustomerSearch(entityId, "jane"), { wrapper });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should have made two separate API calls
      expect(sdk.customers.list).toHaveBeenCalledTimes(2);

      // Check cache has both queries
      const cache = queryClient.getQueryCache().getAll();
      const customerSearchQueries = cache.filter(
        (query) => query.queryKey[0] === CUSTOMERS_CACHE_KEY && query.queryKey[1] === "search",
      );

      expect(customerSearchQueries.length).toBeGreaterThanOrEqual(2);
    });

    test("handles API errors gracefully", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";
      const searchTerm = "error";

      sdk.customers.list.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useCustomerSearch(entityId, searchTerm), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useRecentCustomers", () => {
    test("fetches recent customers", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      const mockCustomers: any[] = [
        { id: "customer-1", name: "Recent Customer 1", email: "recent1@example.com", created_at: "2024-01-15" },
        { id: "customer-2", name: "Recent Customer 2", email: "recent2@example.com", created_at: "2024-01-14" },
      ];

      sdk.customers.list.mockResolvedValueOnce({
        data: mockCustomers as any,
        pagination: { total: 2 },
      });

      const { result } = renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sdk.customers.list).toHaveBeenCalledWith({
        entity_id: entityId,
        limit: 5,
        order_by: "-created_at",
      });

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data[0].name).toBe("Recent Customer 1");
    });

    test("limits results to 5 customers", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockResolvedValueOnce({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `customer-${i}`,
          name: `Customer ${i}`,
          email: `customer${i}@example.com`,
          created_at: new Date(Date.now() - i * 1000).toISOString(),
        })) as any,
        pagination: { total: 5 },
      });

      const { result } = renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sdk.customers.list).toHaveBeenCalledWith({
        entity_id: entityId,
        limit: 5,
        order_by: "-created_at",
      });
    });

    test("is disabled when entityId is missing", () => {
      const { wrapper } = createTestSetup({ sdk });

      const { result } = renderHook(() => useRecentCustomers(""), { wrapper });

      // Should not make API call
      expect(sdk.customers.list).not.toHaveBeenCalled();

      // Query should be disabled
      expect(result.current.isFetching).toBe(false);
    });

    test("sorts customers by created_at descending", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0 },
      });

      renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(sdk.customers.list).toHaveBeenCalled();
      });

      // Verify order_by parameter
      expect(sdk.customers.list).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "-created_at",
        }),
      );
    });

    test("caches results for 5 minutes", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockResolvedValue({
        data: [{ id: "customer-1", name: "Test", email: "test@example.com", created_at: "" }] as any,
        pagination: { total: 1 },
      });

      const { result, rerender } = renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(sdk.customers.list).toHaveBeenCalledTimes(1);

      // Rerender to trigger another fetch (but should use cache)
      rerender();

      // Wait a bit to ensure it doesn't refetch
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still only have been called once (cached)
      expect(sdk.customers.list).toHaveBeenCalledTimes(1);
    });

    test("creates unique cache keys for different entities", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });

      sdk.customers.list.mockResolvedValue({
        data: [{ id: "customer-1", name: "Test", email: "test@example.com", created_at: "" }] as any,
        pagination: { total: 1 },
      });

      // First entity
      const { result: result1 } = renderHook(() => useRecentCustomers("entity-1"), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second entity
      const { result: result2 } = renderHook(() => useRecentCustomers("entity-2"), { wrapper });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should have made two separate API calls
      expect(sdk.customers.list).toHaveBeenCalledTimes(2);

      // Check cache has both queries
      const cache = queryClient.getQueryCache().getAll();
      const recentCustomersQueries = cache.filter(
        (query) => query.queryKey[0] === CUSTOMERS_CACHE_KEY && query.queryKey[1] === "recent",
      );

      expect(recentCustomersQueries.length).toBeGreaterThanOrEqual(2);
    });

    test("handles API errors gracefully", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    test("handles empty results", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const entityId = "entity-123";

      sdk.customers.list.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0 },
      });

      const { result } = renderHook(() => useRecentCustomers(entityId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toEqual([]);
      expect(result.current.data?.pagination.total).toBe(0);
    });
  });
});
