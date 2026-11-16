import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/fikir-geri-donusumu/",
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
