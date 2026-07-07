import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

try {
  await access("dist/index.html");
} catch {
  console.error("Missing build output in `dist/`. Run `npm run build-local` first.");
  process.exit(1);
}

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["wrangler", "pages", "dev", "dist"],
  { stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 1));
