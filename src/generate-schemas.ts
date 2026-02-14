import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const SCHEMAS_DIR = "./src/generated/schemas";
const GENERATED_DIR = "./generated";

type SchemaGroups = {
  [key: string]: string[];
};

// Helper to get group name from schema name
const getGroupName = (schemaName: string): string => {
  // Remove _Body and extract the resource name (e.g., Customer from createCustomer)
  return schemaName.replace(/(create|patch|update|delete)([A-Z][a-zA-Z]+)_Body/, "$2").toLowerCase();
};

// Helper to format operation name
const formatOperationName = (operationType: string, resourceName: string): string => {
  // Convert to proper case format (e.g., createCustomer)
  return `${operationType}${resourceName}`;
};

async function main() {
  // Ensure directories exist
  await fs.mkdir(SCHEMAS_DIR, { recursive: true });
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  // Generate initial schemas with openapi-zod-client
  try {
    const openApiPath = path.resolve(__dirname, "../../../apps/api/openapi.json");
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

  // Extract just the schema definitions
  const schemaMatch = content.match(/export const schemas = {([^}]+)}/s);
  if (!schemaMatch) {
    throw new Error("Could not find schema definitions in generated file");
  }
  const schemaSection = schemaMatch[1];

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

  // Parse schema names and group them
  const schemasByGroup = schemaSection
    .split(",\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("_Body"))
    .map((line) => line.split(":")[0].trim())
    .reduce<SchemaGroups>((groups, schemaName) => {
      const groupName = getGroupName(schemaName);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      // Add the main schema
      groups[groupName].push(schemaName);

      // Find and add dependencies
      const deps = findSchemaDependencies(schemaName, content);
      const queue = [...deps];
      const processed = new Set(deps);

      while (queue.length > 0) {
        const currentDep = queue.shift()!;
        if (!groups[groupName].includes(currentDep)) {
          groups[groupName].push(currentDep);
        }

        const nestedDeps = findSchemaDependencies(currentDep, content);
        for (const nested of nestedDeps) {
          if (!processed.has(nested)) {
            processed.add(nested);
            queue.push(nested);
          }
        }
      }

      return groups;
    }, {});

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

  // Create files for each group
  for (const [groupName, schemaNames] of Object.entries(schemasByGroup)) {
    // Separate dependencies from operation schemas
    const dependencies = schemaNames.filter((name) => !name.includes("_Body"));
    const operations = schemaNames.filter((name) => name.includes("_Body"));

    // Topologically sort dependencies so each schema is defined after its own dependencies
    const sortedDependencies = topologicalSort(dependencies, content);

    // Process dependencies first, then operations
    const orderedNames = [...sortedDependencies, ...operations];

    const schemas = orderedNames
      .map((schemaName) => {
        // Check if this is an operation schema or a dependency
        const operationMatch = schemaName.match(/(create|patch|update|delete|register|upload|send|preview|render)/i);
        const isOperationSchema = operationMatch && schemaName.includes("_Body");

        if (!isOperationSchema) {
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

        // Handle operation schemas
        const resourceMatch = schemaName.match(/[A-Z][a-zA-Z]+_Body/);
        if (!resourceMatch) {
          console.warn(`Warning: Invalid schema name format: ${schemaName}`);
          return null;
        }

        const operationType = operationMatch[1].toLowerCase();
        const resourceName = resourceMatch[0].replace("_Body", "");
        const operationName = formatOperationName(operationType, resourceName);

        const schemaDefinitionMatch = content.match(new RegExp(`const ${schemaName} = ([^;]+);`, "s"));
        if (!schemaDefinitionMatch) {
          console.warn(`Warning: Could not find schema definition for ${schemaName}`);
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

        return `
// Schema for ${operationType} ${resourceName.toLowerCase()} operation
const ${operationName}SchemaDefinition = ${schemaDefinition};

// Type for ${operationType} ${resourceName.toLowerCase()} operation
export type ${operationName.slice(0, 1).toUpperCase() + operationName.slice(1)}Schema = z.infer<typeof ${operationName}SchemaDefinition>;
`;
      })
      .filter((schema) => schema !== null) // Remove null entries
      .join("\n");

    const exports = schemaNames
      .filter((schemaName) => {
        // Only export operation schemas, not dependencies
        const operationMatch = schemaName.match(/(create|patch|update|delete|register|upload|send|preview|render)/i);
        return operationMatch !== null && schemaName.includes("_Body");
      })
      .map((schemaName) => {
        const operationMatch = schemaName.match(/(create|patch|update|delete|register|upload|send|preview|render)/i);
        const resourceMatch = schemaName.match(/[A-Z][a-zA-Z]+_Body/);

        if (!operationMatch || !resourceMatch) {
          throw new Error(`Invalid schema name format: ${schemaName}`);
        }

        const operationType = operationMatch[1].toLowerCase();
        const resourceName = resourceMatch[0].replace("_Body", "");
        const operationName = formatOperationName(operationType, resourceName);
        return `export const ${operationName}Schema = ${operationName}SchemaDefinition;`;
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

  // Create index file - export ALL schema files (not just schemasByGroup)
  const allSchemaFiles = (await fs.readdir(SCHEMAS_DIR))
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(".ts", ""))
    .sort();

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
}

main().catch(console.error);
