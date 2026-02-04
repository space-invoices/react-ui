import type { Config } from "./config.js";

/**
 * Transform import paths in source code from registry format to user's configured aliases
 *
 * Registry paths use @/ui/ prefix:
 * - @/ui/components/ui/button -> user's ui alias
 * - @/ui/components/xxx -> user's components alias
 * - @/ui/providers/xxx -> user's providers alias
 * - @/ui/lib/xxx -> user's lib alias
 * - @/ui/hooks/xxx -> user's hooks alias
 */
export function transformImports(source: string, config: Config): string {
  let result = source;

  // Order matters: more specific patterns first
  const replacements: Array<[RegExp, string]> = [
    // UI components: @/ui/components/ui/ -> config.aliases.ui/
    [/@\/ui\/components\/ui\//g, `${config.aliases.ui}/`],

    // Feature components: @/ui/components/ -> config.aliases.components/
    [/@\/ui\/components\//g, `${config.aliases.components}/`],

    // Providers: @/ui/providers/ -> config.aliases.providers/
    [/@\/ui\/providers\//g, `${config.aliases.providers}/`],

    // Lib utilities: @/ui/lib/ -> config.aliases.lib/
    [/@\/ui\/lib\//g, `${config.aliases.lib}/`],

    // Hooks: @/ui/hooks/ -> config.aliases.hooks/
    [/@\/ui\/hooks\//g, `${config.aliases.hooks}/`],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Get the destination path for a file based on its source path and user config
 */
export function getDestinationPath(
  sourcePath: string,
  config: Config
): { destPath: string; category: "ui" | "components" | "providers" | "lib" | "hooks" } {
  // Determine the category and destination based on the source path
  if (sourcePath.startsWith("components/ui/")) {
    return {
      destPath: sourcePath.replace("components/ui/", ""),
      category: "ui",
    };
  }

  if (sourcePath.startsWith("components/")) {
    return {
      destPath: sourcePath.replace("components/", ""),
      category: "components",
    };
  }

  if (sourcePath.startsWith("providers/")) {
    return {
      destPath: sourcePath.replace("providers/", ""),
      category: "providers",
    };
  }

  if (sourcePath.startsWith("lib/")) {
    return {
      destPath: sourcePath.replace("lib/", ""),
      category: "lib",
    };
  }

  if (sourcePath.startsWith("hooks/")) {
    return {
      destPath: sourcePath.replace("hooks/", ""),
      category: "hooks",
    };
  }

  // Default to components
  return {
    destPath: sourcePath,
    category: "components",
  };
}

/**
 * Get the full destination file path
 */
export function getFullDestinationPath(
  sourcePath: string,
  config: Config,
  basePath: string
): string {
  const { destPath, category } = getDestinationPath(sourcePath, config);
  const alias = config.aliases[category];

  // Convert alias to relative path (assuming @/ -> src/)
  let relativePath: string;
  if (alias.startsWith("@/")) {
    relativePath = alias.slice(2); // Remove @/
  } else {
    relativePath = alias;
  }

  return `${basePath}/src/${relativePath}/${destPath}`;
}
