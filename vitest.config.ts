import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify("0.2.0-test"),
    __APP_COMMIT__: JSON.stringify("test"),
    __REPO_URL__: JSON.stringify(
      "https://github.com/baditaflorin/shaderwave-studio",
    ),
    __PAYPAL_URL__: JSON.stringify(
      "https://www.paypal.com/paypalme/florinbadita",
    ),
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/.git/**", "tests/e2e/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
