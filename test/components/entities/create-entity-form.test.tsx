import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { CreateEntityForm } from "@/ui/components/entities/create-entity-form";

// Mock the SDK provider
const mockCreateEntity = mock(async (data) => ({
  id: "123",
  ...data.data,
}));

const mockList = mock(async () => ({ data: ["SI", "AT", "DE"] }));
const mockSearch = mock(async () => ({
  data: [
    {
      id: "company-1",
      name: "Test Company d.o.o.",
      address: "Main Street 1",
      city: "Ljubljana",
      post_code: "1000",
      tax_number: "SI12345678",
      registration_number: "1234567890",
      legal_form: "d.o.o.",
      bank_accounts: [],
    },
    {
      id: "company-2",
      name: "Test Corp d.o.o.",
      address: "Second Ave 5",
      city: "Maribor",
      post_code: "2000",
      tax_number: "SI87654321",
      registration_number: "0987654321",
      legal_form: "d.o.o.",
      bank_accounts: [],
    },
  ],
}));

const mockSDK = {
  useSDK: () => ({
    sdk: {
      entities: {
        create: mockCreateEntity,
      },
      companyRegistry: {
        list: mockList,
        searchCompanyRegistry: mockSearch,
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CreateEntityForm", () => {
  test("renders all form fields", () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    // Check for fields using the current visible labels
    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^address$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /address 2/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /post code/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /city/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /state/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /country/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /tax number/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create entity/i })).toBeInTheDocument();
  });

  test("shows validation errors for required fields", async () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    // Try to submit empty form
    const submitButton = screen.getByRole("button", { name: /create entity/i });
    await userEvent.click(submitButton);

    // Check for error messages on required fields (name and country)
    // Both should show validation errors for empty required fields
    await waitFor(
      () => {
        const errors = screen.getAllByText(/invalid input|must contain at least 1 character|too small|required/i);
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
    fireEvent.click(screen.getByRole("button", { name: /create entity/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /create entity/i }));

    // Verify error callback was called
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
    expect(onSuccess).not.toHaveBeenCalled();

    // Reset the mock for other tests
    mockCreateEntity.mockReset();
  });

  test("uses translation function with namespace", () => {
    const translate = mock((key: string) => `translated.${key}`);
    render(<CreateEntityForm t={translate} namespace="entity" />, { wrapper: createWrapper() });

    // Verify translate is called with namespaced lowercase keys
    expect(translate).toHaveBeenCalledWith("entity.name");
    expect(translate).toHaveBeenCalledWith("entity.country");
    expect(translate).toHaveBeenCalledWith("entity.address");
    expect(translate).toHaveBeenCalledWith("entity.address-2");
    expect(translate).toHaveBeenCalledWith("entity.post-code");
    expect(translate).toHaveBeenCalledWith("entity.city");
    expect(translate).toHaveBeenCalledWith("entity.state");
    expect(translate).toHaveBeenCalledWith("entity.tax-number");
    expect(translate).toHaveBeenCalledWith("entity.company-number");
    expect(translate).toHaveBeenCalledWith("entity.submit");
  });

  test("renders autocomplete for name field when country is supported", async () => {
    render(<CreateEntityForm countryCode="SI" />, { wrapper: createWrapper() });

    // Wait for the country support check to resolve
    await waitFor(() => {
      // The name field should be an autocomplete input (rendered by Autocomplete component)
      const nameInput = screen.getByPlaceholderText("Name");
      expect(nameInput).toBeInTheDocument();
    });

    // The autocomplete should have autoComplete="off" attribute
    const nameInput = screen.getByPlaceholderText("Name");
    expect(nameInput).toHaveAttribute("autocomplete", "off");
  });

  test("shows autocomplete results and fills form on selection", async () => {
    render(<CreateEntityForm countryCode="SI" />, { wrapper: createWrapper() });

    // Wait for country support to resolve
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Name");

    // Type a search query (minimum 2 chars to trigger search)
    await userEvent.type(nameInput, "Test");

    // Wait for search results to appear
    await waitFor(
      () => {
        expect(mockSearch).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // The autocomplete dropdown should show company results
    await waitFor(
      () => {
        expect(screen.getByText("Test Company d.o.o.")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Click on the first result
    await userEvent.click(screen.getByText("Test Company d.o.o."));

    // Verify form fields were populated from the selected company
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /^address$/i })).toHaveValue("Main Street 1");
      expect(screen.getByRole("textbox", { name: /post code/i })).toHaveValue("1000");
      expect(screen.getByRole("textbox", { name: /city/i })).toHaveValue("Ljubljana");
      expect(screen.getByRole("textbox", { name: /tax number/i })).toHaveValue("SI12345678");
      expect(screen.getByRole("textbox", { name: /company number/i })).toHaveValue("1234567890");
    });
  });

  test("renders regular input for unsupported country", async () => {
    // Mock list to return countries that don't include "XX"
    render(<CreateEntityForm countryCode="XX" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const nameInput = screen.getByRole("textbox", { name: /name/i });
      expect(nameInput).toBeInTheDocument();
      // Regular FormInput doesn't have autoComplete="off"
      expect(nameInput).not.toHaveAttribute("autocomplete", "off");
    });
  });

  test("renders regular input when no countryCode provided", () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    expect(nameInput).toBeInTheDocument();
    // Regular FormInput doesn't set autoComplete="off"
    expect(nameInput).not.toHaveAttribute("autocomplete", "off");
  });

  test("sets default name from prop", () => {
    render(<CreateEntityForm defaultName="My Company" />, { wrapper: createWrapper() });

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    expect(nameInput).toHaveValue("My Company");
  });

  test("auto-fills country name from countryCode using locale", () => {
    render(<CreateEntityForm countryCode="SI" locale="sl" />, { wrapper: createWrapper() });

    const countryInput = screen.getByRole("textbox", { name: /country/i });
    expect(countryInput).toHaveValue("Slovenija");
  });

  test("auto-fills country name in English by default", () => {
    render(<CreateEntityForm countryCode="SI" />, { wrapper: createWrapper() });

    const countryInput = screen.getByRole("textbox", { name: /country/i });
    expect(countryInput).toHaveValue("Slovenia");
  });

  test("autocomplete stays stable when country field is edited", async () => {
    render(<CreateEntityForm countryCode="SI" />, { wrapper: createWrapper() });

    // Initially autocomplete should be shown (country is supported)
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText("Name");
      expect(nameInput).toHaveAttribute("autocomplete", "off");
    });

    // Edit the country field away from the auto-filled value
    const countryInput = screen.getByRole("textbox", { name: /country/i });
    fireEvent.change(countryInput, { target: { value: "Germany" } });

    // Autocomplete should remain stable — no component switch mid-typing
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText("Name");
      expect(nameInput).toHaveAttribute("autocomplete", "off");
    });

    // Country field should retain the user's input
    expect(countryInput).toHaveValue("Germany");
  });

  test("country field retains value when changed from pre-filled country", async () => {
    render(<CreateEntityForm countryCode="US" locale="en" />, { wrapper: createWrapper() });

    const countryInput = screen.getByRole("textbox", { name: /country/i });
    expect(countryInput).toHaveValue("United States");

    // Change to a new country
    fireEvent.change(countryInput, { target: { value: "Ireland" } });

    // Country should stay as the user typed it, not revert
    expect(countryInput).toHaveValue("Ireland");
  });

  test("does not send empty country_code on submit", async () => {
    mockCreateEntity.mockReset();
    mockCreateEntity.mockImplementation(async (data) => ({
      id: "123",
      ...data.data,
    }));

    const onSuccess = mock();
    render(<CreateEntityForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

    // Fill required fields — no countryCode prop means country_code defaults to ""
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Entity");
    await userEvent.type(screen.getByRole("textbox", { name: /country/i }), "Ireland");

    fireEvent.click(screen.getByRole("button", { name: /create entity/i }));

    await waitFor(() => {
      expect(mockCreateEntity).toHaveBeenCalled();
    });

    // Exact country matches should be normalized to ISO codes client-side
    const submittedData = mockCreateEntity.mock.calls[0][0];
    expect(submittedData.country_code).toBe("IE");
  });

  test("sends country_code when pre-filled and country not changed", async () => {
    mockCreateEntity.mockReset();
    mockCreateEntity.mockImplementation(async (data) => ({
      id: "123",
      ...data.data,
    }));

    const onSuccess = mock();
    render(<CreateEntityForm countryCode="SI" locale="en" onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    });

    // Fill name (country is already pre-filled as "Slovenia")
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText("Name"), "Test Entity");

    fireEvent.click(screen.getByRole("button", { name: /create entity/i }));

    await waitFor(() => {
      expect(mockCreateEntity).toHaveBeenCalled();
    });

    // country_code should be present since the auto-filled country was not changed
    const submittedData = mockCreateEntity.mock.calls[0][0];
    expect(submittedData.country_code).toBe("SI");
  });

  test("updates country_code when user changes the pre-filled country to another exact match", async () => {
    mockCreateEntity.mockReset();
    mockCreateEntity.mockImplementation(async (data) => ({
      id: "123",
      ...data.data,
    }));

    const onSuccess = mock();
    render(<CreateEntityForm countryCode="US" locale="en" onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    });

    // Change the pre-filled country
    const countryInput = screen.getByRole("textbox", { name: /country/i });
    fireEvent.change(countryInput, { target: { value: "Ireland" } });

    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Test Entity");

    fireEvent.click(screen.getByRole("button", { name: /create entity/i }));

    await waitFor(() => {
      expect(mockCreateEntity).toHaveBeenCalled();
    });

    // country_code should be updated to the new exact match
    const submittedData = mockCreateEntity.mock.calls[0][0];
    expect(submittedData.country_code).toBe("IE");
    expect(submittedData.country).toBe("Ireland");
  });

  test("renders is_tax_subject checkbox", () => {
    render(<CreateEntityForm />, { wrapper: createWrapper() });

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("Tax subject")).toBeInTheDocument();
  });
});
