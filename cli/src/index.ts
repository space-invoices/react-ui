#!/usr/bin/env node

import { Command } from "commander";
import { init } from "./commands/init.js";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";
import { setLocalBasePath } from "./utils/registry.js";

const program = new Command();

program
  .name("spaceinvoices-ui")
  .description("CLI for adding Space Invoices React UI components to your project")
  .version("0.4.1");

program
  .option("--local <path>", "Use local registry from specified path (for development)")

program
  .command("init")
  .description("Initialize Space Invoices UI in your project")
  .option("-y, --yes", "Skip prompts and use defaults")
  .option("-f, --force", "Overwrite existing configuration")
  .option("--cwd <path>", "Working directory (defaults to current directory)")
  .action(async (options) => {
    // Check for global --local option
    const globalOpts = program.opts();
    if (globalOpts.local) {
      setLocalBasePath(globalOpts.local);
    }
    try {
      await init({
        cwd: options.cwd,
        yes: options.yes,
        force: options.force,
      });
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("add")
  .description("Add components to your project")
  .argument("[components...]", "Components to add")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("-a, --all", "Add all available components")
  .option("-o, --overwrite", "Overwrite existing files without asking")
  .option("--cwd <path>", "Working directory (defaults to current directory)")
  .action(async (components: string[], options) => {
    // Check for global --local option
    const globalOpts = program.opts();
    if (globalOpts.local) {
      setLocalBasePath(globalOpts.local);
    }
    try {
      await add(components, {
        cwd: options.cwd,
        yes: options.yes,
        all: options.all,
        overwrite: options.overwrite,
      });
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List available components")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    // Check for global --local option
    const globalOpts = program.opts();
    if (globalOpts.local) {
      setLocalBasePath(globalOpts.local);
    }
    try {
      await list({
        json: options.json,
      });
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
