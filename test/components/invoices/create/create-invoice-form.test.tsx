import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/ui/components/ui/tooltip";
import { FormFooterProvider, useFormFooterContext } from "@/ui/providers/form-footer-context";

// ============================================================================
// MOCKS
// ============================================================================

const mockCreateInvoice = mock(async (data: any) => ({
  id: "inv_123",
  number: "2024-00001",
  ...data,
}));

const mockUpdateInvoice = mock(async (id: string, data: any) => ({
  id,
  number: "2024-00001",
  ...data,
}));

const mockGetNextNumber = mock(async () => ({
  number: "2024-00001",
  furs: null,
}));

const mockSDK = {
  invoices: {
    create: mockCreateInvoice,
    update: mockUpdateInvoice,
    list: mock(async () => ({ data: [], pagination: { total: 0 } })),
  },
  documents: {
    getNextNumber: mockGetNextNumber,
  },
  taxes: {
    list: mock(async () => ({ data: [], pagination: { total: 0 } })),
  },
  items: {
    list: mock(async () => ({ data: [], pagination: { total: 0 } })),
  },
  customers: {
    list: mock(async () => ({ data: [], pagination: { total: 0 } })),
    get: mock(async () => null),
  },
  fursSettings: {
    list: mock(async () => ({ furs_enabled: false })),
  },
  fursFiscalization: {
    listFursBusinessPremises: mock(async () => ({ data: [], pagination: { total: 0 } })),
    listFursElectronicDevices: mock(async () => ({ data: [], pagination: { total: 0 } })),
  },
};

const mockActiveEntity = {
  id: "entity-123",
  name: "Test Entity",
  environment: "live",
  country_code: "SI",
  currency_code: "EUR",
  settings: {},
};

// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
const mockSetActiveEntity = mock(() => {});

mock.module("@/ui/providers/sdk-provider", () => ({
  useSDK: () => ({ sdk: mockSDK }),
}));

mock.module("@/ui/providers/entities-provider", () => ({
  useEntities: () => ({
    entities: [mockActiveEntity],
    activeEntity: mockActiveEntity,
    setActiveEntity: mockSetActiveEntity,
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

mock.module("@/ui/providers/entities-context", () => ({
  useEntities: () => ({
    entities: [mockActiveEntity],
    activeEntity: mockActiveEntity,
    setActiveEntity: mockSetActiveEntity,
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

// Import after mocks are set up
import CreateInvoiceForm from "@/ui/components/invoices/create/create-invoice-form";

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Component that renders the form footer based on context state.
 * This simulates what the real app does with FormFooterProvider.
 */
function FormFooterDisplay() {
  const { state } = useFormFooterContext();
  if (!state) return null;

  return (
    <div data-testid="form-footer">
      <button type="submit" form={state.formId} disabled={state.isPending}>
        {state.label}
      </button>
      {state.secondaryAction && (
        <button type="button" onClick={state.secondaryAction.onClick}>
          {state.secondaryAction.label}
        </button>
      )}
    </div>
  );
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FormFooterProvider>
          {children}
          <FormFooterDisplay />
        </FormFooterProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

describe("CreateInvoiceForm", () => {
  beforeEach(() => {
    mockCreateInvoice.mockClear();
    mockUpdateInvoice.mockClear();
    mockGetNextNumber.mockClear();
  });

  // ==========================================================================
  // CREATE MODE TESTS
  // ==========================================================================

  describe("create mode (default)", () => {
    const defaultProps = {
      type: "invoice" as const,
      entityId: "entity-123",
    };

    test("renders form with required sections", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText(/recipient/i)).toBeInTheDocument();
      });

      // Check key sections are rendered
      expect(screen.getByText(/details/i)).toBeInTheDocument();
      expect(screen.getByText(/items/i)).toBeInTheDocument();
    });

    test("displays number field as disabled", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const numberInput = document.querySelector('input[name="number"]');
        expect(numberInput).toBeDisabled();
      });
    });

    test("fetches next invoice number on mount", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetNextNumber).toHaveBeenCalled();
      });
    });

    test("populates number field with fetched value", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const numberInput = document.querySelector('input[name="number"]') as HTMLInputElement;
        expect(numberInput?.value).toBe("2024-00001");
      });
    });

    test("registers Save button with form footer in create mode", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      });
    });

    test("registers Save as Draft as secondary action in create mode", async () => {
      render(<CreateInvoiceForm {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Save as Draft" })).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // EDIT MODE TESTS
  // ==========================================================================

  describe("edit mode", () => {
    const editProps = {
      type: "invoice" as const,
      entityId: "entity-123",
      mode: "edit" as const,
      documentId: "inv_existing",
      initialValues: {
        number: "2024-00042",
        date: "2024-01-15",
        date_due: "2024-02-15",
        customer: { name: "Existing Customer" },
        items: [{ name: "Existing Item", quantity: 2, price: 50 }],
        note: "Existing note",
      },
    };

    test("renders form with initial values in edit mode", async () => {
      render(<CreateInvoiceForm {...editProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/recipient/i)).toBeInTheDocument();
      });

      // Check that note field has initial value
      const noteField = document.querySelector('textarea[name="note"]') as HTMLTextAreaElement;
      expect(noteField).toHaveValue("Existing note");
    });

    test("displays existing number in disabled number field", async () => {
      render(<CreateInvoiceForm {...editProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const numberInput = document.querySelector('input[name="number"]') as HTMLInputElement;
        expect(numberInput).toBeDisabled();
        expect(numberInput?.value).toBe("2024-00042");
      });
    });

    test("does NOT fetch next invoice number in edit mode", async () => {
      render(<CreateInvoiceForm {...editProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/recipient/i)).toBeInTheDocument();
      });

      // In edit mode, we should not fetch next number
      expect(mockGetNextNumber).not.toHaveBeenCalled();
    });

    test("registers Update button instead of Save in edit mode", async () => {
      render(<CreateInvoiceForm {...editProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
      });

      // Save should NOT be present
      expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    });

    test("does NOT register Save as Draft in edit mode", async () => {
      render(<CreateInvoiceForm {...editProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/recipient/i)).toBeInTheDocument();
      });

      // Save as Draft should not be visible in edit mode
      expect(screen.queryByRole("button", { name: "Save as Draft" })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SHARED BEHAVIOR TESTS
  // ==========================================================================

  describe("shared behavior", () => {
    test("number field is always disabled regardless of mode", async () => {
      // Test create mode
      const { unmount } = render(<CreateInvoiceForm type="invoice" entityId="entity-123" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const numberInput = document.querySelector('input[name="number"]');
        expect(numberInput).toBeDisabled();
      });

      unmount();

      // Test edit mode
      render(
        <CreateInvoiceForm
          type="invoice"
          entityId="entity-123"
          mode="edit"
          documentId="inv_123"
          initialValues={{ number: "2024-00001", items: [] }}
        />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        const numberInput = document.querySelector('input[name="number"]');
        expect(numberInput).toBeDisabled();
      });
    });

    test("number field shows tooltip about settings on hover", async () => {
      render(<CreateInvoiceForm type="invoice" entityId="entity-123" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(document.querySelector('input[name="number"]')).toBeInTheDocument();
      });

      // Hover over the number input to see tooltip
      const numberInput = document.querySelector('input[name="number"]') as HTMLElement;
      await userEvent.hover(numberInput);

      // Tooltip should appear
      await waitFor(() => {
        expect(screen.getByText(/number format can be changed in settings/i)).toBeInTheDocument();
      });
    });

    test("calls onChange callback when form values change", async () => {
      const onChange = mock();

      render(<CreateInvoiceForm type="invoice" entityId="entity-123" onChange={onChange} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText(/recipient/i)).toBeInTheDocument();
      });

      // Type in note field (textarea) to trigger onChange
      const noteField = document.querySelector('textarea[name="note"]') as HTMLTextAreaElement;
      expect(noteField).toBeInTheDocument();
      await userEvent.type(noteField, "Test note");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    });
  });
});
