import { describe, expect, test } from "bun:test";

import { getRegistryManagedDependencies } from "../../cli/src/utils/file-dependencies";

describe("CLI file dependency expansion", () => {
  test("expands bare generated schema imports to the generated schema index", () => {
    const dependencies = getRegistryManagedDependencies(
      "components/invoices/create/create-invoice-form.tsx",
      'import { createInvoiceSchema } from "@/ui/generated/schemas";'
    );

    expect(dependencies).toEqual(["generated/schemas/index.ts"]);
  });

  test("expands generated schema index exports to concrete schema files", () => {
    const dependencies = getRegistryManagedDependencies(
      "generated/schemas/index.ts",
      "export * from './invoice';\nexport * from './payment';\n"
    );

    expect(dependencies).toEqual(["generated/schemas/invoice.ts", "generated/schemas/payment.ts"]);
  });
});
