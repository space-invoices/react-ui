#!/usr/bin/env bun
/**
 * Test runner that handles Bun's module caching limitation.
 *
 * Bun runs all tests in a single process without isolation, causing
 * module state corruption for some test files. This script:
 * 1. Runs the main test suite
 * 2. Identifies failed test files
 * 3. Re-runs each failed file individually (in separate processes)
 * 4. Reports combined results
 */

import { $ } from "bun";

// ANSI colors
const _green = "\x1b[32m";
const _red = "\x1b[31m";
const _yellow = "\x1b[33m";
const _reset = "\x1b[0m";
const _bold = "\x1b[1m";

async function main() {
  const mainResult = await $`bun test 2>&1`.text().catch((e) => e.stdout?.toString() || "");

  // Parse results
  const passMatch = mainResult.match(/(\d+) pass/);
  const failMatch = mainResult.match(/(\d+) fail/);
  const skipMatch = mainResult.match(/(\d+) skip/);

  const _mainPassed = passMatch ? Number.parseInt(passMatch[1], 10) : 0;
  const mainFailed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;
  const _mainSkipped = skipMatch ? Number.parseInt(skipMatch[1], 10) : 0;

  if (mainFailed === 0) {
    process.exit(0);
  }

  // Step 2: Extract unique failing test files from error stack traces
  const filePattern = /at.*\((.*?\.test\.tsx?):\d+:\d+\)/g;
  const failingFiles = new Set<string>();
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex iteration pattern
  while ((match = filePattern.exec(mainResult)) !== null) {
    // Normalize path
    const filePath = match[1].replace(/.*\/packages\/ui\//, "");
    if (filePath.includes(".test.ts")) {
      failingFiles.add(filePath);
    }
  }

  if (failingFiles.size === 0) {
    process.exit(1);
  }

  // Step 3: Re-run each failing file in isolation
  let isolatedPassed = 0;
  const stillFailing: string[] = [];

  for (const file of failingFiles) {
    process.stdout.write(`  ${file}... `);
    try {
      // Run test file individually - use quiet mode and check exit code
      const proc = Bun.spawn(["bun", "test", file], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      const output = await new Response(proc.stdout).text();

      // Check for "0 fail" or no "fail" line at all
      const hasFailures = /[1-9]\d* fail/.test(output);

      if (exitCode === 0 && !hasFailures) {
        isolatedPassed++;
      } else {
        stillFailing.push(file);
      }
    } catch (_e: any) {
      stillFailing.push(file);
    }
  }

  if (stillFailing.length > 0) {
    process.exit(1);
  } else if (isolatedPassed > 0) {
    process.exit(0);
  } else {
    process.exit(0);
  }
}

main().catch(console.error);
