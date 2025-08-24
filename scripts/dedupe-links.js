// Remove duplicate links (same type|source|target) in public/data.js, preserving the first
// Usage: node scripts/dedupe-links.js

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2), 'utf8'); }

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const nodes = data.nodes || [];
  const links = data.links || [];

  const kept = [];
  const seen = new Map();
  let removed = 0;

  for (const l of links) {
    const type = l.type || '';
    const src = l.source;
    const tgt = l.target;
    const key = `${type}|${src}|${tgt}`;
    if (!seen.has(key)) {
      seen.set(key, l);
      kept.push(l);
    } else {
      // If the existing kept link has an empty label but this duplicate has one, carry it over
      const first = seen.get(key);
      if ((!first.label || String(first.label).trim() === '') && (l.label && String(l.label).trim() !== '')) {
        first.label = l.label;
      }
      removed += 1;
    }
  }

  const out = { nodes, links: kept };
  const backup = DATA_PATH + '.bak.dedupe';
  fs.writeFileSync(backup, raw, 'utf8');
  writeJson(DATA_PATH, out);

  console.log(`De-duplicated links. Removed=${removed}. New totals: nodes=${nodes.length}, links=${kept.length}`);
}

try { main(); } catch (e) {
  console.error('Dedup failed:', e.message);
  process.exit(1);
}


