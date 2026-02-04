import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateCustomerForm from "@/ui/components/customers/create-customer-form/create-customer-form";

// Mock the SDK provider - SDK signature: create(data, { entity_id })
const mockCreateCustomer = mock(async (data, _options) => ({
  id: "123",
  ...data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      customers: {
        create: mockCreateCustomer,
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

  return ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("CreateCustomerForm", () => {
  test("renders all form fields", () => {
    render(<CreateCustomerForm entityId="entity-123" />, { wrapper: createWrapper() });

    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^address$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /post code/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /city/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /state/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /country/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /tax number/i })).toBeInTheDocument();
  });

  test("shows validation errors for required fields", async () => {
    render(
      <CreateCustomerForm
        entityId="entity-123"
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Submit empty form - this should trigger validation
    const submitButton = screen.getByRole("button", { name: /create/i });
    await userEvent.click(submitButton);

    // Check for form-message element with error
    await waitFor(() => {
      const errorElement = document.querySelector('[data-slot="form-message"]');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement?.textContent).toMatch(/too small|required|character/i);
    });
  });

  test("submits form with valid data", async () => {
    const onSuccess = mock();

    render(
      <CreateCustomerForm
        entityId="entity-123"
        onSuccess={onSuccess}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Fill out form
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Customer");
    await userEvent.type(screen.getByRole("textbox", { name: /^address$/i }), "123 Test St");
    await userEvent.type(screen.getByRole("textbox", { name: /post code/i }), "12345");
    await userEvent.type(screen.getByRole("textbox", { name: /city/i }), "Test City");
    await userEvent.type(screen.getByRole("textbox", { name: /state/i }), "Test State");
    await userEvent.type(screen.getByRole("textbox", { name: /country/i }), "Test Country");
    await userEvent.type(screen.getByRole("textbox", { name: /tax number/i }), "123456789");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called with created customer
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "123",
          name: "Test Customer",
        }),
      );
    });
  });

  test("handles translations", () => {
    const translate = mock((key: string) => `translated.${key}`);
    render(<CreateCustomerForm entityId="entity-123" t={translate} namespace="customer" />, {
      wrapper: createWrapper(),
    });

    expect(translate).toHaveBeenCalledWith("customer.Name");
    expect(screen.getByText("translated.customer.Name")).toBeInTheDocument();
  });
});
