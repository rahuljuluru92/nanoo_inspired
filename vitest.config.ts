import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests live next to the code. The Playwright specs in e2e/ are run by `npm run e2e`, never by Vitest.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], exclude: ["node_modules/**", ".next/**", "e2e/**", "test-results/**", "playwright-report/**"] },
});
