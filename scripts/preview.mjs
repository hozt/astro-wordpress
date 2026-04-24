import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { rm } from "node:fs/promises";

async function rmIfExists(path) {
  try {
    await rm(path, { force: true });
  } catch {
    // ignore
  }
}

// Astro's Cloudflare adapter sometimes leaves a "redirected Wrangler configuration"
// that breaks `wrangler pages dev` locally (e.g. reserved ASSETS binding in Pages).
await rmIfExists("dist/server/wrangler.json");
await rmIfExists(".wrangler/deploy/config.json");

try {
  await access("dist/server/entry.mjs");
  await access("dist/index.html");
} catch {
  console.error("Missing build output in `dist/`. Run `npm run build-local` first.");
  process.exit(1);
}

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "wrangler",
    "dev",
    "dist/server/entry.mjs",
    "--assets",
    "dist",
  ],
  { stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 1));
