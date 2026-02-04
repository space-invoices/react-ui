import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateEntityForm } from "@/ui/components/entities/create-entity-form";

// Mock the SDK provider
const mockCreateEntity = mock(async (data) => ({
  id: "123",
  ...data.data,
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      entities: {
        create: mockCreateEntity,
      },
    },
  }),
};

mock.module("@/ui/providers/sdk-provider", () => mockSDK);

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

describe("CreateEntityForm", () => {
  test("renders all form fields", () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    // Check for required fields using more specific queries
    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^address$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /address 2/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /post code/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /city/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /state/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /country/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /tax number/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  test("shows validation errors for required fields", async () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    // Try to submit empty form
    const submitButton = screen.getByRole("button", { name: /create/i });
    await userEvent.click(submitButton);

    // Check for error messages on required fields (name and country)
    // Both should show validation errors for empty required fields
    await waitFor(
      () => {
        const errors = screen.getAllByText(/too small.*expected string to have.*1 character/i);
        // Should have errors for both name and country
        expect(errors.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 3000 },
    );
  });

  test("submits form with valid data", async () => {
    const onSuccess = mock();
    const onError = mock();

    render(<CreateEntityForm onSuccess={onSuccess} onError={onError} />, { wrapper: createWrapper() });

    // Fill out form
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Entity");
    await userEvent.type(screen.getByRole("textbox", { name: /^address$/i }), "123 Test St");
    await userEvent.type(screen.getByRole("textbox", { name: /address 2/i }), "Suite 100");
    await userEvent.type(screen.getByRole("textbox", { name: /post code/i }), "12345");
    await userEvent.type(screen.getByRole("textbox", { name: /city/i }), "Test City");
    await userEvent.type(screen.getByRole("textbox", { name: /state/i }), "Test State");
    await userEvent.type(screen.getByRole("textbox", { name: /country/i }), "Test Country");
    await userEvent.type(screen.getByRole("textbox", { name: /tax number/i }), "123456789");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify success callback was called
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(onError).not.toHaveBeenCalled();
  });

  test("handles submission error", async () => {
    const error = new Error("API Error");

    // Override the create mock to throw an error
    mockCreateEntity.mockImplementation(() => {
      throw error;
    });

    const onSuccess = mock();
    const onError = mock();

    render(<CreateEntityForm onSuccess={onSuccess} onError={onError} />, { wrapper: createWrapper() });

    // Fill required fields
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Entity");
    await userEvent.type(screen.getByRole("textbox", { name: /country/i }), "Test Country");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    // Verify error callback was called
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
    expect(onSuccess).not.toHaveBeenCalled();

    // Reset the mock for other tests
    mockCreateEntity.mockReset();
  });

  test("handles translations", () => {
    const translate = mock((key: string) => `translated.${key}`);
    render(<CreateEntityForm t={translate} namespace="entity" />, { wrapper: createWrapper() });

    expect(translate).toHaveBeenCalledWith("entity.Name");
    expect(screen.getByText("translated.entity.Name")).toBeInTheDocument();
  });
});
