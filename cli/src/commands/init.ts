import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  configExists,
  writeConfig,
  type Config,
} from "../utils/config.js";
import { installPackages, detectPackageManager, filterNewPackages } from "../utils/installer.js";
import { logger, spinner, highlight } from "../utils/logger.js";
import { fetchRegistry, fetchFile } from "../utils/registry.js";
import { transformImports, getFullDestinationPath } from "../utils/transformer.js";

const CORE_DEPENDENCIES = ["@spaceinvoices/js-sdk", "@tanstack/react-query"];

const ESSENTIAL_FILES = [
  "lib/utils.ts",
  "lib/auth.ts",
  "lib/cookies.ts",
  "lib/browser-cookies.ts",
  "lib/translation.ts",
  "providers/sdk-provider.tsx",
  "components/entities/keys.ts",
];

export interface InitOptions {
  cwd?: string;
  yes?: boolean;
  force?: boolean;
}

export async function init(options: InitOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  logger.break();
  logger.info("Initializing Space Invoices React UI...");
  logger.break();

  // Check if config already exists
  if (configExists(cwd) && !options.force) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${CONFIG_FILE} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      logger.info("Initialization cancelled.");
      return;
    }
  }

  // Gather configuration
  let config: Config;

  if (options.yes) {
    config = { ...DEFAULT_CONFIG };
  } else {
    const answers = await prompts([
      {
        type: "text",
        name: "components",
        message: "Where should feature components be installed?",
        initial: DEFAULT_CONFIG.aliases.components,
      },
      {
        type: "text",
        name: "ui",
        message: "Where should UI primitives be installed?",
        initial: DEFAULT_CONFIG.aliases.ui,
      },
      {
        type: "text",
        name: "lib",
        message: "Where should lib utilities be installed?",
        initial: DEFAULT_CONFIG.aliases.lib,
      },
      {
        type: "text",
        name: "hooks",
        message: "Where should hooks be installed?",
        initial: DEFAULT_CONFIG.aliases.hooks,
      },
      {
        type: "text",
        name: "providers",
        message: "Where should providers be installed?",
        initial: DEFAULT_CONFIG.aliases.providers,
      },
    ]);

    // Check if user cancelled
    if (!answers.components) {
      logger.info("Initialization cancelled.");
      return;
    }

    config = {
      $schema: DEFAULT_CONFIG.$schema,
      aliases: {
        components: answers.components,
        ui: answers.ui,
        lib: answers.lib,
        hooks: answers.hooks,
        providers: answers.providers,
      },
    };
  }

  // Write config file
  const configSpinner = spinner("Writing configuration...");
  configSpinner.start();

  try {
    writeConfig(config, cwd);
    configSpinner.succeed(`Created ${highlight(CONFIG_FILE)}`);
  } catch (error) {
    configSpinner.fail(`Failed to create ${CONFIG_FILE}`);
    throw error;
  }

  // Create directories
  const dirSpinner = spinner("Creating directories...");
  dirSpinner.start();

  try {
    const directories = [
      config.aliases.components,
      config.aliases.ui,
      config.aliases.lib,
      config.aliases.hooks,
      config.aliases.providers,
    ];

    for (const alias of directories) {
      let dirPath: string;
      if (alias.startsWith("@/")) {
        dirPath = path.join(cwd, "src", alias.slice(2));
      } else {
        dirPath = path.join(cwd, alias);
      }
      fs.mkdirSync(dirPath, { recursive: true });
    }

    dirSpinner.succeed("Created directories");
  } catch (error) {
    dirSpinner.fail("Failed to create directories");
    throw error;
  }

  // Copy essential files
  const filesSpinner = spinner("Copying essential files...");
  filesSpinner.start();

  try {
    for (const filePath of ESSENTIAL_FILES) {
      const content = await fetchFile(filePath);
      const transformed = transformImports(content, config);
      const destPath = getFullDestinationPath(filePath, config, cwd);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, transformed);
    }

    filesSpinner.succeed(`Copied ${ESSENTIAL_FILES.length} essential files`);
  } catch (error) {
    filesSpinner.fail("Failed to copy essential files");
    throw error;
  }

  // Install core dependencies
  const pm = detectPackageManager(cwd);
  const newDeps = filterNewPackages(CORE_DEPENDENCIES, cwd);

  if (newDeps.length > 0) {
    logger.break();
    logger.info(`Installing dependencies with ${pm}...`);
    logger.break();

    try {
      await installPackages(newDeps, { cwd });
      logger.break();
      logger.success("Installed core dependencies");
    } catch (error) {
      logger.error("Failed to install dependencies. Please install manually:");
      logger.log(`  ${newDeps.join(" ")}`);
    }
  }

  logger.break();
  logger.success("Space Invoices React UI initialized!");
  logger.break();
  logger.info("Next steps:");
  logger.log(`  1. Add components: ${highlight("npx @spaceinvoices/react-ui add customers/create-customer-form")}`);
  logger.log(`  2. Import and use in your app`);
  logger.break();
}
