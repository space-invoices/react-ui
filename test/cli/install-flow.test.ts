import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { add } from "../../cli/src/commands/add";
import { init } from "../../cli/src/commands/init";
import { DEFAULT_CONFIG, writeConfig, type Config } from "../../cli/src/utils/config";
import { setLocalBasePath } from "../../cli/src/utils/registry";

const repoRoot = path.resolve(import.meta.dir, "../..");

function makeProjectDir(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writePackageJson(projectDir: string, dependencies: Record<string, string> = {}): void {
  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "react-ui-cli-test-app",
        version: "1.0.0",
        private: true,
        dependencies,
      },
      null,
      2
    )
  );
}

describe("CLI install flow", () => {
  beforeEach(() => {
    setLocalBasePath(repoRoot);
  });

  afterEach(() => {
    setLocalBasePath(null);
  });

  test("init creates the generated directory using root-based aliases when src is absent", async () => {
    const projectDir = makeProjectDir("spaceinvoices-init");
    writePackageJson(projectDir, {
      "@spaceinvoices/js-sdk": "*",
      "@tanstack/react-query": "*",
    });

    await init({ cwd: projectDir, yes: true, force: true });

    const config = JSON.parse(
      fs.readFileSync(path.join(projectDir, "spaceinvoices.json"), "utf-8")
    ) as Config;

    expect(config.aliases.generated).toBe(DEFAULT_CONFIG.aliases.generated);
    expect(fs.existsSync(path.join(projectDir, "generated"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "providers", "sdk-provider.tsx"))).toBe(true);
  });

  test("add installs generated schema files and respects custom root aliases", async () => {
    const projectDir = makeProjectDir("spaceinvoices-add");
    writePackageJson(projectDir);

    writeConfig(
      {
        aliases: {
          components: "@/app/space-invoices",
          ui: "@/app/ui",
          lib: "@/app/lib",
          hooks: "@/app/hooks",
          providers: "@/app/providers",
          generated: "@/app/generated",
        },
      },
      projectDir
    );

    await add(["payments/create-payment-form"], {
      cwd: projectDir,
      yes: true,
      overwrite: true,
    });

    const componentPath = path.join(
      projectDir,
      "app",
      "space-invoices",
      "payments",
      "create-payment-form",
      "create-payment-form.tsx"
    );
    const generatedSchemaPath = path.join(projectDir, "app", "generated", "schemas", "payment.ts");

    expect(fs.existsSync(componentPath)).toBe(true);
    expect(fs.existsSync(generatedSchemaPath)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "app"))).toBe(false);

    const componentSource = fs.readFileSync(componentPath, "utf-8");
    expect(componentSource).toContain('@/app/generated/schemas/payment');
    expect(componentSource).not.toContain('@/ui/generated/schemas/payment');
  });

  test("add copies the generated schema index and sibling files for root schema imports", async () => {
    const projectDir = makeProjectDir("spaceinvoices-add-index");
    writePackageJson(projectDir);
    writeConfig(DEFAULT_CONFIG, projectDir);

    await add(["entities/create-entity-form"], {
      cwd: projectDir,
      yes: true,
      overwrite: true,
    });

    expect(fs.existsSync(path.join(projectDir, "generated", "schemas", "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "generated", "schemas", "entity.ts"))).toBe(true);
  });
});
