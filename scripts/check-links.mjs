import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const htmlFiles = await walk(root);
const failures = [];

for (const file of htmlFiles.filter((name) => extname(name) === '.html')) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(value)) continue;
    const clean = value.split(/[?#]/)[0];
    if (!clean) continue;
    const candidate = clean.startsWith('/') ? join(root, clean) : normalize(join(dirname(file), clean));
    const variants = [candidate, `${candidate}.html`, join(candidate, 'index.html')];
    let found = false;
    for (const variant of variants) {
      try { await access(variant); found = true; break; } catch {}
    }
    if (!found) failures.push(`${relative(root, file)} -> ${value}`);
  }
}

if (failures.length) {
  console.error(`Broken internal links (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} generated files: no broken internal links.`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}
