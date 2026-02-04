import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config.js";

const REGISTRY_BASE_URL =
  "https://raw.githubusercontent.com/space-invoices/react-ui/main";

// For local development testing
let localBasePath: string | null = null;

export function setLocalBasePath(basePath: string | null): void {
  localBasePath = basePath;
}

export interface RegistryComponent {
  name: string;
  category: string;
  files: string[];
  dependencies?: string[];
  providers?: string[];
  utils?: string[];
  schemas?: string[];
  npmDependencies?: string[];
}

export interface RegistryProvider {
  name: string;
  files: string[];
  dependencies?: string[];
  description?: string;
  npmDependencies?: string[];
}

export interface RegistryUtil {
  name: string;
  files: string[];
  dependencies?: string[];
  description?: string;
  npmDependencies?: string[];
}

export interface Registry {
  $schema?: string;
  name: string;
  description: string;
  baseUrl: string;
  categories: Record<string, { name: string; description: string }>;
  utils: Record<string, RegistryUtil>;
  providers: Record<string, RegistryProvider>;
  components: Record<string, RegistryComponent>;
}

let cachedRegistry: Registry | null = null;

export async function fetchRegistry(): Promise<Registry> {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  if (localBasePath) {
    // Local mode: read from filesystem
    const registryPath = path.join(localBasePath, "registry.json");
    const content = fs.readFileSync(registryPath, "utf-8");
    cachedRegistry = JSON.parse(content) as Registry;
    return cachedRegistry;
  }

  const response = await fetch(`${REGISTRY_BASE_URL}/registry.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry: ${response.statusText}`);
  }

  cachedRegistry = (await response.json()) as Registry;
  return cachedRegistry;
}

export async function fetchFile(filePath: string): Promise<string> {
  if (localBasePath) {
    // Local mode: read from filesystem
    const fullPath = path.join(localBasePath, "src", filePath);
    return fs.readFileSync(fullPath, "utf-8");
  }

  const url = `${REGISTRY_BASE_URL}/src/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file ${filePath}: ${response.statusText}`);
  }
  return response.text();
}

export function getComponent(
  registry: Registry,
  name: string
): RegistryComponent | null {
  return registry.components[name] ?? null;
}

export function getProvider(
  registry: Registry,
  name: string
): RegistryProvider | null {
  // Handle both "providers/xxx" and "xxx" formats
  const providerName = name.replace(/^providers\//, "");
  return registry.providers[providerName] ?? null;
}

export function getUtil(registry: Registry, name: string): RegistryUtil | null {
  // Handle both "utils/xxx" and "xxx" formats
  const utilName = name.replace(/^utils\//, "");
  return registry.utils[utilName] ?? null;
}

export function listComponents(registry: Registry): string[] {
  return Object.keys(registry.components);
}

export function listProviders(registry: Registry): string[] {
  return Object.keys(registry.providers);
}

export function listUtils(registry: Registry): string[] {
  return Object.keys(registry.utils);
}

export function getComponentsByCategory(
  registry: Registry
): Record<string, { name: string; components: Array<{ key: string; name: string }> }> {
  const result: Record<string, { name: string; components: Array<{ key: string; name: string }> }> = {};

  for (const [key, component] of Object.entries(registry.components)) {
    const category = component.category;
    if (!result[category]) {
      result[category] = {
        name: registry.categories[category]?.name ?? category,
        components: [],
      };
    }
    result[category].components.push({ key, name: component.name });
  }

  return result;
}
