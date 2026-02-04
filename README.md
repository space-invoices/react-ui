# @spaceinvoices/react-ui - Space Invoices Component Library

> **Pre-built components for the Space Invoices API with shadcn/ui compatibility**

A component library designed for the Space Invoices platform. Components integrate with the Space Invoices API/SDK and are meant to be copied into your project for full customization freedom.

## Philosophy

Space Invoices UI components are **designed to be copied**, not installed as a package. This gives you:

- ✅ **Full ownership** - Modify freely without breaking changes
- ✅ **Complete customization** - Change behavior and structure
- ✅ **No version conflicts** - You control when to update
- ✅ **Zero lock-in** - Components work standalone in your codebase
- ✅ **Space Invoices-powered** - Pre-built integration with Space Invoices SDK

**Important**: Space Invoices UI components are built on top of **shadcn/ui primitives**. We recommend users bring their own shadcn/ui components or use an alternative design system. The `components/ui/` folder is included only as reference and can be replaced with your own implementation.

## Quick Start

### 1. Install Dependencies

```bash
# Space Invoices core
npm install @spaceinvoices/js-sdk @tanstack/react-query

# Forms (if using form components)
npm install react-hook-form @hookform/resolvers zod

# Your UI library (choose one):
# - Use shadcn/ui: npx shadcn@latest init
# - Or your own Radix UI components
# - Or any other React component library
```

### 2. Setup Providers

```tsx
// app.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SDKProvider } from "./providers/sdk-provider";
import { EntitiesProvider } from "./providers/entities-provider";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SDKProvider
        apiUrl="https://eu.spaceinvoices.com"
        getAccessToken={() => localStorage.getItem("si_token")}
      >
        <EntitiesProvider>
          {/* Your app */}
        </EntitiesProvider>
      </SDKProvider>
    </QueryClientProvider>
  );
}
```

### 3. Copy Space Invoices Components

```bash
# Copy core dependencies (required)
cp -r packages/ui/src/lib/ your-project/lib/
cp -r packages/ui/src/providers/ your-project/providers/
cp -r packages/ui/src/schemas/ your-project/schemas/

# Copy Space Invoices components you need
cp -r packages/ui/src/components/customers/ your-project/components/leka/
cp -r packages/ui/src/components/invoices/ your-project/components/leka/
cp -r packages/ui/src/components/table/ your-project/components/leka/

# Note: DON'T copy components/ui/ - use your own or shadcn/ui instead
```

### 4. Update Import Paths

```bash
# Replace @/ui/ with your path alias
find your-project/components/leka -type f -exec sed -i '' 's/@\/ui\//@\//g' {} +
find your-project/providers -type f -exec sed -i '' 's/@\/ui\//@\//g' {} +
find your-project/schemas -type f -exec sed -i '' 's/@\/ui\//@\//g' {} +
```

### 5. Configure Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Component Structure

### Space Invoices Components (Copy These)

**Pre-built Space Invoices API integration with forms, tables, and business logic:**

```
components/
├── customers/              # Customer management
│   ├── create-customer-form/
│   ├── customer-list-table/
│   ├── customer-combobox.tsx
│   └── customers.hooks.ts
├── invoices/               # Invoice management
│   ├── create/
│   └── invoice-list-table/
├── items/                  # Item/product management
│   ├── create-item-form/
│   └── item-list-table/
├── entities/               # Entity management
│   └── create-entity-form.tsx
└── table/                  # Generic data table
    └── data-table.tsx
```

**Dependencies**: Require `@spaceinvoices/js-sdk`, TanStack Query, React Hook Form, Zod

### UI Primitives (Use Your Own)

**The `components/ui/` folder contains shadcn/ui components for reference only.**

**Recommended approaches:**

1. **Use shadcn/ui** (recommended):
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button input form table dialog
   ```

2. **Use your existing component library**: Space Invoices components can work with any UI library - just update the imports in copied Space Invoices components to point to your components.

3. **Copy our reference**: If you prefer, you can copy our `components/ui/` as a starting point, but you own and maintain these separately.

### Shared Utilities (Copy These)

```
lib/
├── utils.ts               # cn() utility (or use from shadcn)
└── translation.ts         # i18n helper (Space Invoices-specific)

providers/
├── sdk-provider.tsx       # Space Invoices SDK context (required)
└── entities-provider.tsx  # Active entity context (required)

schemas/
├── customer.ts            # Customer validation
├── entity.ts              # Entity validation
├── invoice.ts             # Invoice validation
└── item.ts                # Item validation
```

## Usage Examples

### Customer Management

```tsx
import CreateCustomerForm from "@/components/leka/customers/create-customer-form/create-customer-form";
import { CustomerListTable } from "@/components/leka/customers/customer-list-table/customer-list-table";
import { useEntities } from "@/providers/entities-provider";
import { Button } from "@/components/ui/button"; // Your own UI component

export function CustomersPage() {
  const { activeEntity } = useEntities();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>

      <CustomerListTable
        entityId={activeEntity.id}
        onRowClick={(customer) => {
          console.log("View customer:", customer);
        }}
      />
    </div>
  );
}
```

### Custom Resource Table

```tsx
import { DataTable } from "@/components/leka/table/data-table";
import { useSDK } from "@/providers/sdk-provider";
import { Button } from "@/components/ui/button"; // Your own

export function MyResourceList() {
  const { sdk } = useSDK();
  const { activeEntity } = useEntities();

  return (
    <DataTable
      columns={[
        { id: "name", header: "Name", sortable: true },
        {
          id: "actions",
          header: "",
          cell: (item) => <Button size="sm">View</Button>,
        },
      ]}
      cacheKey="my-resources"
      onFetch={async (params) => {
        return sdk.myResource.list({
          entityId: activeEntity.id,
          ...params,
        });
      }}
      resourceName="resource"
      entityId={activeEntity.id}
    />
  );
}
```

## Customization

### Styling

Space Invoices components use TailwindCSS utility classes. Since you own the code:

```tsx
// In your copied create-customer-form.tsx
<FormItem className="bg-gray-50 p-4 rounded">  {/* Add your styles */}
  <FormLabel className="text-purple-600">Name</FormLabel>
  <FormControl>
    <Input {...field} />
  </FormControl>
</FormItem>
```

### Adding Fields

Add custom fields to forms by editing the copied component:

```tsx
// In your copied customer form schema
export const createCustomerSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),  // Your new field
  // ... existing fields
});

// In your copied form component
<FormField
  control={form.control}
  name="website"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Website</FormLabel>
      <FormControl>
        <Input {...field} type="url" />
      </FormControl>
    </FormItem>
  )}
/>
```

### Translations

Add or modify translations in component locale files:

```typescript
// components/leka/customers/create-customer-form/locales/fr.ts
export default {
  "customer.Name": "Nom",
  "customer.Website": "Site web",
  // ...
};
```

## Architecture

### SDK Integration

Space Invoices components use TanStack Query hooks wrapping the SDK:

```typescript
// customers.hooks.ts
export function useCreateCustomer(options) {
  const { sdk } = useSDK();

  return useMutation({
    mutationFn: (data) => sdk.customers.createCustomer({ data }),
    ...options,
  });
}
```

### Type Safety

All types come from `@spaceinvoices/js-sdk`:

```typescript
import type { Customer, CreateCustomerRequest } from "@spaceinvoices/js-sdk";

function MyComponent(props: { customer: Customer }) {
  // Fully typed
}
```

### Form Validation

Zod schemas match Space Invoices API exactly:

```typescript
// schemas/customer.ts
export const createCustomerSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  // Matches Space Invoices API CreateCustomerRequest
});
```

## UI Component Conventions

### Separation of Concerns

**DO**: Keep Space Invoices business logic separate from UI primitives

```
src/
├── components/
│   ├── ui/                    # Your shadcn/ui or equivalent
│   │   ├── button.tsx
│   │   └── input.tsx
│   └── leka/                  # Space Invoices-specific components
│       ├── customers/
│       └── invoices/
```

**DON'T**: Mix Space Invoices logic into ui/ primitives

### Import Patterns

Space Invoices components should import from `ui/`:

```tsx
// In components/leka/customers/create-customer-form.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField } from "@/components/ui/form";
import { useSDK } from "@/providers/sdk-provider";  // Space Invoices-specific
```

### Component Naming

- **UI Primitives**: `Button`, `Input`, `Table` (PascalCase, noun)
- **Space Invoices Components**: `CreateCustomerForm`, `CustomerListTable` (PascalCase, descriptive)
- **Hooks**: `useCustomers`, `useCreateCustomer` (camelCase, verb)
- **Schemas**: `createCustomerSchema`, `patchCustomerSchema` (camelCase)

## Dependencies

### Minimal (Space Invoices Components Only)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "@spaceinvoices/js-sdk": "latest",
    "@tanstack/react-query": "^5.72.1",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^5.1.0",
    "zod": "^4.1.12"
  }
}
```

### With shadcn/ui (Recommended)

```json
{
  "dependencies": {
    // ... above, plus:
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.2.0",
    "tailwindcss": "^4.1.3",
    "lucide-react": "^0.475.0"
  }
}
```

## Documentation

- **[CONVENTIONS.md](./CONVENTIONS.md)** - Component patterns and architecture
- **[registry.json](./registry.json)** - Complete component registry with dependencies
- **API Documentation** - https://eu.spaceinvoices.com/docs
- **shadcn/ui** - https://ui.shadcn.com

## FAQ

**Q: Should I copy the `components/ui/` folder?**
A: No. Use shadcn/ui (`npx shadcn@latest init`) or your own component library. The ui/ folder is reference only.

**Q: What's the difference between Space Invoices components and shadcn/ui?**
A: shadcn/ui provides generic UI primitives (button, input, etc.). Space Invoices components provide business logic and API integration (customer forms, invoice tables, etc.) built ON TOP of those primitives.

**Q: Can I use a different UI library instead of shadcn/ui?**
A: Yes! Update the imports in Space Invoices components to point to your UI library (Material UI, Chakra, Mantine, etc.).

**Q: Why copy-paste instead of npm install?**
A: Full ownership and customization. Modify components freely without worrying about breaking changes or version conflicts.

**Q: Do I need the Space Invoices API?**
A: Yes. Space Invoices components are specifically designed for Space Invoices's backend and won't work with other APIs.

**Q: How do I update Space Invoices components?**
A: Review changes in this repo, then manually merge updates into your customized versions. You control when and what to update.

**Q: What about TypeScript?**
A: All components are fully typed using `@spaceinvoices/js-sdk` types.

**Q: Which React frameworks are supported?**
A: All of them! Next.js, Remix, Vite, CRA - works with any React setup.

## Getting Help

- **Space Invoices API Docs**: https://eu.spaceinvoices.com/docs
- **SDK Documentation**: See `@spaceinvoices/js-sdk` package
- **shadcn/ui Docs**: https://ui.shadcn.com
- **Space Invoices Support**: Contact your account team

## License

MIT License - see [LICENSE](./LICENSE) for details.
