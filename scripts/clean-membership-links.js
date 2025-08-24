// Remove inconsistent membership links where neither side references the other in arrays
// Usage: node scripts/clean-membership-links.js

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

  const byId = new Map(nodes.map(n => [n.id, n]));
  const isMemberOf = (memberId, bandId) => {
    const m = byId.get(memberId);
    const b = byId.get(bandId);
    if (!m || !b) return false;
    const mHas = Array.isArray(m.band_ids) && m.band_ids.includes(bandId);
    const bHas = Array.isArray(b.member_ids) && b.member_ids.includes(memberId);
    return mHas || bHas;
  };

  const kept = [];
  const removed = [];
  for (const l of links) {
    if (l.type !== 'membership') { kept.push(l); continue; }
    if (isMemberOf(l.source, l.target)) { kept.push(l); continue; }
    removed.push(l);
  }

  const backup = DATA_PATH + '.bak.cleanMembership';
  fs.writeFileSync(backup, raw, 'utf8');
  writeJson(DATA_PATH, { nodes, links: kept });
  console.log(`Removed inconsistent membership links=${removed.length}. Kept=${kept.length}. Backup at ${backup}`);
  if (removed.length) {
    console.log('Sample removed:');
    for (const l of removed.slice(0, 20)) console.log(l);
  }
}

try { main(); } catch (e) {
  console.error('Clean failed:', e.message);
  process.exit(1);
}


