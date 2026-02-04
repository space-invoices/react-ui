import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { GetItems200Response, Item } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ItemListTable from "@/ui/components/items/item-list-table/item-list-table";

// Mock the SDK provider
const mockSDK = {
  items: {
    list: mock<(params: any) => Promise<GetItems200Response>>(),
  },
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: mockSDK,
    isInitialized: true,
    isLoading: false,
    error: null,
  }),
}));

// Mock the translation function
mock.module("@/ui/lib/translation", () => ({
  createTranslation:
    ({ t, _translations }: { t?: (key: string) => string; translations?: Record<string, Record<string, string>> }) =>
    (key: string) =>
      t?.(key) || key,
}));

describe("ItemListTable", () => {
  let queryClient: QueryClient;
  const mockItems: Item[] = [
    {
      id: "item-1",
      name: "Item 1",
      description: "First item description",
      price: 99.99,
      unit: "pcs",
      entity_id: "entity1",
      created_at: new Date("2023-01-01T00:00:00Z"),
      updated_at: new Date("2023-01-01T00:00:00Z"),
      metadata: {},
    },
    {
      id: "item-2",
      name: "Item 2",
      description: "Second item description",
      price: 149.99,
      unit: "kg",
      entity_id: "entity1",
      created_at: new Date("2023-01-02T00:00:00Z"),
      updated_at: new Date("2023-01-02T00:00:00Z"),
      metadata: {},
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockSDK.items.list.mockReset();

    // Setup default mock implementation
    mockSDK.items.list.mockImplementation(() =>
      Promise.resolve({
        data: mockItems,
        pagination: {
          total: mockItems.length,
          next_cursor: null,
          prev_cursor: null,
          has_more: false,
        },
      }),
    );
  });

  const customRender = (ui: React.ReactElement) => {
    return render(ui, {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
  };

  test("calls SDK to fetch items", async () => {
    customRender(<ItemListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.items.list).toHaveBeenCalledTimes(1);
      expect(mockSDK.items.list).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "-id",
        }),
      );
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    customRender(<ItemListTable entityId="test-entity-id" />);

    await waitFor(() => {
      expect(mockSDK.items.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: "test-entity-id",
        }),
      );
    });
  });

  test("handles row click with item data", async () => {
    const onRowClick = mock<(item: Item) => void>();

    customRender(<ItemListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first item name link and click it
    const itemLink = await screen.findByText("Item 1");
    await userEvent.click(itemLink);

    expect(onRowClick).toHaveBeenCalledWith(mockItems[0]);
  });

  test("displays item data correctly", async () => {
    customRender(<ItemListTable entityId="test-entity" />);

    // Check that item names are displayed
    expect(await screen.findByText("Item 1")).toBeInTheDocument();
    expect(await screen.findByText("Item 2")).toBeInTheDocument();

    // Check that descriptions are displayed
    expect(await screen.findByText("First item description")).toBeInTheDocument();
    expect(await screen.findByText("Second item description")).toBeInTheDocument();
  });

  test("uses item-specific translations", async () => {
    const customTranslations = {
      Name: "Naziv",
      Description: "Opis",
      Price: "Cena",
    };

    customRender(
      <ItemListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    // Header columns that exist in item-list-header.tsx (Name, Description, Price - no Unit column in header)
    expect(await screen.findByText("Naziv")).toBeInTheDocument();
    expect(await screen.findByText("Opis")).toBeInTheDocument();
    expect(await screen.findByText("Cena")).toBeInTheDocument();
  });
});
