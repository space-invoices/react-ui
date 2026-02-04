import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePaymentForm from "@/ui/components/payments/create-payment-form/create-payment-form";

// Mock the SDK provider
const mockCreatePayment = mock(async (data) => ({
  id: "payment-123",
  ...data.data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      payments: {
        create: mockCreatePayment,
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

// Create a wrapper component with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CreatePaymentForm", () => {
  const defaultProps = {
    entityId: "entity-123",
    invoiceId: "invoice-123",
    invoiceTotal: 100.0,
  };

  test("renders all form fields", () => {
    render(<CreatePaymentForm {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment type/i)).toBeInTheDocument();
    expect(screen.getByText(/payment date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });

  test("initializes with invoice total as default amount", () => {
    render(<CreatePaymentForm {...defaultProps} />, { wrapper: createWrapper() });

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    expect(amountInput).toHaveValue(100);
  });

  test("initializes with cash as default payment type", () => {
    render(<CreatePaymentForm {...defaultProps} />, { wrapper: createWrapper() });

    const paymentTypeSelect = screen.getByRole("combobox", { name: /payment type/i });
    expect(paymentTypeSelect).toHaveTextContent(/cash/i);
  });

  test("submits form with valid data", async () => {
    const onSuccess = mock();

    render(
      <CreatePaymentForm
        {...defaultProps}
        onSuccess={onSuccess}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Amount is pre-filled, just submit
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called with created payment
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "payment-123",
        }),
      );
    });
  });

  test("handles submission error", async () => {
    const error = new Error("API Error");
    const onError = mock();

    // Override the create mock to throw an error
    mockCreatePayment.mockImplementationOnce(() => {
      throw error;
    });

    render(
      <CreatePaymentForm
        {...defaultProps}
        onError={onError}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify onError callback was called with the error
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  test("allows entering optional reference and note", async () => {
    const onSuccess = mock();

    render(
      <CreatePaymentForm
        {...defaultProps}
        onSuccess={onSuccess}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Fill optional fields
    await userEvent.type(screen.getByRole("textbox", { name: /reference/i }), "REF-001");
    await userEvent.type(screen.getByRole("textbox", { name: /note/i }), "Payment received");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called with the payment object
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "payment-123",
        }),
      );
    });
  });
});
