import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable } from "@/ui/components/table/data-table";
import type { TableQueryParams, TableQueryResponse } from "@/ui/components/table/types";

type TestItem = {
  id: string;
  name: string;
};

// Generate mock data for 3 pages
const page1Items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(30 - i), // IDs 30-21
  name: `Item ${30 - i}`,
}));

const page2Items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(20 - i), // IDs 20-11
  name: `Item ${20 - i}`,
}));

const page3Items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(10 - i), // IDs 10-1
  name: `Item ${10 - i}`,
}));

describe("DataTable Pagination", () => {
  let queryClient: QueryClient;
  let mockFetch: ReturnType<typeof mock<(params: TableQueryParams) => Promise<TableQueryResponse<TestItem>>>>;
  let onChangeParams: ReturnType<typeof mock<(params: TableQueryParams) => void>>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
      },
    });

    mockFetch = mock<(params: TableQueryParams) => Promise<TableQueryResponse<TestItem>>>();
    onChangeParams = mock<(params: TableQueryParams) => void>();

    // Default: return page 1
    mockFetch.mockImplementation((params) => {
      // Determine which page to return based on cursors
      if (params.next_cursor === "21") {
        // Going forward from page 1 to page 2
        return Promise.resolve({
          data: page2Items,
          pagination: {
            prev_cursor: "20", // First item of page 2
            next_cursor: "11", // Last item of page 2
            total: 30,
            has_more: true,
          },
        });
      }
      if (params.next_cursor === "11") {
        // Going forward from page 2 to page 3
        return Promise.resolve({
          data: page3Items,
          pagination: {
            prev_cursor: "10", // First item of page 3
            next_cursor: null, // No more pages
            total: 30,
            has_more: false,
          },
        });
      }
      if (params.prev_cursor === "20") {
        // Going backward from page 2 to page 1
        return Promise.resolve({
          data: page1Items,
          pagination: {
            prev_cursor: null, // First page
            next_cursor: "21", // Last item of page 1
            total: 30,
            has_more: true,
          },
        });
      }
      if (params.prev_cursor === "10") {
        // Going backward from page 3 to page 2
        return Promise.resolve({
          data: page2Items,
          pagination: {
            prev_cursor: "20", // First item of page 2
            next_cursor: "11", // Last item of page 2
            total: 30,
            has_more: true,
          },
        });
      }

      // Default: page 1 (no cursors)
      return Promise.resolve({
        data: page1Items,
        pagination: {
          prev_cursor: null,
          next_cursor: "21", // Last item of page 1
          total: 30,
          has_more: true,
        },
      });
    });
  });

  const customRender = (ui: React.ReactElement) => {
    return render(ui, {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
  };

  test("should load first page initially", async () => {
    customRender(
      <DataTable
        columns={[{ id: "name", header: "Name", cell: (item) => item.name }]}
        resourceName="item"
        cacheKey="test-pagination"
        onFetch={mockFetch}
      />,
    );

    // Wait for data to load
    expect(await screen.findByText("Item 30")).toBeInTheDocument();
    expect(await screen.findByText("Item 21")).toBeInTheDocument();

    // Previous button should be disabled (first page)
    const prevButton = screen.getByRole("button", { name: /previous/i });
    expect(prevButton).toBeDisabled();

    // Next button should be enabled
    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeEnabled();
  });

  test("should navigate to next page when clicking Next", async () => {
    customRender(
      <DataTable
        columns={[{ id: "name", header: "Name", cell: (item) => item.name }]}
        resourceName="item"
        cacheKey="test-pagination-next"
        onFetch={mockFetch}
        onChangeParams={onChangeParams}
      />,
    );

    // Wait for page 1
    expect(await screen.findByText("Item 30")).toBeInTheDocument();

    // Click Next
    const nextButton = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextButton);

    // onChangeParams should be called with next_cursor
    await waitFor(() => {
      expect(onChangeParams).toHaveBeenCalledWith(
        expect.objectContaining({
          next_cursor: "21",
        }),
      );
    });
  });

  test("should navigate back to previous page when clicking Previous", async () => {
    // Start with page 2 params (simulating user already navigated to page 2)
    customRender(
      <DataTable
        columns={[{ id: "name", header: "Name", cell: (item) => item.name }]}
        resourceName="item"
        cacheKey="test-pagination-prev"
        onFetch={mockFetch}
        onChangeParams={onChangeParams}
        queryParams={{ next_cursor: "21" }} // Start on page 2
      />,
    );

    // Wait for page 2 data
    expect(await screen.findByText("Item 20")).toBeInTheDocument();
    expect(await screen.findByText("Item 11")).toBeInTheDocument();

    // Reset mock to track new calls
    onChangeParams.mockClear();

    // Previous button should be enabled now
    const prevButton = screen.getByRole("button", { name: /previous/i });
    expect(prevButton).toBeEnabled();

    // Click Previous
    await userEvent.click(prevButton);

    // onChangeParams should be called with prev_cursor
    await waitFor(() => {
      expect(onChangeParams).toHaveBeenCalledWith(
        expect.objectContaining({
          prev_cursor: "20", // prev_cursor from page 2 response
        }),
      );
    });

    // next_cursor should be cleared
    const lastCall = onChangeParams.mock.calls[onChangeParams.mock.calls.length - 1][0];
    expect(lastCall.next_cursor).toBeUndefined();
  });

  test("should correctly track cursors through forward and backward navigation", async () => {
    const allCalls: TableQueryParams[] = [];

    // Track all param changes
    const trackingOnChangeParams = (params: TableQueryParams) => {
      allCalls.push({ ...params });
    };

    const { rerender } = customRender(
      <DataTable
        columns={[{ id: "name", header: "Name", cell: (item) => item.name }]}
        resourceName="item"
        cacheKey="test-pagination-flow"
        onFetch={mockFetch}
        onChangeParams={trackingOnChangeParams}
      />,
    );

    // Wait for page 1
    expect(await screen.findByText("Item 30")).toBeInTheDocument();

    // === Go to page 2 ===
    const nextButton = screen.getByRole("button", { name: /next/i });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(allCalls.length).toBeGreaterThan(0);
    });

    const goToPage2Call = allCalls.find((c) => c.next_cursor === "21");
    expect(goToPage2Call).toBeDefined();
    expect(goToPage2Call?.prev_cursor).toBeUndefined();

    // Simulate URL update by re-rendering with new queryParams
    // This is what happens in real app when router navigates
    rerender(
      <QueryClientProvider client={queryClient}>
        <DataTable
          columns={[{ id: "name", header: "Name", cell: (item) => item.name }]}
          resourceName="item"
          cacheKey="test-pagination-flow"
          onFetch={mockFetch}
          onChangeParams={trackingOnChangeParams}
          queryParams={{ next_cursor: "21" }}
        />
      </QueryClientProvider>,
    );

    // Wait for page 2 data
    expect(await screen.findByText("Item 20")).toBeInTheDocument();

    // Clear calls to track only the Previous button click
    allCalls.length = 0;

    // === Go back to page 1 ===
    const prevButton = screen.getByRole("button", { name: /previous/i });
    expect(prevButton).toBeEnabled();
    await userEvent.click(prevButton);

    await waitFor(() => {
      expect(allCalls.length).toBeGreaterThan(0);
    });

    // Find the call with prev_cursor
    const goToPage1Call = allCalls.find((c) => c.prev_cursor !== undefined);
    expect(goToPage1Call).toBeDefined();
    expect(goToPage1Call?.prev_cursor).toBe("20"); // First item of page 2
    expect(goToPage1Call?.next_cursor).toBeUndefined(); // Should be cleared
  });
});
