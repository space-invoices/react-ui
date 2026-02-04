import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { ITEMS_CACHE_KEY, useItemSearch, useRecentItems } from "@/ui/components/items/items.hooks";

// Mock the SDK provider
const mockItemsApi = {
  list: mock(),
  create: mock(),
  update: mock(),
  delete: mock(),
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: {
      items: mockItemsApi,
    },
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

describe("Items Hooks", () => {
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
    mockItemsApi.list.mockReset();
    mockItemsApi.create.mockReset();
    mockItemsApi.update.mockReset();
    mockItemsApi.delete.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useItemSearch", () => {
    test("should not fetch when search is empty", async () => {
      const { result } = renderHook(() => useItemSearch("entity-123", ""), { wrapper });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(mockItemsApi.list).not.toHaveBeenCalled();
    });

    test("should fetch items when search is provided", async () => {
      const mockItems = {
        data: [
          { id: "item_1", name: "Consulting", price: 150 },
          { id: "item_2", name: "Development", price: 200 },
        ],
        pagination: { total: 2, has_more: false, next_cursor: null, prev_cursor: null },
      };

      mockItemsApi.list.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useItemSearch("entity-123", "cons"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockItemsApi.list).toHaveBeenCalledWith({
        entity_id: "entity-123",
        search: "cons",
        limit: 10,
      });

      expect(result.current.data).toEqual(mockItems);
    });

    test("should return empty data when search is empty string", async () => {
      const { result } = renderHook(() => useItemSearch("entity-123", ""), { wrapper });

      // Query is disabled when search is empty
      expect(result.current.data).toBeUndefined();
      expect(mockItemsApi.list).not.toHaveBeenCalled();
    });
  });

  describe("useRecentItems", () => {
    test("should fetch recent items for entity", async () => {
      const mockItems = {
        data: [
          { id: "item_1", name: "Recent Item 1", price: 100 },
          { id: "item_2", name: "Recent Item 2", price: 200 },
        ],
        pagination: { total: 2, has_more: false, next_cursor: null, prev_cursor: null },
      };

      mockItemsApi.list.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useRecentItems("entity-123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockItemsApi.list).toHaveBeenCalledWith({
        entity_id: "entity-123",
        limit: 5,
        order_by: "-created_at",
      });

      expect(result.current.data).toEqual(mockItems);
    });

    test("should not fetch when entityId is empty", async () => {
      const { result } = renderHook(() => useRecentItems(""), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockItemsApi.list).not.toHaveBeenCalled();
    });

    test("should handle error gracefully", async () => {
      const error = new Error("Failed to fetch items");
      mockItemsApi.list.mockRejectedValue(error);

      const { result } = renderHook(() => useRecentItems("entity-123"), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("ITEMS_CACHE_KEY", () => {
    test("should export cache key", () => {
      expect(ITEMS_CACHE_KEY).toBe("items");
    });
  });
});
