# Table Component Library

A comprehensive, type-safe table system with built-in sorting, search, pagination, and loading states.

## Features

- **Type-safe**: Full TypeScript support with generics
- **Flexible**: Use default rendering or custom row/header components
- **State Management**: Built-in state with optional external control
- **TanStack Query**: Seamless integration with query caching
- **Accessible**: ARIA labels and keyboard navigation
- **Responsive**: Mobile-friendly with proper breakpoints
- **Loading States**: Skeleton loaders and empty states
- **Cursor Pagination**: Efficient server-side pagination

## Quick Start

### Basic Usage (Simplified API)

The new API allows you to define columns with built-in cell renderers:

```tsx
import { DataTable, FormattedDate } from "@space-invoices/ui";
import type { Invoice } from "@spaceinvoices/js-sdk";

function InvoiceTable() {
  const { sdk } = useSDK();

  return (
    <DataTable<Invoice>
      columns={[
        {
          id: "number",
          header: "Invoice #",
          sortable: true,
          cell: (invoice) => (
            <a href={`/invoices/${invoice.id}`} className="underline">
              {invoice.number}
            </a>
          ),
        },
        {
          id: "customer",
          header: "Customer",
          cell: (invoice) => invoice.customer?.name ?? "-",
        },
        {
          id: "date",
          header: "Date",
          sortable: true,
          cell: (invoice) => <FormattedDate date={invoice.date} />,
        },
        {
          id: "total",
          header: "Total",
          align: "right",
          sortable: true,
          cell: (invoice) => `$${invoice.total}`,
        },
      ]}
      cacheKey="invoices"
      resourceName="invoice"
      onFetch={(params) => sdk.invoices.getInvoices(params)}
    />
  );
}
```

### Advanced Usage (Custom Rendering)

For more control, use custom row and header renderers:

```tsx
import { DataTable } from "@space-invoices/ui";
import InvoiceListHeader from "./invoice-list-header";
import InvoiceListRow from "./invoice-list-row";

function InvoiceTable() {
  const { sdk } = useSDK();

  return (
    <DataTable<Invoice>
      columns={[
        { field: "number", header: "Number", sortable: true },
        { field: "customer", header: "Customer" },
        { field: "date", header: "Date", sortable: true },
        { field: "total", header: "Total", sortable: true, align: "right" },
      ]}
      renderHeader={(props) => (
        <InvoiceListHeader
          orderBy={props.orderBy}
          onSort={props.onSort}
        />
      )}
      renderRow={(invoice) => (
        <InvoiceListRow
          key={invoice.id}
          invoice={invoice}
          onRowClick={(item) => navigate(`/invoices/${item.id}`)}
        />
      )}
      cacheKey="invoices"
      resourceName="invoice"
      onFetch={(params) => sdk.invoices.getInvoices(params)}
    />
  );
}
```

## API Reference

### DataTable Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `Column<T>[]` | Yes | Column definitions |
| `cacheKey` | `string` | Yes | Unique key for react-query cache |
| `onFetch` | `(params) => Promise<Response>` | Yes | Data fetch function |
| `resourceName` | `string` | Yes | Resource name for empty states |
| `defaultOrderBy` | `string` | No | Default sort order (e.g., "-id") |
| `queryParams` | `TableQueryParams` | No | External query parameters |
| `onChangeParams` | `(params) => void` | No | Callback for param changes |
| `entityId` | `string` | No | Entity ID for multi-tenant filtering |
| `createNewLink` | `string` | No | Link for "Create New" button |
| `createNewTrigger` | `ReactNode` | No | Custom create action |
| `onRowClick` | `(item: T) => void` | No | Row click handler |
| `renderRow` | `(item: T) => ReactNode` | No | Custom row renderer |
| `renderHeader` | `(props) => ReactNode` | No | Custom header renderer |

### Column Definition

```typescript
type Column<T> = {
  id: string;                    // Unique column identifier
  header: ReactNode;             // Header label or component
  sortField?: string;            // Field name for sorting (if different from id)
  sortable?: boolean;            // Enable sorting
  align?: "left" | "center" | "right"; // Text alignment
  cell?: (item: T) => ReactNode; // Cell renderer function
  className?: string;            // Optional CSS classes
};
```

## Hooks

### useTableState

Manages table state internally with optional URL sync:

```tsx
import { useTableState } from "@space-invoices/ui";

const { params, handleSort, handleSearch, handlePageChange } = useTableState({
  initialParams: { order_by: "-created_at" },
  defaultOrderBy: "-id",
  onChangeParams: (params) => {
    // Optional: sync with router or external state
    navigate({ search: params });
  },
});
```

### useTableQuery

TanStack Query wrapper for table data:

```tsx
import { useTableQuery } from "@space-invoices/ui";

const { data, isFetching } = useTableQuery({
  cacheKey: "customers",
  fetchFn: (params) => sdk.customers.getCustomers(params),
  params: { order_by: "-id", search: "acme" },
  entityId: "entity-123",
});
```

### useTableFetch

Wraps fetch function to include entity ID:

```tsx
import { useTableFetch } from "@space-invoices/ui";

const handleFetch = useTableFetch(
  (params) => sdk.customers.getCustomers(params),
  entityId
);
```

## Components

### SearchInput

Search input with optional debouncing:

```tsx
<SearchInput
  initialValue=""
  onSearch={(value) => console.log(value)}
  placeholder="Search customers..."
  debounceMs={300} // Optional debouncing
/>
```

### SortableHeader

Sortable column header with visual indicators:

```tsx
<SortableHeader
  field="name"
  currentOrder="-name"
  onSort={(order) => console.log(order)}
  align="left"
>
  Customer Name
</SortableHeader>
```

### Pagination

Cursor-based pagination controls:

```tsx
<Pagination
  cursorBefore="prev-cursor"
  cursorAfter="next-cursor"
  onPageChange={({ before, after }) => console.log(before, after)}
/>
```

### FormattedDate

Date formatting with error handling:

```tsx
<FormattedDate
  date="2024-01-15"
  format={{
    year: "numeric",
    month: "short",
    day: "numeric",
  }}
/>
```

## Usage Patterns

The table component supports two main usage patterns:

### Simple Tables (Column-driven)

For straightforward tables, define columns with cell renderers:

```tsx
<DataTable
  columns={[
    {
      id: "name",
      header: "Name",
      sortable: true,
      cell: (item) => item.name,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => item.email,
    },
  ]}
  cacheKey="users"
  resourceName="user"
  onFetch={(params) => sdk.users.getUsers(params)}
/>
```

### Complex Tables (Custom renderers)

For advanced tables with complex row/header components:

```tsx
<DataTable
  columns={[
    { id: "name", header: "Name", sortable: true },
    { id: "email", header: "Email" },
  ]}
  renderRow={(item) => (
    <CustomRow key={item.id} item={item} />
  )}
  renderHeader={(props) => (
    <CustomHeader {...props} />
  )}
  cacheKey="users"
  resourceName="user"
  onFetch={(params) => sdk.users.getUsers(params)}
/>
```

## Key Improvements

### 1. Simplified State Management

**Before:**
- Manual `useState` for params
- Manual URL sync with `updateQueryParams`
- Complex callback chains

**After:**
- `useTableState` hook handles everything
- Automatic URL sync
- Single source of truth

### 2. Cleaner Hooks

**Before:**
```tsx
const { data, isFetching } = useTableQuery({
  cacheKey,
  fetchFn,
  params,
  entityId,
});

// Unnecessary isMounted ref logic
const isMounted = useRef(true);
```

**After:**
```tsx
// Simplified, no ref needed
const { data, isFetching } = useTableQuery({
  cacheKey,
  fetchFn,
  params,
  entityId,
});
```

### 3. Better Column API

**Before:**
- Column definitions not used for rendering
- Must implement custom row/header components

**After:**
- Column definitions drive rendering
- Optional custom renderers for flexibility
- Built-in cell renderers via `cell` prop

### 4. Improved Type Safety

**Before:**
```typescript
// Loose typing on columns
columns: { field: string; header: React.ReactNode }[]
```

**After:**
```typescript
// Strongly typed with generics
columns: Column<T>[]
// T is your data type (e.g., Invoice, Customer)
```

### 5. Better UX

**Before:**
- Basic search input
- Minimal empty states

**After:**
- Search with clear button
- Rich empty states with icons
- Better error handling in date formatter
- Improved accessibility

## Best Practices

1. **Use column definitions for simple tables**: Less code, easier to maintain
2. **Use custom renderers for complex tables**: More control when needed
3. **Define cache keys as constants**: Reuse across queries and mutations
4. **Handle loading states**: The component handles this automatically
5. **Provide meaningful resource names**: Used in empty states
6. **Use FormattedDate**: Consistent date formatting with error handling
7. **Enable sorting selectively**: Not all columns need sorting
8. **Use proper TypeScript types**: Import from `@spaceinvoices/js-sdk`

## Testing

All table components are fully tested:

```bash
cd packages/ui
bun test test/components/table/
```

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- Semantic HTML structure
- Proper focus management

## Performance

- Efficient re-renders with proper memoization
- React Query caching (5-minute stale time)
- Cursor-based pagination (no offset issues)
- Skeleton loading (no layout shift)
