import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTaxForm from "@/ui/components/taxes/create-tax-form/create-tax-form";

// Mock the SDK provider - SDK signature: create(data, { entity_id })
const mockCreateTax = mock(async (data, _options) => ({
  id: "tax-123",
  ...data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      taxes: {
        create: mockCreateTax,
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

describe("CreateTaxForm", () => {
  test("renders all form fields", () => {
    render(<CreateTaxForm entityId="entity-123" />, { wrapper: createWrapper() });

    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /rate/i })).toBeInTheDocument();
  });

  test("does not submit form with empty required fields", async () => {
    render(
      <CreateTaxForm
        entityId="entity-123"
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Try to submit empty form
    const submitButton = screen.getByRole("button", { name: /create/i });
    await userEvent.click(submitButton);

    // Wait a bit for validation to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify the mutation was NOT called (form validation prevented submission)
    expect(mockCreateTax).not.toHaveBeenCalled();
  });

  test("submits form with valid data", async () => {
    const onSuccess = mock();

    render(
      <CreateTaxForm
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
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "VAT 20%");
    await userEvent.clear(screen.getByRole("spinbutton", { name: /rate/i }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /rate/i }), "20");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called with created tax
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "tax-123",
          name: "VAT 20%",
        }),
      );
    });
  });

  test("handles submission error", async () => {
    const error = new Error("API Error");
    const onError = mock();

    // Override the create mock to throw an error
    mockCreateTax.mockImplementationOnce(() => {
      throw error;
    });

    render(
      <CreateTaxForm
        entityId="entity-123"
        onError={onError}
        renderSubmitButton={({ submit }) => (
          <button type="button" onClick={submit}>
            Create
          </button>
        )}
      />,
      { wrapper: createWrapper() },
    );

    // Fill required fields and submit
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Tax");
    await userEvent.clear(screen.getByRole("spinbutton", { name: /rate/i }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /rate/i }), "10");
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify onError callback was called with the error
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
