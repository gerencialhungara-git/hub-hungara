import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.mjs",
  minify: true,
  sourcemap: true,
  // Fica de fora do bundle: é dev-only e a Lambda não precisa.
  external: ["@hono/node-server"],
  banner: {
    // Bibliotecas em CommonJS (bcryptjs, postgres) usam require(); em ESM ele não existe.
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  define: { "process.env.APP_VERSION": JSON.stringify(process.env.APP_VERSION ?? "dev") },
  logLevel: "info",
});
