import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Estimate, GetEstimates200Response } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EstimateListTable from "@/ui/components/estimates/list/list-table";

// Mock the SDK provider
const mockSDK = {
  estimates: {
    list: mock<(params: any) => Promise<GetEstimates200Response>>(),
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

describe("EstimateListTable", () => {
  let queryClient: QueryClient;
  const mockEstimates: Estimate[] = [
    {
      id: "est-1",
      number: "EST-001",
      date: new Date("2023-01-01"),
      date_valid_till: new Date("2023-02-01"),
      total: 1000,
      total_with_tax: 1200,
      currency_code: "EUR",
      status: "draft",
      entity_id: "entity1",
      customer: {
        id: "cust-1",
        name: "Customer 1",
      },
      items: [],
      created_at: new Date("2023-01-01T00:00:00Z"),
      updated_at: new Date("2023-01-01T00:00:00Z"),
    },
    {
      id: "est-2",
      number: "EST-002",
      date: new Date("2023-01-02"),
      date_valid_till: new Date("2023-02-02"),
      total: 2000,
      total_with_tax: 2400,
      currency_code: "EUR",
      status: "sent",
      entity_id: "entity1",
      customer: {
        id: "cust-2",
        name: "Customer 2",
      },
      items: [],
      created_at: new Date("2023-01-02T00:00:00Z"),
      updated_at: new Date("2023-01-02T00:00:00Z"),
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
    mockSDK.estimates.list.mockReset();

    // Setup default mock implementation
    mockSDK.estimates.list.mockImplementation(() =>
      Promise.resolve({
        data: mockEstimates,
        pagination: {
          total: mockEstimates.length,
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

  test("calls SDK to fetch estimates", async () => {
    customRender(<EstimateListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.estimates.list).toHaveBeenCalledTimes(1);
      expect(mockSDK.estimates.list).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "-id",
        }),
      );
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    customRender(<EstimateListTable entityId="test-entity-id" />);

    await waitFor(() => {
      expect(mockSDK.estimates.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: "test-entity-id",
        }),
      );
    });
  });

  test("handles row click with estimate data", async () => {
    const onRowClick = mock<(estimate: Estimate) => void>();

    customRender(<EstimateListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first estimate number link and click it
    const estimateLink = await screen.findByText("EST-001");
    await userEvent.click(estimateLink);

    expect(onRowClick).toHaveBeenCalledWith(mockEstimates[0]);
  });

  test("displays estimate data correctly", async () => {
    customRender(<EstimateListTable entityId="test-entity" />);

    // Check that estimate numbers are displayed
    expect(await screen.findByText("EST-001")).toBeInTheDocument();
    expect(await screen.findByText("EST-002")).toBeInTheDocument();

    // Check that customer names are displayed
    expect(await screen.findByText("Customer 1")).toBeInTheDocument();
    expect(await screen.findByText("Customer 2")).toBeInTheDocument();
  });

  test("uses estimate-specific translations", async () => {
    const customTranslations = {
      Number: "Številka",
      Customer: "Stranka",
      Date: "Datum",
      "Valid Until": "Veljavno do",
      Total: "Skupaj",
      "Total with Tax": "Skupaj z DDV",
    };

    customRender(
      <EstimateListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    expect(await screen.findByText("Številka")).toBeInTheDocument();
    expect(await screen.findByText("Stranka")).toBeInTheDocument();
    expect(await screen.findByText("Datum")).toBeInTheDocument();
  });

  test("calls download callbacks when provided", async () => {
    const onDownloadStart = mock();
    const onDownloadSuccess = mock();
    const onDownloadError = mock();

    customRender(
      <EstimateListTable
        entityId="test-entity"
        onDownloadStart={onDownloadStart}
        onDownloadSuccess={onDownloadSuccess}
        onDownloadError={onDownloadError}
      />,
    );

    // Verify table renders with estimates
    expect(await screen.findByText("EST-001")).toBeInTheDocument();
  });
});
