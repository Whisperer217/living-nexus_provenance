import { defineConfig } from "vitest/config";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["client/src/design-system/platform.harmonicbar.test.tsx"],
  },
});
