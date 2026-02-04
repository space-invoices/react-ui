import { logger, highlight, dim } from "../utils/logger.js";
import { spinner } from "../utils/logger.js";
import { fetchRegistry, getComponentsByCategory, listProviders, listUtils } from "../utils/registry.js";

export interface ListOptions {
  json?: boolean;
}

export async function list(options: ListOptions = {}): Promise<void> {
  const registrySpinner = spinner("Fetching component registry...");
  registrySpinner.start();

  try {
    const registry = await fetchRegistry();
    registrySpinner.succeed("Fetched component registry");

    if (options.json) {
      // Output JSON format
      const output = {
        components: Object.entries(registry.components).map(([key, comp]) => ({
          key,
          name: comp.name,
          category: comp.category,
          files: comp.files.length,
          dependencies: comp.dependencies?.length ?? 0,
        })),
        providers: Object.entries(registry.providers).map(([key, prov]) => ({
          key,
          name: prov.name,
          files: prov.files.length,
        })),
        utils: Object.entries(registry.utils).map(([key, util]) => ({
          key,
          name: util.name,
          files: util.files.length,
        })),
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Human-readable format
    logger.break();
    logger.info("Available components:");
    logger.break();

    const byCategory = getComponentsByCategory(registry);

    for (const [categoryKey, category] of Object.entries(byCategory)) {
      logger.log(highlight(`${category.name}:`));
      for (const comp of category.components) {
        logger.log(`  ${comp.key.padEnd(40)} ${dim(comp.name)}`);
      }
      logger.break();
    }

    // Show providers
    logger.log(highlight("Providers:"));
    for (const [key, prov] of Object.entries(registry.providers)) {
      logger.log(`  ${key.padEnd(40)} ${dim(prov.name)}`);
    }
    logger.break();

    // Show utils
    logger.log(highlight("Utilities:"));
    for (const [key, util] of Object.entries(registry.utils)) {
      logger.log(`  ${key.padEnd(40)} ${dim(util.name)}`);
    }
    logger.break();

    logger.info("Usage:");
    logger.log(`  npx @spaceinvoices/react-ui add ${dim("<component-name>")}`);
    logger.log(`  npx @spaceinvoices/react-ui add ${dim("customers/create-customer-form")}`);
    logger.break();
  } catch (error) {
    registrySpinner.fail("Failed to fetch registry");
    throw error;
  }
}
