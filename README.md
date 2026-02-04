# @spaceinvoices/react-ui - Space Invoices Component Library

> **Pre-built React components for the Space Invoices API**

70+ components for building invoicing applications with the Space Invoices API. Includes forms, tables, dashboard charts, and more - all designed to be copied into your project for full customization.

## Philosophy

These components are **designed to be copied**, not installed as a package:

- **Full ownership** - Modify freely without breaking changes
- **Complete customization** - Change behavior and structure
- **No version conflicts** - You control when to update
- **Zero lock-in** - Components work standalone in your codebase

**Note**: Components are built on **shadcn/ui primitives**. Bring your own shadcn/ui components or use any alternative. The `components/ui/` folder is included as reference only.

## Quick Start

### 1. Install Dependencies

```bash
# Core requirements
npm install @spaceinvoices/js-sdk @tanstack/react-query

# For forms
npm install react-hook-form @hookform/resolvers zod

# UI components (choose one):
# Option A: Use shadcn/ui (recommended)
npx shadcn@latest init

# Option B: Use your existing component library
```

### 2. Clone This Repository

```bash
git clone https://github.com/space-invoices/react-ui.git
```

### 3. Copy What You Need

```bash
# Required: Core utilities and providers
cp -r react-ui/src/lib/ your-project/src/lib/
cp -r react-ui/src/providers/ your-project/src/providers/
cp -r react-ui/src/hooks/ your-project/src/hooks/

# Copy the components you need
cp -r react-ui/src/components/invoices/ your-project/src/components/space-invoices/
cp -r react-ui/src/components/customers/ your-project/src/components/space-invoices/
cp -r react-ui/src/components/table/ your-project/src/components/space-invoices/
# ... add more as needed

# DON'T copy components/ui/ - use shadcn/ui instead
```

### 4. Update Import Paths

```bash
# Replace @/ui/ imports with your path alias
find your-project/src/components/space-invoices -type f -name "*.tsx" \
  -exec sed -i '' 's/@\/ui\//@\//g' {} +
```

### 5. Setup Providers

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

## What's Included

### Business Components (Copy These)

```
src/components/
├── invoices/           # Create, list, view invoices
├── customers/          # Customer management
├── items/              # Products/services catalog
├── payments/           # Payment tracking
├── taxes/              # Tax rate management
├── estimates/          # Quotes and estimates
├── credit-notes/       # Credit note handling
├── advance-invoices/   # Advance invoice handling
├── dashboard/          # Analytics charts
├── entities/           # Company/organization settings
├── documents/          # Shared document components
└── table/              # Generic data table infrastructure
```

### UI Primitives (Reference Only)

The `components/ui/` folder contains shadcn/ui-style components. **Don't copy these** - use shadcn/ui directly:

```bash
npx shadcn@latest add button input form table dialog select
```

Or use your own component library and update imports in the copied components.

### Required Utilities

```
src/
├── providers/
│   ├── sdk-provider.tsx       # SDK context (required)
│   └── entities-provider.tsx  # Active entity context (required)
├── hooks/
│   └── *.ts                   # Shared hooks
└── lib/
    ├── utils.ts               # cn() utility
    └── translation.ts         # i18n helper
```

## Usage Examples

### Customer List

```tsx
import { CustomerListTable } from "@/components/space-invoices/customers/customer-list-table";
import { useEntities } from "@/providers/entities-provider";

export function CustomersPage() {
  const { activeEntity } = useEntities();

  return (
    <CustomerListTable
      entityId={activeEntity.id}
      onRowClick={(customer) => console.log("Selected:", customer)}
    />
  );
}
```

### Create Invoice Form

```tsx
import { CreateInvoiceForm } from "@/components/space-invoices/invoices/create";
import { useEntities } from "@/providers/entities-provider";

export function NewInvoicePage() {
  const { activeEntity } = useEntities();

  return (
    <CreateInvoiceForm
      entityId={activeEntity.id}
      onSuccess={(invoice) => {
        console.log("Created invoice:", invoice.number);
      }}
    />
  );
}
```

### Dashboard Charts

```tsx
import { RevenueTrendChart } from "@/components/space-invoices/dashboard/revenue-trend-chart";
import { InvoiceStatusChart } from "@/components/space-invoices/dashboard/invoice-status-chart";

export function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <RevenueTrendChart entityId={activeEntity.id} />
      <InvoiceStatusChart entityId={activeEntity.id} />
    </div>
  );
}
```

## Customization

Since you own the code, customize freely:

### Modify Styles

```tsx
// In your copied component
<FormItem className="bg-gray-50 p-4 rounded-lg">
  <FormLabel className="text-blue-600 font-semibold">Customer Name</FormLabel>
  ...
</FormItem>
```

### Add Fields

```tsx
// Extend the schema
const createCustomerSchema = z.object({
  name: z.string().min(1),
  customField: z.string().optional(), // Your addition
});

// Add to the form
<FormField name="customField" ... />
```

### Add Translations

```typescript
// components/space-invoices/customers/locales/fr.ts
export default {
  "customer.name": "Nom du client",
  "customer.email": "Adresse e-mail",
};
```

## Architecture

### SDK Integration

Components use TanStack Query hooks wrapping the SDK:

```typescript
// customers.hooks.ts
export function useCreateCustomer() {
  const { sdk } = useSDK();
  return useMutation({
    mutationFn: (data) => sdk.customers.createCustomer({ data }),
  });
}
```

### Type Safety

All types come from `@spaceinvoices/js-sdk`:

```typescript
import type { Customer, Invoice } from "@spaceinvoices/js-sdk";
```

## Dependencies

```json
{
  "dependencies": {
    "@spaceinvoices/js-sdk": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react": "^19.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^5.0.0",
    "zod": "^3.0.0"
  }
}
```

## Documentation

- **[CONVENTIONS.md](./CONVENTIONS.md)** - Component patterns and architecture
- **[registry.json](./registry.json)** - Component registry with dependencies
- **[Space Invoices API Docs](https://docs.spaceinvoices.com)**
- **[shadcn/ui](https://ui.shadcn.com)**

## FAQ

**Q: Why copy-paste instead of npm install?**
A: Full ownership. Modify components freely without version conflicts or breaking changes.

**Q: Can I use Material UI / Chakra / other libraries?**
A: Yes. Update the imports in copied components to use your UI library instead of shadcn/ui.

**Q: Do I need the Space Invoices API?**
A: Yes. These components are built specifically for Space Invoices and won't work with other APIs.

**Q: How do I get updates?**
A: Check this repo for changes and manually merge what you need into your customized versions.

## License

MIT License - see [LICENSE](./LICENSE)
