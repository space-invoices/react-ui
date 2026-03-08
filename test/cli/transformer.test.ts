import path from "node:path";
import { describe, expect, test } from "bun:test";

import type { Config } from "../../cli/src/utils/config";
import { getFullDestinationPath, transformImports } from "../../cli/src/utils/transformer";

const config: Config = {
  aliases: {
    components: "@/components/space-invoices",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
    providers: "@/providers",
    generated: "@/generated",
  },
};

describe("CLI transformer", () => {
  test("rewrites generated imports to the configured alias", () => {
    const source = 'import { createInvoiceSchema } from "@/ui/generated/schemas";';
    const transformed = transformImports(source, config);

    expect(transformed).toContain('from "@/generated/schemas";');
    expect(transformed).not.toContain("@/ui/generated/schemas");
  });

  test("does not force files under src when the project is root-based", () => {
    const destination = getFullDestinationPath(
      "components/payments/create-payment-form/create-payment-form.tsx",
      {
        ...config,
        aliases: {
          ...config.aliases,
          components: "@/app/space-invoices",
        },
      },
      "/tmp/root-based-project"
    );

    expect(destination).toBe(
      path.join(
        "/tmp/root-based-project",
        "app",
        "space-invoices",
        "payments",
        "create-payment-form",
        "create-payment-form.tsx"
      )
    );
  });
});
