import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyMarker = fileURLToPath(
  new URL(
    "./node_modules/next/dist/compiled/server-only/empty.js",
    import.meta.url,
  ),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": sourceDirectory,
      "server-only": serverOnlyMarker,
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
      "tests/component/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/setup.ts"],
  },
});
