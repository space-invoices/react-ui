import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdvanceInvoiceListTable from "@/ui/components/advance-invoices/list/list-table";
import type { TableQueryParams, TableQueryResponse } from "@/ui/components/table/hooks/use-table-query";

// Mock the SDK provider - uses new SDK method name
const mockSDK = {
  advanceInvoices: {
    list: mock<(params: TableQueryParams) => Promise<TableQueryResponse<AdvanceInvoice>>>(),
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

describe("AdvanceInvoiceListTable", () => {
  let queryClient: QueryClient;
  const mockAdvanceInvoices: AdvanceInvoice[] = [
    {
      id: "adv_1",
      number: "ADV-001",
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
      total: 1000,
      total_with_tax: 1220,
      total_paid: 0,
      total_due: 1220,
      paid_in_full: false,
      type: "advance_invoice",
      issuer: {
        name: "Company",
        address: "123 Main St",
      },
      taxes: [],
      entity_id: "entity-1",
      date_year: 2023,
      metadata: {},
      created_at: new Date("2023-01-01"),
      updated_at: new Date("2023-01-01"),
      items: [],
      note: null,
    },
    {
      id: "adv_2",
      number: "ADV-002",
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
      total: 2000,
      total_with_tax: 2440,
      total_paid: 2440,
      total_due: 0,
      paid_in_full: true,
      type: "advance_invoice",
      issuer: {
        name: "Company",
        address: "123 Main St",
      },
      taxes: [],
      entity_id: "entity-1",
      date_year: 2023,
      metadata: {},
      created_at: new Date("2023-02-01"),
      updated_at: new Date("2023-02-01"),
      items: [],
      note: null,
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
    mockSDK.advanceInvoices.list.mockReset();

    // Setup default mock implementation
    mockSDK.advanceInvoices.list.mockImplementation(() =>
      Promise.resolve({
        data: mockAdvanceInvoices,
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: mockAdvanceInvoices.length,
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

  test("calls SDK to fetch advance invoices", async () => {
    customRender(<AdvanceInvoiceListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.advanceInvoices.list).toHaveBeenCalledTimes(1);
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    const entityId = "test-entity-id";
    customRender(<AdvanceInvoiceListTable entityId={entityId} />);

    await waitFor(() => {
      expect(mockSDK.advanceInvoices.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: entityId,
        }),
      );
    });
  });

  test("handles row click with advance invoice data", async () => {
    const onRowClick = mock<(advanceInvoice: AdvanceInvoice) => void>();
    customRender(<AdvanceInvoiceListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first advance invoice number link and click it
    const advanceInvoiceLink = await screen.findByText("ADV-001");
    await userEvent.click(advanceInvoiceLink);

    expect(onRowClick).toHaveBeenCalledWith(mockAdvanceInvoices[0]);
  });

  test("uses advance invoice-specific translations", async () => {
    const customTranslations = {
      Number: "Número",
      Customer: "Cliente",
      Date: "Fecha",
      "Date Due": "Fecha de vencimiento",
      Total: "Total",
      "Total with Tax": "Total con impuestos",
    };

    customRender(
      <AdvanceInvoiceListTable
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

  test("displays 'Draft' badge for draft advance invoices", async () => {
    const draftAdvanceInvoice: AdvanceInvoice = {
      ...mockAdvanceInvoices[0],
      id: "adv_draft_1",
      number: "ADV-DRAFT-001",
      is_draft: true,
    } as AdvanceInvoice;

    mockSDK.advanceInvoices.list.mockImplementation(() =>
      Promise.resolve({
        data: [draftAdvanceInvoice, mockAdvanceInvoices[1]],
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: 2,
          has_more: false,
        },
      }),
    );

    customRender(<AdvanceInvoiceListTable entityId="test-entity" />);

    // Draft advance invoice should show "Draft" badge
    expect(await screen.findByText("Draft")).toBeInTheDocument();
    // Should still show the number
    expect(await screen.findByText("ADV-DRAFT-001")).toBeInTheDocument();

    // Regular advance invoice should still show its number
    expect(await screen.findByText("ADV-002")).toBeInTheDocument();
  });

  test("displays customer names correctly", async () => {
    customRender(<AdvanceInvoiceListTable entityId="test-entity" />);

    expect(await screen.findByText("Customer 1")).toBeInTheDocument();
    expect(await screen.findByText("Customer 2")).toBeInTheDocument();
  });
});
