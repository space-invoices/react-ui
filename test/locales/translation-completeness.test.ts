import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const COMPONENTS_DIR = join(import.meta.dir, "../../src/components");

/**
 * Expected non-en locales that every component's locales/ directory must contain.
 * en.ts is optional (translation system uses English keys as fallback).
 */
const REQUIRED_LOCALES = ["de", "es", "fr", "hr", "it", "nl", "pl", "pt", "sl"];

/**
 * Recursively finds all locales/ directories under the components directory.
 */
function findLocaleDirs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales") {
        results.push(fullPath);
      } else if (entry.name !== "node_modules") {
        results.push(...findLocaleDirs(fullPath));
      }
    }
  }
  return results;
}

const localeDirs = findLocaleDirs(COMPONENTS_DIR);

describe("UI component locale completeness", () => {
  for (const localeDir of localeDirs) {
    const componentPath = relative(COMPONENTS_DIR, join(localeDir, ".."));

    describe(componentPath, () => {
      test("has all required locale files", () => {
        const files = readdirSync(localeDir)
          .filter((f) => f.endsWith(".ts"))
          .map((f) => f.replace(".ts", ""));

        const missing = REQUIRED_LOCALES.filter((l) => !files.includes(l));
        if (missing.length > 0) {
          expect(missing).toEqual(expect.arrayContaining([]));
          throw new Error(`Missing locale files: ${missing.join(", ")}`);
        }
      });

      test("all locales have matching keys", async () => {
        const files = readdirSync(localeDir).filter((f) => f.endsWith(".ts") && f !== "en.ts");

        if (files.length === 0) return;

        // Import all non-en locale files
        const localeData: Record<string, string[]> = {};
        for (const file of files) {
          const locale = file.replace(".ts", "");
          const mod = await import(join(localeDir, file));
          localeData[locale] = Object.keys(mod.default);
        }

        // Use locale with most keys as reference
        let referenceLocale = "";
        let maxKeys = 0;
        for (const [locale, keys] of Object.entries(localeData)) {
          if (keys.length > maxKeys) {
            maxKeys = keys.length;
            referenceLocale = locale;
          }
        }

        const referenceKeys = new Set(localeData[referenceLocale]);
        const errors: string[] = [];

        for (const [locale, keys] of Object.entries(localeData)) {
          if (locale === referenceLocale) continue;

          const keySet = new Set(keys);
          const missing = [...referenceKeys].filter((k) => !keySet.has(k));
          const extra = [...keySet].filter((k) => !referenceKeys.has(k));

          if (missing.length > 0) {
            errors.push(`${locale}.ts missing ${missing.length} keys vs ${referenceLocale}.ts: ${missing.join(", ")}`);
          }
          if (extra.length > 0) {
            errors.push(`${locale}.ts has ${extra.length} extra keys vs ${referenceLocale}.ts: ${extra.join(", ")}`);
          }
        }

        // Also check en.ts if it exists - allowed to be a subset, but no extra keys
        const enPath = join(localeDir, "en.ts");
        if (existsSync(enPath)) {
          const enMod = await import(enPath);
          const enKeys = new Set(Object.keys(enMod.default));
          const extraInEn = [...enKeys].filter((k) => !referenceKeys.has(k));
          if (extraInEn.length > 0) {
            errors.push(`en.ts has ${extraInEn.length} extra keys vs ${referenceLocale}.ts: ${extraInEn.join(", ")}`);
          }
        }

        if (errors.length > 0) {
          throw new Error(`Key mismatches:\n${errors.join("\n")}`);
        }
      });
    });
  }
});
