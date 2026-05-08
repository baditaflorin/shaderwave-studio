import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync("docs/index.html")) {
  copyFileSync("docs/index.html", "docs/404.html");
}

function gitValue(args, fallback) {
  try {
    return execFileSync("git", args, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const sourceLogPathspec = ["log", "-1", "--", ".", ":(exclude)docs/**"];

let commit = gitValue(
  ["log", "-1", "--format=%h", "--", ".", ":(exclude)docs/**"],
  "dev",
);
if (commit === "dev") {
  commit = gitValue(["rev-parse", "--short", "HEAD"], "dev");
}

const builtAt = gitValue(
  ["log", "-1", "--format=%cI", "--", ".", ":(exclude)docs/**"],
  new Date(0).toISOString(),
);

try {
  execFileSync("git", sourceLogPathspec, {
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  commit = gitValue(["rev-parse", "--short", "HEAD"], "dev");
}

const build = {
  version: JSON.parse(readFileSync("package.json", "utf8")).version,
  commit,
  builtAt,
};

writeFileSync("docs/build.json", `${JSON.stringify(build, null, 2)}\n`);
