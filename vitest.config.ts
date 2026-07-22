import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    // Everything under test is pure logic — no DOM needed, so no jsdom cost.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
