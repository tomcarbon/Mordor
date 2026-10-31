import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Route chunks carry the route name so the smoke test can prove what each page fetched. */
function chunkName(chunk: { name: string; facadeModuleId?: string | null }): string {
  const route = chunk.facadeModuleId?.match(/routes\/([^/]+)\/index\.tsx$/)?.[1];
  return route ? `assets/route-${route}-[hash].js` : "assets/[name]-[hash].js";
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { rollupOptions: { output: { chunkFileNames: chunkName } } },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
