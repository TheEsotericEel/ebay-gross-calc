// scripts/build.mjs
import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const proj = join(root, "..");
const out = join(proj, "dist");

await mkdir(out, { recursive: true });
await cp(join(proj, "public"), out, { recursive: true }).catch(() => {});
await cp(join(proj, "src", "popup", "index.html"), join(out, "popup", "index.html")).catch(() => {});
await cp(join(proj, "src", "options", "index.html"), join(out, "options", "index.html")).catch(() => {});

// 1) ESM for pages (popup/options), SW, worker
await build({
  entryPoints: {
    "popup/popup": join(proj, "src/popup/popup.ts"),
    "options/options": join(proj, "src/options/options.ts"),
    "workers/background": join(proj, "src/workers/background.ts"),
    "workers/calcWorker": join(proj, "src/workers/calcWorker.ts")
  },
  outdir: out,
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: false,
  minify: false
});

// 2) IIFE for content scripts (must NOT be modules)
await build({
  entryPoints: {
    "content/content": join(proj, "src/content/content.ts")
  },
  outdir: out,
  bundle: true,
  format: "iife",
  target: "es2022",
  sourcemap: false,
  minify: false
});

// manifest + placeholder icons
await cp(join(proj, "manifest.json"), join(out, "manifest.json"));
for (const f of ["icon16.png", "icon48.png", "icon128.png"]) {
  await writeFile(join(out, f), "");
}

// fix HTML script paths
for (const p of ["popup/index.html", "options/index.html"]) {
  const file = join(out, p);
  const html = await readFile(file, "utf8");
  const fixed = html
    .replace(`src="popup.js"`, `src="popup/popup.js"`)
    .replace(`src="options.js"`, `src="options/options.js"`);
  await writeFile(file, fixed);
}
console.log("Built to dist/");
