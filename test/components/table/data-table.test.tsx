import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable } from "@/ui/components/table/data-table";
import { SortableHeader } from "@/ui/components/table/sortable-header";
import { TableCell, TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";

// Mock data and components
type TestItem = {
  id: string;
  name: string;
  description: string;
  created_at: Date;
};

const mockItems: TestItem[] = [
  {
    id: "1",
    name: "Item 1",
    description: "Description 1",
    created_at: new Date("2023-01-01T00:00:00Z"),
  },
  {
    id: "2",
    name: "Item 2",
    description: "Description 2",
    created_at: new Date("2023-01-02T00:00:00Z"),
  },
];

const mockFetch =
  mock<
    (params: any) => Promise<{
      data: TestItem[];
      pagination: {
        prev_cursor: string | null;
        next_cursor: string | null;
        total: number;
        has_more: boolean;
      };
    }>
  >();

const TestHeader = ({ orderBy, onSort }: { orderBy?: string; onSort?: (order: string | null) => void }) => (
  <TableHeader>
    <TableRow>
      <TableHead>
        <SortableHeader field="name" currentOrder={orderBy} onSort={onSort}>
          Name
        </SortableHeader>
      </TableHead>
      <TableHead>
        <SortableHeader field="description" currentOrder={orderBy} onSort={onSort}>
          Description
        </SortableHeader>
      </TableHead>
      <TableHead>
        <SortableHeader field="created_at" currentOrder={orderBy} onSort={onSort}>
          Created At
        </SortableHeader>
      </TableHead>
    </TableRow>
  </TableHeader>
);

const TestRow = ({ item, onRowClick }: { item: TestItem; onRowClick?: (item: TestItem) => void }) => (
  <TableRow>
    <TableCell>
      <button
        type="button"
        onClick={() => onRowClick?.(item)}
        className="m-0 block w-full cursor-pointer border-none bg-transparent p-0 text-left"
      >
        {item.name}
      </button>
    </TableCell>
    <TableCell>{item.description}</TableCell>
    <TableCell>{item.created_at.toLocaleDateString()}</TableCell>
  </TableRow>
);

describe("DataTable", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    mockFetch.mockReset();

    // Setup default mock implementation
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        data: mockItems,
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: mockItems.length,
          has_more: false,
        },
      }),
    );
  });

  const customRender = (ui: React.ReactElement) => {
    return render(ui, {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
  };

  test("renders with data", async () => {
    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
      />,
    );

    expect(await screen.findByText("Item 1")).toBeInTheDocument();
    expect(await screen.findByText("Item 2")).toBeInTheDocument();
    expect(await screen.findByText("Description 1")).toBeInTheDocument();
    expect(await screen.findByText("Description 2")).toBeInTheDocument();
  });

  test("handles sorting", async () => {
    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
      />,
    );

    // Find the Name column header and click it
    const nameHeader = await screen.findByText("Name");
    await userEvent.click(nameHeader);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "name",
        }),
      );
    });
  });

  test("handles row click", async () => {
    const onRowClick = mock<(item: TestItem) => void>();

    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} onRowClick={onRowClick} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
      />,
    );

    // Find the first item name link and click it
    const itemLink = await screen.findByText("Item 1");
    await userEvent.click(itemLink);

    expect(onRowClick).toHaveBeenCalledWith(mockItems[0]);
  });

  test("handles search input", async () => {
    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
      />,
    );

    const searchInput = await screen.findByRole("searchbox");
    await userEvent.type(searchInput, "search term");

    // Submit the search form
    const form = searchInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "search term",
        }),
      );
    });
  });

  test("shows empty state when no data", async () => {
    // Mock empty response
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        data: [],
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: 0,
          has_more: false,
        },
      }),
    );

    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
      />,
    );

    expect(await screen.findByText(/your list is empty/i)).toBeInTheDocument();
  });

  test("handles query params changes", async () => {
    const onChangeParams = mock<(params: any) => void>();

    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
        onChangeParams={onChangeParams}
      />,
    );

    // Find the Name column header and click it
    const nameHeader = await screen.findByText("Name");
    await userEvent.click(nameHeader);

    await waitFor(() => {
      expect(onChangeParams).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: "name",
        }),
      );
    });
  });

  test("handles createNewTrigger prop", async () => {
    const createNewTrigger = <button type="button">Create New Item</button>;

    // Mock empty response to show empty state
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        data: [],
        pagination: {
          prev_cursor: null,
          next_cursor: null,
          total: 0,
          has_more: false,
        },
      }),
    );

    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
        createNewTrigger={createNewTrigger}
      />,
    );

    expect(await screen.findByText("Create New Item")).toBeInTheDocument();
  });

  test("passes entityId to fetch function", async () => {
    customRender(
      <DataTable
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "description", header: "Description", sortable: true },
          { id: "created_at", header: "Created At", sortable: true },
        ]}
        renderRow={(item) => <TestRow key={item.id} item={item} />}
        renderHeader={(props) => <TestHeader {...props} />}
        resourceName="item"
        cacheKey="test-items"
        onFetch={mockFetch}
        entityId="test-entity-id"
      />,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: "test-entity-id",
        }),
      );
    });
  });
});
