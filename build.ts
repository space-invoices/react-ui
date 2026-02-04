#!/usr/bin/env bun
import path from "node:path";
import { build } from "bun";
import plugin from "bun-plugin-tailwind";

// Print help text if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.exit(0);
}

const outdir = path.join(process.cwd(), "dist");

// Scan for all HTML files in the project
const entrypoints = [...new Bun.Glob("**.html").scanSync("src")]
  .map((a) => path.resolve("src", a))
  .filter((dir) => !dir.includes("node_modules"));

// Build all the HTML files
await build({
  entrypoints,
  outdir,
  plugins: [plugin],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
