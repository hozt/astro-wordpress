import { access, cp, mkdir, readdir, writeFile } from "node:fs/promises";

// Cloudflare Pages "advanced mode" requires a `_worker.js` at the project root.
// Astro's Cloudflare adapter outputs the Worker entry at `dist/server/entry.mjs`,
// so we create a tiny re-export shim at `dist/_worker.js` and copy `_routes.json`
// so Pages routes all requests (including POST /api/*) through the Worker.

await mkdir("dist", { recursive: true });

try {
  await access("dist/server/entry.mjs");
  await access("dist/client/index.html");
} catch {
  console.error("Expected Astro Cloudflare output missing. Did `astro build` run?");
  process.exit(1);
}

// Flatten `dist/client/*` into `dist/*` so Pages' `env.ASSETS` can find `/index.html`, `/_astro/*`, etc.
// Astro's Cloudflare adapter emits client assets under `dist/client`, but the generated Worker expects
// assets to live at the build output root.
const clientEntries = await readdir("dist/client", { withFileTypes: true });
await Promise.all(
  clientEntries.map((entry) =>
    cp(`dist/client/${entry.name}`, `dist/${entry.name}`, {
      recursive: entry.isDirectory(),
      force: true,
    })
  )
);

await writeFile(
  "dist/_worker.js",
  [
    'import handler from "./server/entry.mjs";',
    "",
    "function runHandler(request, env, ctx) {",
    '  if (typeof handler === "function") return handler(request, env, ctx);',
    '  if (handler && typeof handler.fetch === "function") return handler.fetch(request, env, ctx);',
    '  return new Response("Missing Worker handler export", { status: 500 });',
    "}",
    "",
    "export default {",
    "  fetch(request, env, ctx) {",
    "    const { pathname } = new URL(request.url);",
    '    if (pathname === "/__worker_check") return new Response("ok");',
    "    return runHandler(request, env, ctx);",
    "  },",
    "};",
    "",
  ].join("\n"),
  "utf8"
);

// Ensure routing config is deployed with the output (Pages reads it from the build output root).
await cp("_routes.json", "dist/_routes.json");

console.log("Pages postbuild: flattened dist/client -> dist, wrote dist/_worker.js and dist/_routes.json");
