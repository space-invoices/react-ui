import type {
  Registry,
  RegistryComponent,
  RegistryProvider,
  RegistryUtil,
} from "./registry.js";
import { getComponent, getProvider, getUtil } from "./registry.js";

export interface ResolvedItem {
  type: "component" | "provider" | "util";
  key: string;
  name: string;
  files: string[];
  npmDependencies: string[];
}

export interface ResolvedDependencies {
  items: ResolvedItem[];
  allFiles: string[];
  allNpmDependencies: string[];
}

/**
 * Resolves all transitive dependencies for given component names
 */
export function resolveDependencies(
  registry: Registry,
  componentNames: string[]
): ResolvedDependencies {
  const visited = new Set<string>();
  const items: ResolvedItem[] = [];
  const allFiles: string[] = [];
  const npmDepsSet = new Set<string>();

  function resolveComponent(name: string) {
    const key = `component:${name}`;
    if (visited.has(key)) return;
    visited.add(key);

    const component = getComponent(registry, name);
    if (!component) {
      throw new Error(`Component "${name}" not found in registry`);
    }

    // Resolve component dependencies first (these are other components)
    if (component.dependencies) {
      for (const dep of component.dependencies) {
        resolveComponent(dep);
      }
    }

    // Resolve providers
    if (component.providers) {
      for (const providerName of component.providers) {
        resolveProvider(providerName);
      }
    }

    // Resolve utils
    if (component.utils) {
      for (const utilName of component.utils) {
        resolveUtil(utilName);
      }
    }

    // Add this component
    items.push({
      type: "component",
      key: name,
      name: component.name,
      files: component.files,
      npmDependencies: component.npmDependencies ?? [],
    });

    allFiles.push(...component.files);

    if (component.npmDependencies) {
      for (const dep of component.npmDependencies) {
        npmDepsSet.add(dep);
      }
    }
  }

  function resolveProvider(name: string) {
    const providerName = name.replace(/^providers\//, "");
    const key = `provider:${providerName}`;
    if (visited.has(key)) return;
    visited.add(key);

    const provider = getProvider(registry, providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found in registry`);
    }

    // Resolve provider dependencies (other providers)
    if (provider.dependencies) {
      for (const dep of provider.dependencies) {
        resolveProvider(dep);
      }
    }

    items.push({
      type: "provider",
      key: providerName,
      name: provider.name,
      files: provider.files,
      npmDependencies: provider.npmDependencies ?? [],
    });

    allFiles.push(...provider.files);

    if (provider.npmDependencies) {
      for (const dep of provider.npmDependencies) {
        npmDepsSet.add(dep);
      }
    }
  }

  function resolveUtil(name: string) {
    const utilName = name.replace(/^utils\//, "");
    const key = `util:${utilName}`;
    if (visited.has(key)) return;
    visited.add(key);

    const util = getUtil(registry, utilName);
    if (!util) {
      throw new Error(`Utility "${utilName}" not found in registry`);
    }

    // Resolve util dependencies (providers or other utils)
    if (util.dependencies) {
      for (const dep of util.dependencies) {
        if (dep.startsWith("providers/") || registry.providers[dep]) {
          resolveProvider(dep);
        } else {
          resolveUtil(dep);
        }
      }
    }

    items.push({
      type: "util",
      key: utilName,
      name: util.name,
      files: util.files,
      npmDependencies: util.npmDependencies ?? [],
    });

    allFiles.push(...util.files);

    if (util.npmDependencies) {
      for (const dep of util.npmDependencies) {
        npmDepsSet.add(dep);
      }
    }
  }

  // Resolve all requested components
  for (const name of componentNames) {
    resolveComponent(name);
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(allFiles)];

  return {
    items,
    allFiles: uniqueFiles,
    allNpmDependencies: [...npmDepsSet],
  };
}

/**
 * Get a flat list of all items that will be installed
 */
export function getInstallSummary(resolved: ResolvedDependencies): {
  components: string[];
  providers: string[];
  utils: string[];
  npmPackages: string[];
  fileCount: number;
} {
  return {
    components: resolved.items
      .filter((i) => i.type === "component")
      .map((i) => i.name),
    providers: resolved.items
      .filter((i) => i.type === "provider")
      .map((i) => i.name),
    utils: resolved.items.filter((i) => i.type === "util").map((i) => i.name),
    npmPackages: resolved.allNpmDependencies,
    fileCount: resolved.allFiles.length,
  };
}
