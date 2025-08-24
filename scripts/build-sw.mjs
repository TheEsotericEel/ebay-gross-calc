import { build } from "esbuild";

await build({
  entryPoints: ["src/sw.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome110"],
  outfile: "dist/sw.js",
  sourcemap: false,
  logLevel: "info",
});
