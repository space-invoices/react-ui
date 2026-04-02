import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const SCHEMAS_DIR = "./src/generated/schemas";
const GENERATED_DIR = "./generated";

type OperationSchemaEntry = {
  alias: string;
  schemaName: string;
  groupName: string;
};

// Helper to get group name from schema name / alias
const getGroupName = (schemaName: string, alias?: string): string => {
  // Remove _Body and extract the resource name (e.g., Customer from createCustomer)
  if (schemaName.endsWith("_Body")) {
    return schemaName.replace(/(create|patch|update|delete)([A-Z][a-zA-Z]+)_Body/, "$2").toLowerCase();
  }

  if (alias) {
    return alias
      .replace(/^(create|patch|update|delete|register|upload|send|preview|render|accept|add|start|authorize|sync|void)/, "")
      .toLowerCase();
  }

  return schemaName.toLowerCase();
};

function extractOperationSchemaEntries(fullContent: string): OperationSchemaEntry[] {
  const endpointBlockRegex = /  \{[\s\S]*?\n  \},?/g;
  const dedupedEntries = new Map<string, OperationSchemaEntry>();

  for (const block of fullContent.match(endpointBlockRegex) ?? []) {
    const aliasMatch = block.match(/alias:\s*"([^"]+)"/);
    const bodySchemaMatch = block.match(/type:\s*"Body",[\s\S]*?schema:\s*((?:[A-Z][A-Za-z0-9_]*|[a-z][A-Za-z0-9]*_Body))/);

    if (!aliasMatch || !bodySchemaMatch) {
      continue;
    }

    const alias = aliasMatch[1];
    const schemaName = bodySchemaMatch[1];
    dedupedEntries.set(alias, {
      alias,
      schemaName,
      groupName: getGroupName(schemaName, alias),
    });
  }

  return [...dedupedEntries.values()];
}

async function main() {
  // Ensure directories exist
  await fs.mkdir(SCHEMAS_DIR, { recursive: true });
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  // Default to the checked-in API spec so generation is deterministic across worktrees.
  const API_URL = process.env.OPENAPI_TARGET || path.resolve(import.meta.dir, "../../../apps/api/openapi.json");
  const openApiPath = path.resolve(GENERATED_DIR, "openapi.json");

  try {
    if (/^https?:\/\//.test(API_URL)) {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fs.writeFile(openApiPath, await res.text());
      console.log(`Fetched OpenAPI spec from ${API_URL}`);
    } else {
      await fs.copyFile(API_URL, openApiPath);
      console.log(`Copied OpenAPI spec from ${API_URL}`);
    }
  } catch (_error) {
    console.error(`Failed to fetch OpenAPI spec from ${API_URL}.`);
    process.exit(1);
  }

  try {
    execSync(
      `bunx openapi-zod-client ${openApiPath} ` +
        "--output " +
        GENERATED_DIR +
        "/schemas.ts " +
        "--export-schemas " +
        "--group-strategy none " +
        "--with-docs",
      { stdio: "inherit" },
    );
  } catch (_error) {
    console.error("Failed to generate schemas.");
    process.exit(1);
  }

  // Read and parse the generated file
  let content = await fs.readFile("./generated/schemas.ts", "utf-8");

  // Fix common generation issues
  content = content.replace(/\.prefault\(/g, ".default(");

  // Fix Zod v3 record syntax - z.record(z.string()) -> z.record(z.string(), z.any())
  content = content.replace(/z\.record\(z\.string\(\)\)/g, "z.record(z.string(), z.any())");

  // Fix nullable enums emitted as z.enum([... , null]), which newer Zod typings reject.
  content = content.replace(/z\.enum\(\[([\s\S]*?)\]\)/g, (match, values) => {
    if (!/\bnull\b/.test(values)) {
      return match;
    }

    const enumValues = values
      .split(",")
      .map((value: string) => value.trim())
      .filter((value: string) => value.length > 0 && value !== "null")
      .join(", ");

    return `z.union([z.enum([${enumValues}]), z.null()])`;
  });

  // Remove .default({}) from metadata fields to keep them truly optional
  // When using .optional().default({}), Zod infers the type as required since it always has a value after parsing
  // We want metadata to be optional in the form type to match SDK types
  // Handle both single-line and multi-line patterns (with optional whitespace/newlines between)
  content = content.replace(/\.optional\(\)\s*\.default\(\{\}\)/gs, ".optional()");

  // Keep nullable types as-is (z.union([z.string(), z.null()]) stays nullable)
  // This matches SDK types which also use | null

  // Replace undefined named schema references with z.any().optional()
  // These are schemas referenced by name (like TaxRules, EntityBankAccount) that aren't defined in this file
  content = content.replace(/: TaxRules,/g, ": z.any().optional(),");
  content = content.replace(/: EuTaxRules,/g, ": z.any().optional(),");
  content = content.replace(/z\.array\(EntityBankAccount\)/g, "z.array(z.any())");

  // Helper function to find schema dependencies (schemas referenced by other schemas)
  function findSchemaDependencies(schemaName: string, fullContent: string): string[] {
    const dependencies: string[] = [];
    const schemaDefMatch = fullContent.match(new RegExp(`const ${schemaName} = ([^;]+);`, "s"));
    if (schemaDefMatch) {
      // Find references to other const schemas (e.g., CreateFursInvoiceData.optional())
      const constRefs = schemaDefMatch[1].match(/\b([A-Z][a-zA-Z0-9]+)(?:\.optional\(\)|\.nullable\(\))?/g);
      if (constRefs) {
        for (const ref of constRefs) {
          const cleanRef = ref.replace(/\.(optional|nullable)\(\)/, "");
          // Check if it's actually a schema definition in the file
          // Handle `const Foo = z.object(...)`, `const Foo = z\n  .object(...)`,
          // and `const Foo = OtherSchema.and(...)` (schema composition)
          const isZodSchema =
            fullContent.includes(`const ${cleanRef} = z.`) || fullContent.includes(`const ${cleanRef} = z\n`);
          const isComposedSchema = new RegExp(`const ${cleanRef} = [A-Z][a-zA-Z0-9]+\\.`).test(fullContent);
          if (isZodSchema || isComposedSchema) {
            dependencies.push(cleanRef);
          }
        }
      }
    }
    return dependencies;
  }

  const operationEntries = extractOperationSchemaEntries(content);
  if (operationEntries.length === 0) {
    throw new Error("Could not find endpoint body schemas in generated file");
  }

  const schemasByGroup = operationEntries.reduce<Record<string, OperationSchemaEntry[]>>((groups, entry) => {
    if (!groups[entry.groupName]) {
      groups[entry.groupName] = [];
    }

    groups[entry.groupName].push(entry);
    return groups;
  }, {});

  // Remove previously generated schema files so stale outputs don't survive generator changes.
  for (const file of await fs.readdir(SCHEMAS_DIR)) {
    if (file.endsWith(".ts")) {
      await fs.unlink(path.join(SCHEMAS_DIR, file));
    }
  }

  // Create files for each group
  for (const [groupName, groupEntries] of Object.entries(schemasByGroup)) {
    const primaryEntryBySchemaName = new Map<string, OperationSchemaEntry>();
    for (const entry of groupEntries) {
      if (!primaryEntryBySchemaName.has(entry.schemaName)) {
        primaryEntryBySchemaName.set(entry.schemaName, entry);
      }
    }

    const schemaNames = groupEntries.reduce<string[]>((acc, entry) => {
      if (!acc.includes(entry.schemaName)) {
        acc.push(entry.schemaName);
      }

      // Find and add dependencies
      const deps = findSchemaDependencies(entry.schemaName, content);
      const queue = [...deps];
      const processed = new Set(deps);

      while (queue.length > 0) {
        const currentDep = queue.shift()!;
        if (!acc.includes(currentDep)) {
          acc.push(currentDep);
        }

        const nestedDeps = findSchemaDependencies(currentDep, content);
        for (const nested of nestedDeps) {
          if (!processed.has(nested)) {
            processed.add(nested);
            queue.push(nested);
          }
        }
      }

      return acc;
    }, []);

    // Separate dependencies from operation schemas
    const dependencies = schemaNames.filter((name) => !groupEntries.some((entry) => entry.schemaName === name));
    const operations = [...new Set(groupEntries.map((entry) => entry.schemaName))];

    // Topologically sort dependencies so each schema is defined after its own dependencies
    const sortedDependencies = topologicalSort(dependencies, content);

    // Process dependencies first, then operations
    const orderedNames = [...sortedDependencies, ...operations];

    const schemas = orderedNames
      .map((schemaName) => {
        const operationEntry = primaryEntryBySchemaName.get(schemaName);

        if (!operationEntry) {
          // This is a dependency schema, just extract its definition
          const schemaDefinitionMatch = content.match(new RegExp(`const ${schemaName} = ([^;]+);`, "s"));
          if (!schemaDefinitionMatch) {
            console.warn(`Warning: Could not find dependency schema definition for ${schemaName}`);
            return null;
          }

          return `
// Dependency schema for ${groupName}
const ${schemaName} = ${schemaDefinitionMatch[1]};
`;
        }

        const schemaDefinitionMatch = content.match(new RegExp(`const ${operationEntry.schemaName} = ([^;]+);`, "s"));
        if (!schemaDefinitionMatch) {
          console.warn(`Warning: Could not find schema definition for ${operationEntry.schemaName}`);
          return null;
        }

        let schemaDefinition = schemaDefinitionMatch[1];

        // Post-process: Add character limits to name and description fields
        // Add max length validation from API schema (only if not already present)
        schemaDefinition = schemaDefinition.replace(
          /name: z\.string\(\)\.min\(1\)\.max\(100\)(?!\.max)/g,
          'name: z.string().min(1).max(100, "Name must not exceed 100 characters")',
        );
        // Add description character limit - handles both union and nullable variants
        schemaDefinition = schemaDefinition.replace(
          /description: z\.union\(\[z\.string\(\)(?!\.max)/g,
          'description: z.union([z.string().max(4000, "Description must not exceed 4000 characters")',
        );

        // Add min length to country
        schemaDefinition = schemaDefinition.replace(/country: z\.string\(\)(?!\.min)/g, "country: z.string().min(1)");

        const operationName = operationEntry.alias;

        return `
// Schema for ${operationName} operation
const ${operationName}SchemaDefinition = ${schemaDefinition};
`;
      })
      .filter((schema) => schema !== null) // Remove null entries
      .join("\n");

    const exports = groupEntries
      .map(({ alias, schemaName }) => {
        const definitionEntry = primaryEntryBySchemaName.get(schemaName);
        if (!definitionEntry) {
          throw new Error(`Missing primary operation entry for ${schemaName}`);
        }

        const typeName = alias.slice(0, 1).toUpperCase() + alias.slice(1);
        return `export type ${typeName}Schema = z.infer<typeof ${definitionEntry.alias}SchemaDefinition>;
export const ${alias}Schema = ${definitionEntry.alias}SchemaDefinition;`;
      })
      .join("\n");

    const schemaContent = `/**
 * This file was automatically generated using 'bun generate-schemas'.
 * Do not edit this file manually. To update, run the generator again.
 * @generated
 */

import { z } from 'zod';

// Schemas for ${groupName} endpoints
${schemas}
${exports}
`;

    await fs.writeFile(path.join(SCHEMAS_DIR, `${groupName}.ts`), schemaContent);
  }
  // Topological sort: ensures each schema is defined after all schemas it depends on
  function topologicalSort(names: string[], fullContent: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    function visit(name: string) {
      if (visited.has(name)) return;
      visited.add(name);
      // Visit dependencies first so they appear earlier in the output
      const deps = findSchemaDependencies(name, fullContent);
      for (const dep of deps) {
        if (names.includes(dep)) {
          visit(dep);
        }
      }
      result.push(name);
    }

    for (const name of names) {
      visit(name);
    }
    return result;
  }

  // Create index file - export ALL schema files (not just schemasByGroup)
  const normalizedSchemaFiles = new Map<string, string>();
  for (const file of await fs.readdir(SCHEMAS_DIR)) {
    if (!file.endsWith(".ts") || file === "index.ts") continue;

    const name = file.replace(".ts", "");
    const normalizedName = name.replace(/_/g, "").toLowerCase();
    const existing = normalizedSchemaFiles.get(normalizedName);

    if (!existing || (existing.includes("_") && !name.includes("_"))) {
      normalizedSchemaFiles.set(normalizedName, name);
    }
  }

  const allSchemaFiles = [...normalizedSchemaFiles.values()].sort();

  const indexContent = `/**
 * This file was automatically generated using 'bun generate-schemas'.
 * Do not edit this file manually. To update, run the generator again.
 * @generated
 */

${allSchemaFiles.map((name) => `export * from './${name}';`).join("\n")}

// Re-export invoice create schema as credit note create schema (same body structure)
// Placed here (after invoice is exported) to avoid circular dependency issues
export { createInvoiceSchema as createCreditNoteSchema, type CreateInvoiceSchema as CreateCreditNoteSchema } from './invoice';
`;

  await fs.writeFile(path.join(SCHEMAS_DIR, "index.ts"), indexContent);

  // Clean up temporary files
  await fs.unlink(`${GENERATED_DIR}/schemas.ts`);
  await fs.unlink(`${GENERATED_DIR}/openapi.json`);
}

main().catch(console.error);
