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
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";
const bold = "\x1b[1m";

async function main() {
  console.log(`${bold}Running tests with isolation fallback...${reset}\n`);

  // Step 1: Run main test suite and capture output
  console.log(`${yellow}Phase 1: Running main test suite...${reset}`);
  const mainResult = await $`bun test 2>&1`.text().catch((e) => e.stdout?.toString() || "");

  // Parse results
  const passMatch = mainResult.match(/(\d+) pass/);
  const failMatch = mainResult.match(/(\d+) fail/);
  const skipMatch = mainResult.match(/(\d+) skip/);

  const mainPassed = passMatch ? Number.parseInt(passMatch[1], 10) : 0;
  const mainFailed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;
  const mainSkipped = skipMatch ? Number.parseInt(skipMatch[1], 10) : 0;

  console.log(
    `  Main suite: ${green}${mainPassed} passed${reset}, ${mainFailed > 0 ? red : ""}${mainFailed} failed${reset}${mainSkipped > 0 ? `, ${mainSkipped} skipped` : ""}\n`,
  );

  if (mainFailed === 0) {
    console.log(`${green}${bold}All tests passed!${reset}`);
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
    console.log(`${yellow}Could not identify failing test files. Check output above.${reset}`);
    process.exit(1);
  }

  console.log(`${yellow}Phase 2: Re-running ${failingFiles.size} failing files individually...${reset}`);

  // Step 3: Re-run each failing file in isolation
  let isolatedPassed = 0;
  const stillFailing: string[] = [];

  for (const file of failingFiles) {
    process.stdout.write(`  ${file}... `);
    try {
      const proc = Bun.spawn(["bun", "test", file], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      // Bun test outputs results to stderr, combine both for checking
      const output = stdout + stderr;

      // Check for pass/fail patterns
      const passMatch = output.match(/(\d+) pass/);
      const failMatch = output.match(/(\d+) fail/);
      const hasPass = passMatch && Number.parseInt(passMatch[1], 10) > 0;
      const failCount = failMatch ? Number.parseInt(failMatch[1], 10) : 0;

      if ((exitCode === 0 || hasPass) && failCount === 0) {
        console.log(`${green}✓ passed in isolation${reset}`);
        isolatedPassed++;
      } else {
        console.log(`${red}✗ still failing${reset}`);
        stillFailing.push(file);
      }
    } catch (e: any) {
      console.log(`${red}✗ error: ${e.message}${reset}`);
      stillFailing.push(file);
    }
  }

  // Step 4: Summary
  console.log(`\n${bold}Summary:${reset}`);
  console.log(`  Main suite: ${green}${mainPassed} passed${reset}`);
  console.log(`  Isolation fixes: ${green}${isolatedPassed} files now pass${reset}`);

  if (stillFailing.length > 0) {
    console.log(`  ${red}Real failures: ${stillFailing.length} files (not isolation issues)${reset}`);
    for (const f of stillFailing) {
      console.log(`    - ${f}`);
    }
    console.log(`\n${yellow}Run these individually to see actual errors:${reset}`);
    console.log(`  bun test ${stillFailing[0]}`);
    process.exit(1);
  } else if (isolatedPassed > 0) {
    console.log(`\n${green}${bold}All tests pass!${reset}`);
    console.log(`${yellow}Note: ${isolatedPassed} files required isolation (Bun module caching limitation)${reset}`);
    process.exit(0);
  } else {
    console.log(`\n${green}${bold}All tests passed!${reset}`);
    process.exit(0);
  }
}

main().catch(console.error);
