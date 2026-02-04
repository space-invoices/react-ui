import { beforeEach, describe, expect, mock, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockSDK, createTestSetup, resetSDKMocks } from "../../test/test-utils";
import { createResourceHooks } from "./create-resource-hooks";

type TestResource = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type CreateTestResourceData = {
  name: string;
};

describe("createResourceHooks", () => {
  let sdk: ReturnType<typeof createMockSDK>;

  beforeEach(() => {
    sdk = createMockSDK();
    resetSDKMocks(sdk);
  });

  describe("hook factory", () => {
    test("creates all three CRUD hooks", () => {
      const hooks = createResourceHooks<TestResource, CreateTestResourceData>("customers" as any, "test-resource");

      expect(hooks.useCreateResource).toBeDefined();
      expect(hooks.useUpdateResource).toBeDefined();
      expect(hooks.useDeleteResource).toBeDefined();
    });
  });

  describe("useCreateResource", () => {
    test("creates a new resource successfully", async () => {
      const { wrapper, queryClient: _queryClient } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      sdk.customers.create.mockResolvedValueOnce({
        id: "customer-123",
        name: "Test Customer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useCreateResource(), { wrapper });

      // Execute mutation
      await result.current.mutateAsync({ name: "Test Customer" });

      // Should call SDK with correct data: create(data, options)
      expect(sdk.customers.create).toHaveBeenCalledWith({ name: "Test Customer" }, undefined);
    });

    test("performs optimistic update on cache", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      // Set initial cache data
      queryClient.setQueryData(["customers"], {
        data: [{ id: "existing-1", name: "Existing Customer", created_at: "", updated_at: "" }],
        pagination: { total: 1 },
      });

      sdk.customers.create.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useCreateResource(), { wrapper });

      // Start mutation (but don't wait for completion)
      const mutationPromise = result.current.mutateAsync({ name: "New Customer" });

      // Check optimistic update happened
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<any>(["customers"]);
        expect(cacheData?.data.length).toBe(2);
        expect(cacheData?.data[0].name).toBe("New Customer");
        expect(cacheData?.data[0].id).toMatch(/^temp-/);
        expect(cacheData?.pagination.total).toBe(2);
      });

      await mutationPromise;
    });

    test("rolls back on error", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      // Set initial cache data
      const initialData = {
        data: [{ id: "existing-1", name: "Existing Customer", created_at: "", updated_at: "" }],
        pagination: { total: 1 },
      };
      queryClient.setQueryData(["customers"], initialData);

      sdk.customers.create.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useCreateResource(), { wrapper });

      // Execute mutation and expect error
      try {
        await result.current.mutateAsync({ name: "New Customer" });
      } catch (_error) {
        // Expected
      }

      // Cache should be rolled back
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<any>(["customers"]);
        expect(cacheData?.data.length).toBe(1);
        expect(cacheData?.data[0].id).toBe("existing-1");
      });
    });

    test("calls onSuccess callback", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      const onSuccess = mock(() => {
        /* noop */
      });

      sdk.customers.create.mockResolvedValueOnce({
        id: "customer-123",
        name: "Test Customer",
        created_at: "",
        updated_at: "",
      });

      const { result } = renderHook(() => useCreateResource({ onSuccess }), { wrapper });

      await result.current.mutateAsync({ name: "Test Customer" });

      expect(onSuccess).toHaveBeenCalled();
    });

    test("calls onError callback", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      const onError = mock(() => {
        /* noop */
      });

      sdk.customers.create.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useCreateResource({ onError }), { wrapper });

      try {
        await result.current.mutateAsync({ name: "Test Customer" });
      } catch (_error) {
        // Expected
      }

      expect(onError).toHaveBeenCalled();
    });

    test("handles entityId and accountId filters", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      sdk.customers.create.mockResolvedValueOnce({
        id: "customer-123",
        name: "Test Customer",
        created_at: "",
        updated_at: "",
      });

      const { result } = renderHook(() => useCreateResource({ entityId: "entity-1", accountId: "account-1" }), {
        wrapper,
      });

      await result.current.mutateAsync({ name: "Test Customer" });

      // Should call with entity_id in options: create(data, { entity_id })
      expect(sdk.customers.create).toHaveBeenCalledWith({ name: "Test Customer" }, { entity_id: "entity-1" });
    });
  });

  describe("useUpdateResource", () => {
    test("updates a resource successfully", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useUpdateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      sdk.customers.update.mockResolvedValueOnce({
        id: "customer-123",
        name: "Updated Customer",
        created_at: "",
        updated_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useUpdateResource(), { wrapper });

      await result.current.mutateAsync({
        id: "customer-123",
        data: { name: "Updated Customer" },
      });

      // Should call update(id, data, options)
      expect(sdk.customers.update).toHaveBeenCalledWith("customer-123", { name: "Updated Customer" }, undefined);
    });

    test("performs optimistic update on list cache", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useUpdateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      // Set initial cache data
      queryClient.setQueryData(["customers"], {
        data: [{ id: "customer-123", name: "Old Name", created_at: "", updated_at: "" }],
      });

      sdk.customers.update.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useUpdateResource(), { wrapper });

      // Start mutation
      const mutationPromise = result.current.mutateAsync({
        id: "customer-123",
        data: { name: "New Name" },
      });

      // Check optimistic update
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<any>(["customers"]);
        expect(cacheData?.data[0].name).toBe("New Name");
      });

      await mutationPromise;
    });

    test("performs optimistic update on detail cache", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useUpdateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      // Set initial detail cache
      queryClient.setQueryData(["customers-customer-123"], {
        id: "customer-123",
        name: "Old Name",
        created_at: "",
        updated_at: "",
      });

      sdk.customers.update.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useUpdateResource(), { wrapper });

      // Start mutation
      const mutationPromise = result.current.mutateAsync({
        id: "customer-123",
        data: { name: "New Name" },
      });

      // Check optimistic update on detail cache
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<any>(["customers-customer-123"]);
        expect(cacheData?.name).toBe("New Name");
      });

      await mutationPromise;
    });

    test("rolls back both caches on error", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useUpdateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      const initialListData = {
        data: [{ id: "customer-123", name: "Original Name", created_at: "", updated_at: "" }],
      };

      const initialDetailData = {
        id: "customer-123",
        name: "Original Name",
        created_at: "",
        updated_at: "",
      };

      queryClient.setQueryData(["customers"], initialListData);
      queryClient.setQueryData(["customers-customer-123"], initialDetailData);

      sdk.customers.update.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useUpdateResource(), { wrapper });

      try {
        await result.current.mutateAsync({
          id: "customer-123",
          data: { name: "Failed Update" },
        });
      } catch (_error) {
        // Expected
      }

      // Both caches should be rolled back
      await waitFor(() => {
        const listData = queryClient.getQueryData<any>(["customers"]);
        const detailData = queryClient.getQueryData<any>(["customers-customer-123"]);
        expect(listData?.data[0].name).toBe("Original Name");
        expect(detailData?.name).toBe("Original Name");
      });
    });

    test("calls onSuccess callback", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useUpdateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      const onSuccess = mock(() => {
        /* noop */
      });

      sdk.customers.update.mockResolvedValueOnce({
        id: "customer-123",
        name: "Updated Customer",
        created_at: "",
        updated_at: "",
      });

      const { result } = renderHook(() => useUpdateResource({ onSuccess }), { wrapper });

      await result.current.mutateAsync({
        id: "customer-123",
        data: { name: "Updated Customer" },
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("useDeleteResource", () => {
    test("deletes a resource successfully", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useDeleteResource } = createResourceHooks<TestResource>("customers" as any, "customers");

      sdk.customers.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteResource(), { wrapper });

      await result.current.mutateAsync({ id: "customer-123" });

      // Should call delete(id, options)
      expect(sdk.customers.delete).toHaveBeenCalledWith("customer-123", undefined);
    });

    test("removes resource from cache on success", async () => {
      const { wrapper, queryClient } = createTestSetup({ sdk });
      const { useDeleteResource } = createResourceHooks<TestResource>("customers" as any, "customers");

      // Set initial cache data
      queryClient.setQueryData(["customers"], {
        data: [
          { id: "customer-123", name: "To Delete", created_at: "", updated_at: "" },
          { id: "customer-456", name: "To Keep", created_at: "", updated_at: "" },
        ],
      });

      sdk.customers.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteResource(), { wrapper });

      await result.current.mutateAsync({ id: "customer-123" });

      // Should remove from cache
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<any>(["customers"]);
        expect(cacheData?.data.length).toBe(1);
        expect(cacheData?.data[0].id).toBe("customer-456");
      });
    });

    test("calls onSuccess callback", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useDeleteResource } = createResourceHooks<TestResource>("customers" as any, "customers");

      const onSuccess = mock(() => {
        /* noop */
      });

      sdk.customers.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteResource({ onSuccess }), { wrapper });

      await result.current.mutateAsync({ id: "customer-123" });

      expect(onSuccess).toHaveBeenCalled();
    });

    test("calls onError callback", async () => {
      const { wrapper } = createTestSetup({ sdk });
      const { useDeleteResource } = createResourceHooks<TestResource>("customers" as any, "customers");

      const onError = mock(() => {
        /* noop */
      });

      sdk.customers.delete.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useDeleteResource({ onError }), { wrapper });

      try {
        await result.current.mutateAsync({ id: "customer-123" });
      } catch (_error) {
        // Expected
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    test("handles resources with different plural forms", () => {
      // entities -> entity
      const entitiesHooks = createResourceHooks<TestResource>("entities" as any, "entities");
      expect(entitiesHooks).toBeDefined();

      // invoices -> invoice
      const invoicesHooks = createResourceHooks<TestResource>("invoices" as any, "invoices");
      expect(invoicesHooks).toBeDefined();

      // taxes -> tax
      const taxesHooks = createResourceHooks<TestResource>("taxes" as any, "taxes");
      expect(taxesHooks).toBeDefined();

      // items -> item
      const itemsHooks = createResourceHooks<TestResource>("items" as any, "items");
      expect(itemsHooks).toBeDefined();
    });

    test("handles cache without existing data", async () => {
      const { wrapper, queryClient: _queryClient } = createTestSetup({ sdk });
      const { useCreateResource } = createResourceHooks<TestResource, CreateTestResourceData>(
        "customers" as any,
        "customers",
      );

      sdk.customers.create.mockResolvedValueOnce({
        id: "customer-123",
        name: "Test Customer",
        created_at: "",
        updated_at: "",
      });

      const { result } = renderHook(() => useCreateResource(), { wrapper });

      // No cache data set initially
      await result.current.mutateAsync({ name: "Test Customer" });

      // Should still complete successfully
      expect(sdk.customers.create).toHaveBeenCalled();
    });
  });
});
