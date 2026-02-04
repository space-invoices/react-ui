import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Detect the package manager used in the project
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  // Check for lock files
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }

  // Check for packageManager field in package.json
  const packageJsonPath = path.join(cwd, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.packageManager) {
        if (packageJson.packageManager.startsWith("bun")) return "bun";
        if (packageJson.packageManager.startsWith("pnpm")) return "pnpm";
        if (packageJson.packageManager.startsWith("yarn")) return "yarn";
        if (packageJson.packageManager.startsWith("npm")) return "npm";
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Default to npm
  return "npm";
}

/**
 * Get the install command for a package manager
 */
export function getInstallCommand(
  pm: PackageManager,
  packages: string[],
  options: { dev?: boolean } = {}
): string {
  const devFlag = options.dev ? " -D" : "";

  switch (pm) {
    case "bun":
      return `bun add${devFlag} ${packages.join(" ")}`;
    case "pnpm":
      return `pnpm add${devFlag} ${packages.join(" ")}`;
    case "yarn":
      return `yarn add${devFlag} ${packages.join(" ")}`;
    case "npm":
    default:
      return `npm install${options.dev ? " --save-dev" : ""} ${packages.join(" ")}`;
  }
}

/**
 * Install packages using the detected package manager
 */
export async function installPackages(
  packages: string[],
  options: { cwd?: string; dev?: boolean } = {}
): Promise<void> {
  if (packages.length === 0) return;

  const cwd = options.cwd ?? process.cwd();
  const pm = detectPackageManager(cwd);
  const command = getInstallCommand(pm, packages, { dev: options.dev });

  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Package installation failed with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Check if packages are already installed
 */
export function getInstalledPackages(cwd: string = process.cwd()): Set<string> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return new Set();
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const deps = new Set<string>();

    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        deps.add(dep);
      }
    }

    if (packageJson.devDependencies) {
      for (const dep of Object.keys(packageJson.devDependencies)) {
        deps.add(dep);
      }
    }

    return deps;
  } catch {
    return new Set();
  }
}

/**
 * Filter out already installed packages
 */
export function filterNewPackages(
  packages: string[],
  cwd: string = process.cwd()
): string[] {
  const installed = getInstalledPackages(cwd);
  return packages.filter((pkg) => !installed.has(pkg));
}
