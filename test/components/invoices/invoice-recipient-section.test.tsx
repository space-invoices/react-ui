import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { DocumentRecipientSection as InvoiceRecipientSection } from "@/ui/components/documents/create/document-recipient-section";

// Mock SDK
const mockSDK = {
  useSDK: () => ({
    sdk: {
      customers: {
        list: mock(async () => ({
          data: [],
          pagination: { total: 0, has_more: false, next_cursor: null, prev_cursor: null },
        })),
      },
    },
  }),
};

mock.module("@/ui/providers/sdk-provider", () => mockSDK);

// Mock useCustomerSearch hook
const mockUseCustomerSearch = mock(() => ({
  data: { data: [] },
  isLoading: false,
}));

// Mock useRecentCustomers hook
const mockUseRecentCustomers = mock(() => ({
  data: { data: [] },
  isLoading: false,
}));

mock.module("@/ui/components/customers/customers.hooks", () => ({
  useCustomerSearch: mockUseCustomerSearch,
  useRecentCustomers: mockUseRecentCustomers,
}));

// Create a wrapper component with QueryClientProvider and form
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

// Test component wrapper that includes form context
const TestWrapper = ({
  onCustomerSelect,
  onCustomerClear,
  showCustomerForm = false,
  shouldFocusName = false,
  selectedCustomerId,
}: {
  onCustomerSelect: (customerId: string, customer: any) => void;
  onCustomerClear: () => void;
  showCustomerForm?: boolean;
  shouldFocusName?: boolean;
  selectedCustomerId?: string;
}) => {
  const methods = useForm({
    defaultValues: {
      customer_id: selectedCustomerId,
      customer: {
        name: "",
        address: "",
        address_2: "",
        post_code: "",
        city: "",
        state: "",
        country: "",
        tax_number: "",
      },
    },
  });

  return (
    <FormProvider {...methods}>
      <InvoiceRecipientSection
        control={methods.control as any}
        entityId="ent_123"
        onCustomerSelect={onCustomerSelect}
        onCustomerClear={onCustomerClear}
        showCustomerForm={showCustomerForm}
        shouldFocusName={shouldFocusName}
        selectedCustomerId={selectedCustomerId}
        t={(key) => key}
      />
    </FormProvider>
  );
};

describe("InvoiceRecipientSection", () => {
  test("renders section title", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} />
      </Wrapper>,
    );

    expect(screen.getByText("Recipient")).toBeInTheDocument();
  });

  test("shows customer autocomplete input", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText("Search or create customer...")).toBeInTheDocument();
  });

  test("does NOT show Clear button when no customer is selected", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={false} />
      </Wrapper>,
    );

    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  test("shows Clear button when customer form is visible", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={true} />
      </Wrapper>,
    );

    const clearButton = screen.getByText("Clear").closest("button");
    expect(clearButton).toBeInTheDocument();
  });

  test("calls onCustomerClear when Clear button is clicked", async () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});
    const user = userEvent.setup();

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={true} />
      </Wrapper>,
    );

    const clearButton = screen.getByText("Clear");
    await user.click(clearButton);

    expect(onCustomerClear).toHaveBeenCalledTimes(1);
  });

  test("hides customer detail fields when showCustomerForm is false", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={false} />
      </Wrapper>,
    );

    expect(screen.queryByPlaceholderText("Address")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("City")).not.toBeInTheDocument();
  });

  test("shows customer detail fields when showCustomerForm is true", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={true} />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText("Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Address 2")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Post Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("City")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("State")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Country")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tax Number")).toBeInTheDocument();
  });

  test("Clear button has custom small styling with cursor pointer", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper onCustomerSelect={onCustomerSelect} onCustomerClear={onCustomerClear} showCustomerForm={true} />
      </Wrapper>,
    );

    const clearButton = screen.getByText("Clear").closest("button");
    expect(clearButton).toHaveClass("h-7");
    expect(clearButton).toHaveClass("px-2");
    expect(clearButton).toHaveClass("text-xs");
    expect(clearButton).toHaveClass("cursor-pointer");
  });

  test("renders autocomplete with selectedCustomerId value", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerSelect = mock(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onCustomerClear = mock(() => {});

    render(
      <Wrapper>
        <TestWrapper
          onCustomerSelect={onCustomerSelect}
          onCustomerClear={onCustomerClear}
          selectedCustomerId="cus_123"
        />
      </Wrapper>,
    );

    // The autocomplete should be rendered with the value
    expect(screen.getByPlaceholderText("Search or create customer...")).toBeInTheDocument();
  });
});
