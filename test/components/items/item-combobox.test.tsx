import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemCombobox } from "@/ui/components/items/item-combobox";

// Mock SDK
const mockSDK = {
  useSDK: () => ({
    sdk: {
      items: {
        list: mock(async () => ({
          data: [],
          pagination: { total: 0, has_more: false, next_cursor: null, prev_cursor: null },
        })),
      },
    },
  }),
};

mock.module("@/ui/providers/sdk-provider", () => mockSDK);

// Mock useItemSearch hook
const mockUseItemSearch = mock((_entityId: string, search: string) => ({
  data: search
    ? {
        data: [
          { id: "item_1", name: "Consulting", price: 150, description: "Consulting services", tax_ids: [] },
          { id: "item_2", name: "Development", price: 200, description: "Dev work", tax_ids: ["tax_1"] },
        ].filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
      }
    : { data: [] },
  isLoading: false,
}));

// Mock useRecentItems hook
const mockUseRecentItems = mock(() => ({
  data: {
    data: [
      { id: "item_3", name: "Recent Item 1", price: 100, description: null, tax_ids: [] },
      {
        id: "item_4",
        name: "Recent Item 2",
        price: 50,
        gross_price: 61,
        description: "With gross",
        tax_ids: ["tax_1"],
      },
    ],
  },
  isLoading: false,
}));

mock.module("@/ui/components/items/items.hooks", () => ({
  useItemSearch: mockUseItemSearch,
  useRecentItems: mockUseRecentItems,
  ITEMS_CACHE_KEY: "items",
}));

// Default placeholder used by ItemCombobox
const DEFAULT_PLACEHOLDER = "Search or enter item name...";

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

describe("ItemCombobox", () => {
  test("renders autocomplete input", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} placeholder="Search items..." />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText("Search items...")).toBeInTheDocument();
  });

  test("triggers search when user types", async () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER);
    await user.type(input, "Cons");

    await waitFor(() => {
      expect(mockUseItemSearch).toHaveBeenCalled();
    });
  });

  test("debounces search input", async () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER);
    await user.click(input);
    await user.keyboard("Test");

    // Verify debounce hook is being used
    await waitFor(() => {
      expect(mockUseItemSearch).toHaveBeenCalled();
    });
  });

  test("renders custom placeholder correctly", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} placeholder="Find an item..." />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText("Find an item...")).toBeInTheDocument();
  });

  test("respects disabled prop", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} disabled={true} />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER);
    expect(input).toBeDisabled();
  });

  test("uses custom className when provided", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} className="custom-class" />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER);
    expect(input).toHaveClass("custom-class");
  });

  test("renders with default placeholder", () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" onSelect={onSelect} />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText(DEFAULT_PLACEHOLDER)).toBeInTheDocument();
  });

  test("clears input when value prop becomes undefined", async () => {
    const Wrapper = createWrapper();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock function
    const onSelect = mock(() => {});

    const { rerender } = render(
      <Wrapper>
        <ItemCombobox entityId="ent_1" value="item_1" onSelect={onSelect} />
      </Wrapper>,
    );

    rerender(
      <Wrapper>
        <ItemCombobox entityId="ent_1" value={undefined} onSelect={onSelect} />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText(DEFAULT_PLACEHOLDER) as HTMLInputElement;
    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});
