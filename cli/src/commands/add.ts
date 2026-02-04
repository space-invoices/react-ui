import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import { configExists, readConfig, type Config } from "../utils/config.js";
import {
  installPackages,
  detectPackageManager,
  filterNewPackages,
} from "../utils/installer.js";
import { logger, spinner, highlight, dim } from "../utils/logger.js";
import {
  fetchRegistry,
  fetchFile,
  listComponents,
  getComponentsByCategory,
  type Registry,
} from "../utils/registry.js";
import {
  resolveDependencies,
  getInstallSummary,
  type ResolvedDependencies,
} from "../utils/resolver.js";
import {
  transformImports,
  getFullDestinationPath,
} from "../utils/transformer.js";

export interface AddOptions {
  cwd?: string;
  yes?: boolean;
  all?: boolean;
  overwrite?: boolean;
}

export async function add(
  componentNames: string[],
  options: AddOptions = {}
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Check for config
  if (!configExists(cwd)) {
    logger.error(
      "No spaceinvoices.json found. Run `npx @spaceinvoices/react-ui init` first."
    );
    process.exit(1);
  }

  const config = readConfig(cwd);
  if (!config) {
    logger.error("Failed to read spaceinvoices.json");
    process.exit(1);
  }

  // Fetch registry
  const registrySpinner = spinner("Fetching component registry...");
  registrySpinner.start();

  let registry: Registry;
  try {
    registry = await fetchRegistry();
    registrySpinner.succeed("Fetched component registry");
  } catch (error) {
    registrySpinner.fail("Failed to fetch registry");
    throw error;
  }

  // Handle --all flag
  if (options.all) {
    componentNames = listComponents(registry);
  }

  // If no components specified, show interactive picker
  if (componentNames.length === 0) {
    const components = await selectComponents(registry);
    if (components.length === 0) {
      logger.info("No components selected.");
      return;
    }
    componentNames = components;
  }

  // Validate component names
  const availableComponents = listComponents(registry);
  for (const name of componentNames) {
    if (!availableComponents.includes(name)) {
      logger.error(`Component "${name}" not found in registry.`);
      logger.info("Available components:");
      for (const comp of availableComponents) {
        logger.log(`  - ${comp}`);
      }
      process.exit(1);
    }
  }

  // Resolve dependencies
  logger.break();
  const resolveSpinner = spinner("Resolving dependencies...");
  resolveSpinner.start();

  let resolved: ResolvedDependencies;
  try {
    resolved = resolveDependencies(registry, componentNames);
    const summary = getInstallSummary(resolved);
    resolveSpinner.succeed(
      `Resolved ${summary.fileCount} files with ${summary.npmPackages.length} npm packages`
    );
  } catch (error) {
    resolveSpinner.fail("Failed to resolve dependencies");
    throw error;
  }

  // Show summary
  const summary = getInstallSummary(resolved);
  logger.break();
  logger.info("The following will be installed:");
  logger.break();

  if (summary.components.length > 0) {
    logger.log(`  ${highlight("Components:")} ${summary.components.join(", ")}`);
  }
  if (summary.providers.length > 0) {
    logger.log(`  ${highlight("Providers:")} ${summary.providers.join(", ")}`);
  }
  if (summary.utils.length > 0) {
    logger.log(`  ${highlight("Utilities:")} ${summary.utils.join(", ")}`);
  }
  if (summary.npmPackages.length > 0) {
    logger.log(
      `  ${highlight("npm packages:")} ${summary.npmPackages.join(", ")}`
    );
  }
  logger.log(`  ${highlight("Files:")} ${summary.fileCount} files`);

  // Confirm installation
  if (!options.yes) {
    logger.break();
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: "Proceed with installation?",
      initial: true,
    });

    if (!proceed) {
      logger.info("Installation cancelled.");
      return;
    }
  }

  // Fetch and write files
  logger.break();
  const filesSpinner = spinner("Installing components...");
  filesSpinner.start();

  const existingFiles: string[] = [];
  const filesToWrite: Array<{ path: string; content: string }> = [];

  try {
    for (const filePath of resolved.allFiles) {
      const destPath = getFullDestinationPath(filePath, config, cwd);

      // Check if file exists
      if (fs.existsSync(destPath)) {
        existingFiles.push(destPath);
      }

      // Fetch content
      const content = await fetchFile(filePath);
      const transformed = transformImports(content, config);
      filesToWrite.push({ path: destPath, content: transformed });
    }
  } catch (error) {
    filesSpinner.fail("Failed to fetch component files");
    throw error;
  }

  // Handle existing files
  if (existingFiles.length > 0 && !options.overwrite) {
    filesSpinner.stop();
    logger.break();
    logger.warn(`The following files already exist:`);
    for (const file of existingFiles) {
      logger.log(`  ${dim(file)}`);
    }
    logger.break();

    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "Overwrite existing files?",
      initial: false,
    });

    if (!overwrite) {
      // Filter out existing files
      const existingSet = new Set(existingFiles);
      const filteredFiles = filesToWrite.filter((f) => !existingSet.has(f.path));

      if (filteredFiles.length === 0) {
        logger.info("No files to install.");
        return;
      }

      filesToWrite.length = 0;
      filesToWrite.push(...filteredFiles);
    }

    filesSpinner.start();
  }

  // Write all files
  try {
    for (const { path: filePath, content } of filesToWrite) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    filesSpinner.succeed(`Installed ${filesToWrite.length} files`);
  } catch (error) {
    filesSpinner.fail("Failed to write files");
    throw error;
  }

  // Install npm dependencies
  const pm = detectPackageManager(cwd);
  const newDeps = filterNewPackages(resolved.allNpmDependencies, cwd);

  if (newDeps.length > 0) {
    logger.break();
    logger.info(`Installing npm dependencies with ${pm}...`);
    logger.break();

    try {
      await installPackages(newDeps, { cwd });
      logger.break();
      logger.success(`Installed ${newDeps.length} npm packages`);
    } catch (error) {
      logger.error("Failed to install npm packages. Please install manually:");
      logger.log(`  ${newDeps.join(" ")}`);
    }
  }

  logger.break();
  logger.success("Components installed successfully!");
  logger.break();
}

async function selectComponents(registry: Registry): Promise<string[]> {
  const byCategory = getComponentsByCategory(registry);

  // Build choices for prompts
  const choices: Array<{
    title: string;
    value: string;
    description?: string;
  }> = [];

  for (const [categoryKey, category] of Object.entries(byCategory)) {
    // Add category header (not selectable)
    choices.push({
      title: `── ${category.name} ──`,
      value: `__category_${categoryKey}`,
      description: "",
    });

    // Add components in category
    for (const comp of category.components) {
      choices.push({
        title: `  ${comp.name}`,
        value: comp.key,
        description: comp.key,
      });
    }
  }

  const { selected } = await prompts({
    type: "multiselect",
    name: "selected",
    message: "Select components to install",
    choices: choices.filter((c) => !c.value.startsWith("__category_")),
    hint: "- Space to select. Return to submit",
  });

  return selected ?? [];
}
