# UI Library Conventions

This document formalizes the patterns and conventions used in the `@space-invoices/ui` package.

## Overview

The `@space-invoices/ui` package follows a **shadcn-style copy-paste pattern**:

- **Selectively copied** - Add only the components you need
- **Self-contained** - Each component folder has dependencies clearly defined
- **Customizable** - You own the code after copying

### Component Registry

The `registry.json` file defines all components and their dependencies, enabling:

- **Future CLI**: `npx leka-ui add create-invoice-form`
- **Dependency resolution**: Automatically identifies required utils, hooks, providers
- **Documentation**: Clear visibility of what each component needs

### Component Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `ui` | Low-level primitives | Button, Input, Form, Dialog |
| `form` | Form utilities | FormInput |
| `table` | Data table infrastructure | DataTable, SearchInput |
| `feature` | Business logic components | CreateInvoiceForm, CustomerListTable |

## Component Organization

### Directory Structure

```
src/components/
├── {feature}/                    # Feature-specific components (customers, invoices, etc.)
│   ├── {component-name}/         # Component folder
│   │   ├── {component-name}.tsx  # Main component
│   │   ├── locales/              # Translation files
│   │   │   ├── de.ts             # German translations
│   │   │   └── sl.ts             # Slovenian translations
│   │   └── index.ts              # Barrel export (optional)
│   ├── {feature}.hooks.ts        # Feature-specific hooks
│   └── {feature}.hooks.test.ts   # Hook tests
├── table/                        # Generic table components
├── form/                         # Form utilities
└── ui/                           # shadcn/ui primitives (reference only)
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component files | kebab-case | `create-customer-form.tsx` |
| Component names | PascalCase | `CreateCustomerForm` |
| Hook files | kebab-case with prefix | `use-customer-search.ts` |
| Hook names | camelCase with prefix | `useCustomerSearch` |
| Locale files | lowercase language code | `de.ts`, `sl.ts` |
| Test files | kebab-case with suffix | `create-customer-form.test.tsx` |

## Component Patterns

### Form Components

Form components follow a consistent pattern:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/ui/components/ui/form";
import { createTranslation } from "@/ui/lib/translation";
import type { ComponentTranslationProps } from "@/ui/lib/translation";

// 1. Import generated schema
import { createResourceSchema } from "@/ui/generated/schemas";

// 2. Import translations
import de from "./locales/de";
import sl from "./locales/sl";

const translations = { sl, de } as const;

// 3. Define props type
type CreateResourceFormProps = {
  entityId: string;
  onSuccess?: (resource: Resource) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

// 4. Component implementation
export default function CreateResourceForm({
  entityId,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: CreateResourceFormProps) {
  const t = createTranslation({ ...i18nProps, translations });

  const form = useForm({
    resolver: zodResolver(createResourceSchema),
    defaultValues: { /* ... */ },
  });

  const { mutate, isPending } = useCreateResource({
    entityId,
    onSuccess,
    onError: (error) => {
      form.setError("root", { message: t("Error message") });
      onError?.(error);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(mutate)}>
        {/* Form fields */}
        {renderSubmitButton?.({ isSubmitting: isPending, submit: form.handleSubmit(mutate) })}
      </form>
    </Form>
  );
}
```

### List Table Components

List tables use the `DataTable` abstraction:

```tsx
import { DataTable } from "@/ui/components/table/data-table";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { useSDK } from "@/ui/providers/sdk-provider";
import { createTranslation } from "@/ui/lib/translation";

export default function ResourceListTable({ entityId, onRowClick, ...i18nProps }) {
  const t = createTranslation({ translations, ...i18nProps });
  const { sdk } = useSDK();

  const handleFetch = useTableFetch((params) => {
    if (!sdk) throw new Error("SDK not initialized");
    return sdk.resources.getResources(params);
  }, entityId);

  return (
    <DataTable
      columns={[
        { id: "name", header: t("Name"), sortable: true },
        { id: "actions", header: "", align: "right" },
      ]}
      renderRow={(item) => <ResourceListRow item={item} onRowClick={onRowClick} t={t} />}
      renderHeader={(props) => <ResourceListHeader {...props} t={t} />}
      onFetch={handleFetch}
      entityId={entityId}
    />
  );
}
```

## Hook Patterns

### Resource Hooks Factory

Use the `createResourceHooks` factory for CRUD operations:

```tsx
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import type { Resource, CreateResourceRequest } from "@spaceinvoices/js-sdk";

export const RESOURCES_CACHE_KEY = "resources";

const {
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} = createResourceHooks<Resource, CreateResourceRequest>("resources", RESOURCES_CACHE_KEY);

export { useCreateResource, useUpdateResource, useDeleteResource };
```

### Query Hooks

For read operations, use TanStack Query directly:

```tsx
import { useQuery } from "@tanstack/react-query";
import { useSDK } from "@/ui/providers/sdk-provider";

export function useResourceById(id: string, entityId: string) {
  const { sdk } = useSDK();

  return useQuery({
    queryKey: ["resources", id, entityId],
    queryFn: () => sdk.resources.get(id, { entity_id: entityId }),
    enabled: !!id && !!entityId,
  });
}
```

## Translation System

### Component-Level Translations

Each component that displays text should have locale files:

```typescript
// locales/sl.ts
export default {
  "Name": "Naziv",
  "Enter name": "Vnesite naziv",
  "Description": "Opis",
} as const;
```

### Using Translations

```tsx
import { createTranslation, type ComponentTranslationProps } from "@/ui/lib/translation";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = { sl, de } as const;

function Component({ t: translateProp, namespace, locale }: ComponentTranslationProps) {
  const t = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });

  return <label>{t("Name")}</label>;
}
```

## Import Paths

All imports use the `@/ui/` alias for copy-paste compatibility:

```tsx
// ✅ Correct
import { Button } from "@/ui/components/ui/button";
import { useSDK } from "@/ui/providers/sdk-provider";
import { createTranslation } from "@/ui/lib/translation";

// ❌ Incorrect - relative paths
import { Button } from "../../ui/button";
```

When copying to your project, find-and-replace `@/ui/` with your alias (e.g., `@/`).

## Testing Patterns

### Test File Location

Tests are located in the `test/` directory, mirroring the `src/components/` structure:

```
test/
├── components/
│   ├── customers/
│   │   ├── create-customer-form/
│   │   │   └── create-customer-form.test.tsx
│   │   └── customer-list-table/
│   │       └── customer-list-table.test.tsx
│   └── invoices/
│       └── ...
├── providers/
│   └── sdk-provider.test.tsx
└── test-utils.tsx
```

### Test Pattern

```tsx
import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock providers
const mockSDK = { useSDK: () => ({ sdk: { /* mocked methods */ } }) };
mock.module("@/ui/providers/sdk-provider", () => mockSDK);
mock.module("@/ui/providers/entities-provider", () => mockEntitiesProvider);

// Create wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Component", () => {
  test("renders correctly", () => {
    render(<Component />, { wrapper: createWrapper() });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("handles user interaction", async () => {
    const onSuccess = mock();
    render(<Component onSuccess={onSuccess} />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### What to Test

| Component Type | Test Focus |
|----------------|------------|
| Form | Renders fields, validation, submission, error handling, translations |
| List Table | Fetches data, displays rows, handles row clicks, translations |
| Hooks | Mutation calls, cache invalidation, error handling |

## Provider Requirements

Components require two providers to function:

```tsx
import { SDKProvider } from "@/ui/providers/sdk-provider";
import { EntitiesProvider } from "@/ui/providers/entities-provider";

<SDKProvider apiUrl="..." getAccessToken={() => token}>
  <EntitiesProvider>
    {/* Space Invoices components work here */}
  </EntitiesProvider>
</SDKProvider>
```

## Schema Usage

### Generated Schemas

Schemas are auto-generated from the API spec:

```tsx
// ✅ Use generated schemas
import { createCustomerSchema } from "@/ui/generated/schemas";

// ❌ Don't manually define schemas
const schema = z.object({ name: z.string() });
```

### Extending Schemas

When the generated schema doesn't match form needs:

```tsx
import { createResourceSchema } from "@/ui/generated/schemas";

const formSchema = createResourceSchema
  .omit({ computed_field: true })
  .extend({ custom_field: z.string().optional() });
```

## Accessibility

- Use semantic HTML elements
- Include ARIA labels on interactive elements
- Support keyboard navigation
- Use `role` attributes appropriately

```tsx
<button aria-label={t("Delete item")} onClick={onDelete}>
  <TrashIcon />
</button>
```

## Styling

Use the `cn()` utility for class name composition:

```tsx
import { cn } from "@/ui/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />
```
