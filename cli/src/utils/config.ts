import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE = "spaceinvoices.json";

export interface Config {
  $schema?: string;
  aliases: {
    components: string;
    ui: string;
    lib: string;
    hooks: string;
    providers: string;
  };
}

export const DEFAULT_CONFIG: Config = {
  $schema: "https://raw.githubusercontent.com/space-invoices/react-ui/main/spaceinvoices.schema.json",
  aliases: {
    components: "@/components/space-invoices",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
    providers: "@/providers",
  },
};

export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILE);
}

export function configExists(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(cwd));
}

export function readConfig(cwd: string = process.cwd()): Config | null {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Config;
  } catch {
    return null;
  }
}

export function writeConfig(config: Config, cwd: string = process.cwd()): void {
  const configPath = getConfigPath(cwd);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function resolveAliasPath(alias: string, cwd: string = process.cwd()): string {
  // Convert alias like @/components to actual path
  // Assumes @/ maps to src/ or ./ based on project structure
  if (alias.startsWith("@/")) {
    // Check if src directory exists
    const srcPath = path.join(cwd, "src", alias.slice(2));
    const rootPath = path.join(cwd, alias.slice(2));

    if (fs.existsSync(path.join(cwd, "src"))) {
      return srcPath;
    }
    return rootPath;
  }
  return path.join(cwd, alias);
}
