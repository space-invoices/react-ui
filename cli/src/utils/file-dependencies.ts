const GENERATED_IMPORT_PATTERN =
  /from\s+["']@\/ui\/generated\/schemas(?:\/([^"']+))?["']/g;

const GENERATED_EXPORT_PATTERN = /from\s+['"]\.\/([^'"]+)['"]/g;

function normalizeGeneratedPath(subpath: string): string {
  return `generated/schemas/${subpath.replace(/\.ts$/, "")}.ts`;
}

export function getRegistryManagedDependencies(
  filePath: string,
  source: string
): string[] {
  const dependencies = new Set<string>();

  if (filePath === "generated/schemas/index.ts") {
    for (const match of source.matchAll(GENERATED_EXPORT_PATTERN)) {
      dependencies.add(normalizeGeneratedPath(match[1]));
    }
    return [...dependencies];
  }

  for (const match of source.matchAll(GENERATED_IMPORT_PATTERN)) {
    const subpath = match[1];
    if (subpath) {
      dependencies.add(normalizeGeneratedPath(subpath));
      continue;
    }

    dependencies.add("generated/schemas/index.ts");
  }

  return [...dependencies];
}
