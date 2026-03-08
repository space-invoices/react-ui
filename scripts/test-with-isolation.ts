#!/usr/bin/env bun
/**
 * Per-file test runner for full module isolation.
 *
 * Runs every test file in its own bun subprocess to eliminate Bun's
 * single-process module caching issues where mock.module() calls in
 * one file corrupt module state for other files.
 */

import { Glob } from "bun";

const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";
const bold = "\x1b[1m";

interface TestResult {
  file: string;
  passed: number;
  failed: number;
  skipped: number;
  status: "pass" | "fail" | "error" | "timeout";
  duration: number;
  output?: string;
}

function parseConcurrency(): number {
  for (const arg of process.argv) {
    if (arg.startsWith("--concurrency=")) {
      const n = Number.parseInt(arg.split("=")[1], 10);
      if (n > 0) return n;
    }
  }

  const env = process.env.TEST_CONCURRENCY;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (n > 0) return n;
  }

  return 4;
}

function parseTimeoutMs(): number {
  for (const arg of process.argv) {
    if (arg.startsWith("--timeout-ms=")) {
      const n = Number.parseInt(arg.split("=")[1], 10);
      if (n > 0) return n;
    }
  }

  const env = process.env.TEST_TIMEOUT_MS;
  if (env) {
    const n = Number.parseInt(env, 10);
    if (n > 0) return n;
  }

  return 60_000;
}

function parseFileFilter(): string | undefined {
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) return arg;
  }

  return undefined;
}

async function collectTestFiles(): Promise<string[]> {
  const files: string[] = [];
  const glob = new Glob("**/*.test.{ts,tsx}");

  for await (const file of glob.scan({ cwd: "src" })) {
    files.push(`src/${file}`);
  }

  for await (const file of glob.scan({ cwd: "test" })) {
    files.push(`test/${file}`);
  }

  files.sort();
  return files;
}

async function runTestFile(file: string, timeoutMs: number): Promise<TestResult> {
  const start = performance.now();

  try {
    const proc = Bun.spawn(["bun", "test", file], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    });

    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      proc.kill();
    }, timeoutMs);

    const stdoutPromise = new Response(proc.stdout).text();
    const stderrPromise = new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);

    const output = stdout + stderr;
    const duration = performance.now() - start;

    if (didTimeout) {
      return {
        file,
        passed: 0,
        failed: 0,
        skipped: 0,
        status: "timeout",
        duration,
        output: `${output}\nTimed out after ${(timeoutMs / 1000).toFixed(0)}s.`,
      };
    }

    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);
    const skipMatch = output.match(/(\d+) skip/);

    const passed = passMatch ? Number.parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;
    const skipped = skipMatch ? Number.parseInt(skipMatch[1], 10) : 0;

    const isPass = (exitCode === 0 || passed > 0) && failed === 0;

    return {
      file,
      passed,
      failed,
      skipped,
      status: isPass ? "pass" : "fail",
      duration,
      output: isPass ? undefined : output,
    };
  } catch (error: any) {
    return {
      file,
      passed: 0,
      failed: 0,
      skipped: 0,
      status: "error",
      duration: performance.now() - start,
      output: error.message,
    };
  }
}

async function main() {
  const concurrency = parseConcurrency();
  const timeoutMs = parseTimeoutMs();
  const fileFilter = parseFileFilter();
  let files = await collectTestFiles();

  if (fileFilter) {
    files = files.filter((file) => file.includes(fileFilter));
    if (files.length === 0) {
      console.log(`${red}No test files matching "${fileFilter}"${reset}`);
      process.exit(1);
    }
  }

  console.log(
    `${bold}Running ${files.length} test files (concurrency: ${concurrency}, timeout: ${(timeoutMs / 1000).toFixed(0)}s)${reset}\n`,
  );

  const startTime = performance.now();
  const results: TestResult[] = [];
  let completed = 0;

  const queue = [...files];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const file = queue.shift()!;
          const result = await runTestFile(file, timeoutMs);
          results.push(result);
          completed++;

          const icon =
            result.status === "pass"
              ? `${green}✓${reset}`
              : result.status === "timeout"
                ? `${yellow}⏱${reset}`
                : `${red}✗${reset}`;
          const dur = `${dim}${(result.duration / 1000).toFixed(1)}s${reset}`;
          const progress = `${dim}[${completed}/${files.length}]${reset}`;
          console.log(`${icon} ${progress} ${file} ${dur}`);
        }
      })(),
    );
  }

  await Promise.all(workers);

  const totalTime = (performance.now() - startTime) / 1000;
  const totalPassed = results.reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = results.reduce((sum, result) => sum + result.failed, 0);
  const totalSkipped = results.reduce((sum, result) => sum + result.skipped, 0);
  const timedOutFiles = results.filter((result) => result.status === "timeout");
  const failedFiles = results.filter((result) => result.status !== "pass");

  console.log(`\n${bold}Summary:${reset}`);
  console.log(`  ${green}${totalPassed} passed${reset}`);
  if (totalSkipped > 0) console.log(`  ${yellow}${totalSkipped} skipped${reset}`);
  if (totalFailed > 0) console.log(`  ${red}${totalFailed} failed${reset}`);
  if (timedOutFiles.length > 0) console.log(`  ${yellow}${timedOutFiles.length} timed out${reset}`);
  console.log(`  ${dim}${files.length} files, ${totalTime.toFixed(1)}s total${reset}`);

  if (failedFiles.length > 0) {
    console.log(`\n${red}${bold}Failed files (${failedFiles.length}):${reset}`);
    for (const failedFile of failedFiles) {
      console.log(`  ${red}✗${reset} ${failedFile.file}`);
    }

    const firstFail = failedFiles[0];
    if (firstFail.output) {
      console.log(`\n${yellow}Output from ${firstFail.file}:${reset}`);
      console.log(firstFail.output);
    }

    if (failedFiles.length > 1) {
      console.log(`\n${yellow}Run individually to see errors:${reset}`);
      console.log(`  bun test ${failedFiles[0].file}`);
    }

    process.exit(1);
  }

  console.log(`\n${green}${bold}All ${totalPassed} tests passed!${reset}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
