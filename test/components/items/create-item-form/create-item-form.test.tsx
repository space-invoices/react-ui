import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateItemForm from "@/ui/components/items/create-item-form/create-item-form";

// Mock the SDK provider - SDK signature: create(data, { entity_id })
const mockCreateItem = mock(async (data, _options) => ({
  id: "item-123",
  ...data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      items: {
        create: mockCreateItem,
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

describe("CreateItemForm", () => {
  test("renders all form fields", () => {
    render(<CreateItemForm entityId="entity-123" />, { wrapper: createWrapper() });

    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /price/i })).toBeInTheDocument();
  });

  test("shows validation errors for required fields", async () => {
    render(
      <CreateItemForm
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

    // Check for error message on required name field
    await waitFor(
      () => {
        const errorText = screen.getByText(/too small.*expected string to have.*1 character/i);
        expect(errorText).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  test("submits form with valid data", async () => {
    const onSuccess = mock();

    render(
      <CreateItemForm
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
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Item");
    await userEvent.type(screen.getByRole("textbox", { name: /description/i }), "Test Description");
    await userEvent.clear(screen.getByRole("spinbutton", { name: /price/i }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /price/i }), "99.99");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called with created item
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "item-123",
          name: "Test Item",
        }),
      );
    });
  });

  test("handles submission error", async () => {
    const error = new Error("API Error");
    const onError = mock();

    // Override the create mock to throw an error
    mockCreateItem.mockImplementationOnce(() => {
      throw error;
    });

    render(
      <CreateItemForm
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

    // Fill required field and submit
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Item");
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify onError callback was called with the error
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
