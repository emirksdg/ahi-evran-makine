import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/ahi-evran-makine/",
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
