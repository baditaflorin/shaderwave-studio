import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync("docs/index.html")) {
  copyFileSync("docs/index.html", "docs/404.html");
}

let commit = "dev";
try {
  commit = execFileSync(
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
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    commit = "dev";
  }
}

const build = {
  version: JSON.parse(readFileSync("package.json", "utf8")).version,
  commit,
  builtAt: new Date().toISOString(),
};

writeFileSync("docs/build.json", `${JSON.stringify(build, null, 2)}\n`);
