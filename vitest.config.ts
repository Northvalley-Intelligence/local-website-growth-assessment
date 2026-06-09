import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@northvalleyintel/assessment-shared": new URL(
        "./packages/shared/src/index.ts",
        import.meta.url
      ).pathname,
      "@northvalleyintel/assessment-worker": new URL(
        "./apps/worker/src/index.ts",
        import.meta.url
      ).pathname
    }
  },
  test: {
    exclude: [
      "tests/integration/**/*.test.ts",
      "**/node_modules/**",
      "**/.next/**",
      "**/.open-next/**",
      "**/.wrangler/**",
      "**/dist/**"
    ],
    globals: false,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"]
  }
});
