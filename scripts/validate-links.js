// Validate links in public/data.js and report anomalies
// Usage: node scripts/validate-links.js

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function main() {
  const data = readJson(DATA_PATH);
  const nodes = data.nodes || [];
  const links = data.links || [];
  const byId = new Map(nodes.map(n => [n.id, n]));

  const dupMap = new Map();
  const issues = [];
  let ok = 0;

  const typeRules = {
    membership: (s, t) => (s?.type === 'member' && t?.type === 'band'),
    label_signing: (s, t) => (s?.type === 'band' && t?.type === 'label'),
    hosted_at: (s, t) => (s?.type === 'event' && t?.type === 'venue'),
    performed_at: (s, t) => (s?.type === 'band' && t?.type === 'event')
  };

  for (const l of links) {
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    const key = `${l.type}|${l.source}|${l.target}`;
    dupMap.set(key, (dupMap.get(key) || 0) + 1);

    if (!s || !t) {
      issues.push({ id: l.id, type: l.type, reason: 'missing endpoint', source: l.source, target: l.target });
      continue;
    }
    if (!l.type || !typeRules[l.type]) {
      issues.push({ id: l.id, type: l.type, reason: 'unknown link type', source: l.source, target: l.target });
      continue;
    }
    if (!typeRules[l.type](s, t)) {
      issues.push({ id: l.id, type: l.type, reason: `type mismatch (src=${s.type}, tgt=${t.type})`, source: l.source, target: l.target });
      continue;
    }
    ok++;
  }

  const dups = Array.from(dupMap.entries()).filter(([, c]) => c > 1).map(([k, c]) => ({ key: k, count: c }));

  console.log(`Nodes=${nodes.length}, Links=${links.length}, OK=${ok}, Issues=${issues.length}, Duplicates=${dups.length}`);
  if (dups.length) {
    console.log('Duplicate links (type|source|target -> count):');
    for (const d of dups.slice(0, 50)) console.log(`${d.key} -> ${d.count}`);
  }
  if (issues.length) {
    console.log('Sample issues:');
    for (const it of issues.slice(0, 50)) console.log(it);
  }
}

try { main(); } catch (e) {
  console.error('Validation failed:', e.message);
  process.exit(1);
}


