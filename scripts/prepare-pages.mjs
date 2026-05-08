import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";

const pagesDir = "docs";
const generatedPaths = [
  "index.html",
  "404.html",
  "manifest.webmanifest",
  "registerSW.js",
  "sw.js",
  "sw.js.map",
  "workbox-*.js",
  "assets",
  "ffmpeg-core",
];

for (const item of generatedPaths) {
  const path = join(pagesDir, item);
  if (item.includes("*")) {
    continue;
  }
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

if (existsSync(pagesDir)) {
  for (const file of readdirSync(pagesDir)) {
    if (file.startsWith("workbox-")) {
      rmSync(join(pagesDir, file), { force: true });
    }
  }
}

mkdirSync(join("public", "ffmpeg-core"), { recursive: true });

for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  const source = join("node_modules", "@ffmpeg", "core", "dist", "esm", file);
  const target = join("public", "ffmpeg-core", file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
