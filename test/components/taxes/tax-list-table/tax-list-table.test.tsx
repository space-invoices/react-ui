import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Tax } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TaxListTable from "@/ui/components/taxes/tax-list-table/tax-list-table";

// Mock the SDK provider
const mockSDK = {
  taxes: {
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

describe("TaxListTable", () => {
  let queryClient: QueryClient;
  const mockTaxes = [
    {
      id: "tax-1",
      name: "VAT Standard",
      tax_rates: [{ rate: 20, valid_from: "2023-01-01" }],
      entity_id: "entity1",
      created_at: new Date("2023-01-01T00:00:00Z").toISOString(),
      updated_at: new Date("2023-01-01T00:00:00Z").toISOString(),
    },
    {
      id: "tax-2",
      name: "VAT Reduced",
      tax_rates: [{ rate: 9.5, valid_from: "2023-01-01" }],
      entity_id: "entity1",
      created_at: new Date("2023-01-02T00:00:00Z").toISOString(),
      updated_at: new Date("2023-01-02T00:00:00Z").toISOString(),
    },
  ] as any as Tax[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockSDK.taxes.list.mockReset();

    // Setup default mock implementation
    mockSDK.taxes.list.mockImplementation(() =>
      Promise.resolve({
        data: mockTaxes,
        pagination: {
          total: mockTaxes.length,
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

  test("calls SDK to fetch taxes", async () => {
    customRender(<TaxListTable entityId="test-entity" />);

    await waitFor(() => {
      expect(mockSDK.taxes.list).toHaveBeenCalledTimes(1);
      expect(mockSDK.taxes.list).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "-id",
        }),
      );
    });
  });

  test("passes entityId to fetch function when provided", async () => {
    customRender(<TaxListTable entityId="test-entity-id" />);

    await waitFor(() => {
      expect(mockSDK.taxes.list).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: "test-entity-id",
        }),
      );
    });
  });

  test("handles row click with tax data", async () => {
    const onRowClick = mock<(tax: Tax) => void>();

    customRender(<TaxListTable onRowClick={onRowClick} entityId="test-entity" />);

    // Find the first tax name link and click it
    const taxLink = await screen.findByText("VAT Standard");
    await userEvent.click(taxLink);

    expect(onRowClick).toHaveBeenCalledWith(mockTaxes[0]);
  });

  test("displays tax data correctly", async () => {
    customRender(<TaxListTable entityId="test-entity" />);

    // Check that tax names are displayed
    expect(await screen.findByText("VAT Standard")).toBeInTheDocument();
    expect(await screen.findByText("VAT Reduced")).toBeInTheDocument();
  });

  test("uses tax-specific translations", async () => {
    const customTranslations = {
      Name: "Naziv",
      Rate: "Stopnja",
    };

    customRender(
      <TaxListTable
        t={(key) => customTranslations[key as keyof typeof customTranslations] || key}
        entityId="test-entity"
      />,
    );

    expect(await screen.findByText("Naziv")).toBeInTheDocument();
  });
});
