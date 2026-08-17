import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findRepoRoot() {
  const starts = [dirname(fileURLToPath(import.meta.url)), process.cwd()];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
      if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error("Could not find repo root (pnpm-workspace.yaml)");
}

function hasIndex(dir) {
  return existsSync(join(dir, "index.html"));
}

function copyDist(source, dest) {
  if (source === dest) {
    console.log(`Vercel output already at ${dest}`);
    return;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
  console.log(`Copied web build to ${dest}`);
}

const repoRoot = findRepoRoot();
const frontendDist = join(repoRoot, "apps/frontend/dist");
const rootDist = join(repoRoot, "dist");
const apiDist = join(repoRoot, "apps/api/dist");
const cwdDist = join(process.cwd(), "dist");

const source = hasIndex(frontendDist) ? frontendDist : hasIndex(rootDist) ? rootDist : null;
if (!source) {
  console.error("Vite did not write index.html to apps/frontend/dist or ./dist");
  process.exit(1);
}

for (const dest of new Set([rootDist, apiDist, cwdDist])) {
  copyDist(source, dest);
}
