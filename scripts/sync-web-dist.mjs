import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDist = join(repoRoot, "apps/frontend/dist");
const rootDist = join(repoRoot, "dist");

function hasIndex(dir) {
  return existsSync(join(dir, "index.html"));
}

const source = hasIndex(frontendDist) ? frontendDist : hasIndex(rootDist) ? rootDist : null;
if (!source) {
  console.error("Vite did not write index.html to apps/frontend/dist or ./dist");
  process.exit(1);
}

if (source !== rootDist) {
  rmSync(rootDist, { recursive: true, force: true });
  mkdirSync(rootDist, { recursive: true });
  cpSync(source, rootDist, { recursive: true });
}

console.log(`Vercel output directory ready: ${rootDist}`);
