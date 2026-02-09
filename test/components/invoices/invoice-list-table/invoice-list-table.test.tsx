import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Invoice } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceListTable from "@/ui/components/invoices/list/list-table";
import type { TableQueryParams, TableQueryResponse } from "@/ui/components/table/hooks/use-table-query";

// Mock the SDK provider - uses new SDK method name
const mockSDK = {
  invoices: {
    list: mock<(params: TableQueryParams) => Promise<TableQueryResponse<Invoice>>>(),
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

// Mock the entities provider
mock.module("@/ui/providers/entities-context", () => ({
  useEntities: () => ({
    entities: [
      {
        id: "entity-1",
        name: "Test Entity",
        environment: "live",
      },
    ],
    activeEntity: {
      id: "entity-1",
      name: "Test Entity",
      environment: "live",
    },
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    setActiveEntity: mock(() => {}),
    environment: "live",
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    setEnvironment: mock(() => {}),
    isLoading: false,
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    refetchEntities: mock(async () => {}),
    isError: false,
    error: null,
    status: "success" as const,
  }),
}));

describe("InvoiceListTable", () => {
  let queryClient: QueryClient;
  const mockInvoices = [
    {
      id: "1",
      number: "INV-001",
      customer_id: "cust-1",
      customer: {
        name: "Customer 1",
        address: "123 Main St",
        address_2: null,
        post_code: "12345",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        tax_number: "123456789",
      },
      date: "2023-01-01",
      date_due: "2023-01-31",
      total: 100,
      total_with_tax: 120,
      type: "invoice",
      issuer: {
        name: "Company",
        address: "123 Main St",
      },
      taxes: [],
      entity_id: "entity-1",
      date_year: 2023,
      metadata: {},
      created_at: new Date("2023-01-01").toISOString(),
      updated_at: new Date("2023-01-01").toISOString(),
      items: [],
      note: null,
    },
    {
      id: "2",
      number: "INV-002",
      customer_id: "cust-2",
      customer: {
        name: "Customer 2",
        address: "456 Oak St",
        address_2: null,
        post_code: "67890",
        city: "Another City",
        state: "Another State",
        country: "Another Country",
        tax_number: "987654321",
      },
      date: "2023-02-01",
      date_due: "2023-02-28",
      total: 200,
      total_with_tax: 240,
      type: "invoice",
      issuer: {
        name: "Company",
        address: "123 Main St",
      },
      taxes: [],
      entity_id: "entity-1",
      date_year: 2023,
      metadata: {},
      created_at: new Date("2023-02-01").toISOString(),
      updated_at: new Date("2023-02-01").toISOString(),
      items: [],
      note: null,
    },
  ] as any as Invoice[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockSDK.invoices.list.mockReset();

    // Setup default mock implementation
    mockSDK.invoices.list.mockImplementation(() =>
      Promise.resolve({
        data: mockInvoices,
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: mockInvoices.length,
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

  test("calls SDK to fetch invoices", async () => {
    customRender(<InvoiceListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.invoices.list).toHaveBeenCalledTimes(1);
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    const entityId = "test-entity-id";
    customRender(<InvoiceListTable entityId={entityId} />);

    await waitFor(() => {
      expect(mockSDK.invoices.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: entityId,
        }),
      );
    });
  });

  test("handles row click with invoice data", async () => {
    const onRowClick = mock<(invoice: Invoice) => void>();
    customRender(<InvoiceListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first invoice number link and click it
    const invoiceLink = await screen.findByText("INV-001");
    await userEvent.click(invoiceLink);

    expect(onRowClick).toHaveBeenCalledWith(mockInvoices[0]);
  });

  test("uses invoice-specific translations", async () => {
    const customTranslations = {
      Number: "Número",
      Customer: "Cliente",
      Date: "Fecha",
      "Date Due": "Fecha de vencimiento",
      Total: "Total",
      "Total with Tax": "Total con impuestos",
    };

    customRender(
      <InvoiceListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    expect(await screen.findByText("Número")).toBeInTheDocument();
    expect(await screen.findByText("Cliente")).toBeInTheDocument();
    expect(await screen.findByText("Fecha")).toBeInTheDocument();
    expect(await screen.findByText("Fecha de vencimiento")).toBeInTheDocument();
    expect(await screen.findByText("Total")).toBeInTheDocument();
    expect(await screen.findByText("Total con impuestos")).toBeInTheDocument();
  });

  test("displays 'Draft' text instead of number for draft invoices", async () => {
    const draftInvoice: Invoice = {
      ...mockInvoices[0],
      id: "draft-1",
      number: "draft-123",
      is_draft: true,
    } as Invoice;

    mockSDK.invoices.list.mockImplementation(() =>
      Promise.resolve({
        data: [draftInvoice, mockInvoices[1]],
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: 2,
          has_more: false,
        },
      }),
    );

    customRender(<InvoiceListTable entityId="test-entity" />);

    // Draft invoice should show "Draft" instead of "draft-123"
    expect(await screen.findByText("Draft")).toBeInTheDocument();
    expect(screen.queryByText("draft-123")).not.toBeInTheDocument();

    // Regular invoice should still show its number
    expect(await screen.findByText("INV-002")).toBeInTheDocument();
  });
});
