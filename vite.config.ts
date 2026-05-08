import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version: string;
};

function gitCommit() {
  try {
    return execFileSync(
      "git",
      ["log", "-1", "--format=%h", "--", ".", ":(exclude)docs/**"],
      {
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .toString()
      .trim();
  } catch {
    try {
      return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      return "dev";
    }
  }
}

export default defineConfig({
  base: "/shaderwave-studio/",
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Shaderwave Studio",
        short_name: "Shaderwave",
        description:
          "Drop an MP3, bind FFT bands to WebGPU shaders, preview visuals, and export MP4 in the browser.",
        theme_color: "#111827",
        background_color: "#f8fafc",
        display: "standalone",
        scope: "/shaderwave-studio/",
        start_url: "/shaderwave-studio/",
        icons: [
          {
            src: "/shaderwave-studio/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,wasm,json}"],
        globIgnores: ["**/ffmpeg-core/**", "build.json"],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        navigateFallback: "/shaderwave-studio/index.html",
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitCommit()),
    __REPO_URL__: JSON.stringify(
      "https://github.com/baditaflorin/shaderwave-studio",
    ),
    __PAYPAL_URL__: JSON.stringify(
      "https://www.paypal.com/paypalme/florinbadita",
    ),
  },
  build: {
    outDir: "docs",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: true,
  },
});
