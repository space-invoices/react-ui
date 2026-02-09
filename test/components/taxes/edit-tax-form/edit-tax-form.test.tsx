import { describe, expect, mock, test } from "bun:test";
import type { Tax } from "@spaceinvoices/js-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the SDK provider - SDK signature: update(id, data, { entity_id })
const mockUpdateTax = mock(async (id: string, data: any, _options: any) => ({
  id,
  ...data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      taxes: {
        update: mockUpdateTax,
      },
    },
  }),
};

// Mock the entities provider
const mockEntitiesProvider = {
  useEntities: () => ({
    entities: [{ id: "entity-123", name: "Test Entity", environment: "live" }],
    activeEntity: { id: "entity-123", name: "Test Entity", environment: "live" },
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
};

mock.module("@/ui/providers/sdk-provider", () => mockSDK);
mock.module("@/ui/providers/entities-provider", () => mockEntitiesProvider);
mock.module("@/ui/providers/entities-context", () => mockEntitiesProvider);

import EditTaxForm from "@/ui/components/taxes/edit-tax-form/edit-tax-form";

// Create a wrapper component with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTax: Tax = {
  id: "tax-123",
  name: "VAT 22%",
  tax_rates: [{ rate: 22 }],
  is_default: false,
  entity_id: "entity-123",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
} as Tax;

describe("EditTaxForm", () => {
  test("renders rate field pre-filled with existing tax data", () => {
    render(<EditTaxForm entityId="entity-123" tax={mockTax} />, {
      wrapper: createWrapper(),
    });

    const rateInput = screen.getByRole("spinbutton", { name: /rate/i });
    expect(rateInput).toBeInTheDocument();
    expect((rateInput as HTMLInputElement).value).toBe("22");
  });

  test("renders is_default checkbox reflecting current state", () => {
    render(<EditTaxForm entityId="entity-123" tax={mockTax} />, {
      wrapper: createWrapper(),
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  test("submits with updated data and calls onSuccess", async () => {
    const onSuccess = mock();

    render(
      <EditTaxForm
        entityId="entity-123"
        tax={mockTax}
        onSuccess={onSuccess}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Save
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Update rate
    await userEvent.clear(screen.getByRole("spinbutton", { name: /rate/i }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /rate/i }), "10");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("calls onError on mutation failure", async () => {
    const error = new Error("API Error");
    const onError = mock();

    mockUpdateTax.mockImplementationOnce(() => {
      throw error;
    });

    render(
      <EditTaxForm
        entityId="entity-123"
        tax={mockTax}
        onError={onError}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Save
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    await userEvent.clear(screen.getByRole("spinbutton", { name: /rate/i }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /rate/i }), "10");
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  test("handles is_default=true initial state", () => {
    const defaultTax: Tax = {
      ...mockTax,
      is_default: true,
    } as Tax;

    render(<EditTaxForm entityId="entity-123" tax={defaultTax} />, {
      wrapper: createWrapper(),
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });
});
