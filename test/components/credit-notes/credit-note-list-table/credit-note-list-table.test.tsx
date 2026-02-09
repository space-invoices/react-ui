import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { CreditNote } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreditNoteListTable from "@/ui/components/credit-notes/list/list-table";
import type { TableQueryParams, TableQueryResponse } from "@/ui/components/table/hooks/use-table-query";

// Mock the SDK provider
const mockCreditNotesApi = {
  list: mock<(params: TableQueryParams) => Promise<TableQueryResponse<CreditNote>>>(),
};

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({
    sdk: {
      creditNotes: mockCreditNotesApi,
    },
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

describe("CreditNoteListTable", () => {
  let queryClient: QueryClient;
  const mockCreditNotes = [
    {
      id: "cn_1",
      number: "CN-001",
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
      total: 100,
      total_with_tax: 120,
      total_paid: 0,
      total_due: 120,
      paid_in_full: false,
      type: "credit_note",
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
      id: "cn_2",
      number: "CN-002",
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
      total: 200,
      total_with_tax: 240,
      total_paid: 240,
      total_due: 0,
      paid_in_full: true,
      type: "credit_note",
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
  ] as any as CreditNote[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockCreditNotesApi.list.mockReset();

    // Setup default mock implementation
    mockCreditNotesApi.list.mockImplementation(() =>
      Promise.resolve({
        data: mockCreditNotes,
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: mockCreditNotes.length,
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

  test("calls SDK to fetch credit notes", async () => {
    customRender(<CreditNoteListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockCreditNotesApi.list).toHaveBeenCalledTimes(1);
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    const entityId = "test-entity-id";
    customRender(<CreditNoteListTable entityId={entityId} />);

    await waitFor(() => {
      expect(mockCreditNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: entityId,
        }),
      );
    });
  });

  test("handles row click with credit note data", async () => {
    const onRowClick = mock<(creditNote: CreditNote) => void>();
    customRender(<CreditNoteListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first credit note number link and click it
    const creditNoteLink = await screen.findByText("CN-001");
    await userEvent.click(creditNoteLink);

    expect(onRowClick).toHaveBeenCalledWith(mockCreditNotes[0]);
  });

  test("uses credit note-specific translations", async () => {
    const customTranslations = {
      Number: "Nummer",
      Customer: "Kunde",
      Date: "Datum",
      Total: "Gesamt",
      "Total with Tax": "Gesamt mit MwSt.",
      Status: "Status",
    };

    customRender(
      <CreditNoteListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    expect(await screen.findByText("Nummer")).toBeInTheDocument();
    expect(await screen.findByText("Kunde")).toBeInTheDocument();
    expect(await screen.findByText("Datum")).toBeInTheDocument();
    expect(await screen.findByText("Gesamt")).toBeInTheDocument();
    expect(await screen.findByText("Gesamt mit MwSt.")).toBeInTheDocument();
    expect(await screen.findByText("Status")).toBeInTheDocument();
  });

  test("displays payment status badges correctly", async () => {
    customRender(<CreditNoteListTable entityId="test-entity" />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockCreditNotesApi.list).toHaveBeenCalled();
    });

    // CN-001 is unpaid, CN-002 is paid
    const unpaidBadge = await screen.findByText("Unpaid");
    const paidBadge = await screen.findByText("Paid");

    expect(unpaidBadge).toBeInTheDocument();
    expect(paidBadge).toBeInTheDocument();
  });

  test("renders customer names", async () => {
    customRender(<CreditNoteListTable entityId="test-entity" />);

    expect(await screen.findByText("Customer 1")).toBeInTheDocument();
    expect(await screen.findByText("Customer 2")).toBeInTheDocument();
  });
});
