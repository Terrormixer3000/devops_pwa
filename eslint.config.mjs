import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Temporaere Git-Worktrees fuer parallele Agent-Ausfuehrung
    ".claude/**",
    // Service Worker Dateien laufen im SW-Scope (generiert/manuell), nicht im App-Code-Lint.
    "public/sw-custom.js",
    "public/sw.js",
    "public/workbox-*.js",
  ]),
]);

export default eslintConfig;
