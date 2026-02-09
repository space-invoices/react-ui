import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Customer } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CustomerListTable from "@/ui/components/customers/customer-list-table/customer-list-table";

// Mock the SDK provider
const mockSDK = {
  customers: {
    list: mock<(params: any) => Promise<any>>(),
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
    ({
      t,
      namespace,
      locale = "en",
      translations = {},
    }: {
      t?: (key: string) => string;
      namespace?: string;
      locale?: string;
      translations?: Record<string, Record<string, string>>;
    }) =>
    (key: string) => {
      if (t) {
        const k = namespace ? `${namespace}.${key}` : key;
        const r = t(k);
        if (r !== k && r !== key) return r;
      }
      return translations[locale]?.[key] || key;
    },
}));

describe("CustomerListTable", () => {
  let queryClient: QueryClient;
  const mockCustomers = [
    {
      id: "1",
      name: "Customer 1",
      created_at: new Date("2023-01-01T00:00:00Z").toISOString(),
      updated_at: new Date("2023-01-01T00:00:00Z").toISOString(),
      address: "123 Main St",
      address_2: null,
      post_code: "12345",
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      tax_number: "123456789",
      entity_id: "entity1",
      metadata: {},
    },
    {
      id: "2",
      name: "Customer 2",
      created_at: new Date("2023-01-02T00:00:00Z").toISOString(),
      updated_at: new Date("2023-01-02T00:00:00Z").toISOString(),
      address: "456 Oak St",
      address_2: null,
      post_code: "67890",
      city: "Another City",
      state: "Another State",
      country: "Another Country",
      tax_number: "987654321",
      entity_id: "entity1",
      metadata: {},
    },
  ] as any as Customer[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockSDK.customers.list.mockReset();

    // Setup default mock implementation
    mockSDK.customers.list.mockImplementation(() =>
      Promise.resolve({
        data: mockCustomers,
        pagination: {
          total: mockCustomers.length,
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

  test("calls SDK to fetch customers", async () => {
    customRender(<CustomerListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.customers.list).toHaveBeenCalledTimes(1);
      expect(mockSDK.customers.list).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "-id", // Default order
        }),
      );
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    customRender(<CustomerListTable entityId="test-entity-id" />);

    await waitFor(() => {
      expect(mockSDK.customers.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: "test-entity-id",
        }),
      );
    });
  });

  test("handles row click with customer data", async () => {
    const onRowClick = mock<(customer: Customer) => void>();

    customRender(<CustomerListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first customer name link and click it
    const customerLink = await screen.findByText("Customer 1");
    await userEvent.click(customerLink);

    expect(onRowClick).toHaveBeenCalledWith(mockCustomers[0]);
  });

  test("uses customer-specific translations", async () => {
    const customTranslations = {
      Name: "Nombre",
      Address: "Dirección",
      "Post Code": "Código Postal",
    };

    customRender(
      <CustomerListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    expect(await screen.findByText("Nombre")).toBeInTheDocument();
    expect(await screen.findByText("Dirección")).toBeInTheDocument();
    expect(await screen.findByText("Código Postal")).toBeInTheDocument();
  });
});
