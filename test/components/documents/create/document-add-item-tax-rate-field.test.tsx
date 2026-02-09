import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";

const mockTaxes = [
  {
    id: "tax-1",
    name: "VAT 22%",
    tax_rates: [{ rate: 22 }],
    is_default: true,
    entity_id: "entity-123",
  },
  {
    id: "tax-2",
    name: "VAT 9.5%",
    tax_rates: [{ rate: 9.5 }],
    is_default: false,
    entity_id: "entity-123",
  },
];

const mockListTaxes = mock(async () => ({
  data: mockTaxes,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      taxes: {
        list: mockListTaxes,
      },
    },
  }),
};

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

import DocumentAddItemTaxRateField from "@/ui/components/documents/create/document-add-item-tax-rate-field";

// Wrapper that provides both FormProvider (with real control) and QueryClient
function TestFormWrapper({
  defaultValues,
  onRemove,
  onAddNewTax,
}: {
  defaultValues?: any;
  onRemove?: () => void;
  onAddNewTax?: () => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormInner defaultValues={defaultValues} onRemove={onRemove} onAddNewTax={onAddNewTax} />
    </QueryClientProvider>
  );
}

function FormInner({
  defaultValues,
  onRemove,
  onAddNewTax,
}: {
  defaultValues?: any;
  onRemove?: () => void;
  onAddNewTax?: () => void;
}) {
  const methods = useForm({
    defaultValues: defaultValues || {
      items: [{ taxes: [{ tax_id: "" }] }],
    },
  });
  return (
    <FormProvider {...methods}>
      <DocumentAddItemTaxRateField
        index={0}
        taxIndex={0}
        control={methods.control}
        entityId="entity-123"
        onRemove={onRemove || (() => undefined)}
        onAddNewTax={onAddNewTax}
      />
    </FormProvider>
  );
}

describe("DocumentAddItemTaxRateField", () => {
  beforeEach(() => {
    mockListTaxes.mockClear();
    mockListTaxes.mockImplementation(async () => ({
      data: mockTaxes,
    }));
  });

  test("renders tax select with label", async () => {
    render(<TestFormWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Tax")).toBeInTheDocument();
    });
  });

  test("auto-selects default tax when no selection", async () => {
    render(<TestFormWrapper />);

    // The default tax (VAT 22%) should be auto-selected
    await waitFor(() => {
      expect(screen.getByText("22%")).toBeInTheDocument();
    });
  });

  test("falls back to first tax when no default exists", async () => {
    mockListTaxes.mockImplementation(async () => ({
      data: [
        { id: "tax-a", name: "Tax A", tax_rates: [{ rate: 5 }], is_default: false, entity_id: "entity-123" },
        { id: "tax-b", name: "Tax B", tax_rates: [{ rate: 10 }], is_default: false, entity_id: "entity-123" },
      ],
    }));

    render(<TestFormWrapper />);

    // Should fallback to first tax (Tax A at 5%)
    await waitFor(() => {
      expect(screen.getByText("5%")).toBeInTheDocument();
    });
  });

  test("shows Add... option when onAddNewTax is provided", async () => {
    const onAddNewTax = mock();
    const user = userEvent.setup();

    render(<TestFormWrapper onAddNewTax={onAddNewTax} />);

    // Wait for taxes to load
    await waitFor(() => {
      expect(screen.getByText("22%")).toBeInTheDocument();
    });

    // Open select
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Add...")).toBeInTheDocument();
    });
  });

  test("calls onRemove when remove button clicked", async () => {
    const onRemove = mock();
    const user = userEvent.setup();

    render(<TestFormWrapper onRemove={onRemove} />);

    // Wait for render
    await waitFor(() => {
      expect(screen.getByText("Tax")).toBeInTheDocument();
    });

    // Find and click remove button (trash icon button)
    const buttons = screen.getAllByRole("button");
    // The remove button is the one that is not the combobox
    const removeButton = buttons.find(
      (btn) => btn.getAttribute("role") !== "combobox" && btn.getAttribute("type") === "button",
    );
    if (removeButton) {
      await user.click(removeButton);
      expect(onRemove).toHaveBeenCalled();
    }
  });
});
