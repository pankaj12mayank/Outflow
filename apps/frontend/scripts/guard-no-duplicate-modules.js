/**
 * Fail fast when duplicate .ts/.tsx modules exist (webpack resolves one arbitrarily → runtime crashes).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "app");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const groups = new Map();

for (const file of walk(ROOT)) {
  const ext = path.extname(file);
  if (ext !== ".ts" && ext !== ".tsx") continue;
  const dir = path.dirname(file);
  const base = path.basename(file, ext);
  const key = `${dir}::${base}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(ext);
}

const duplicates = [...groups.entries()].filter(([, exts]) => exts.includes(".ts") && exts.includes(".tsx"));

if (duplicates.length > 0) {
  console.error("\n[Outflo] Duplicate module pairs (.ts + .tsx) break webpack at runtime:\n");
  for (const [key] of duplicates) {
    const [dir, base] = key.split("::");
    console.error(`  - ${path.relative(path.join(__dirname, ".."), dir)}/${base}.{ts,tsx}`);
  }
  console.error("\nRemove or rename one file in each pair, then run again.\n");
  process.exit(1);
}
