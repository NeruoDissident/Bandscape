// Repair band.member_ids and member.band_ids using canonical membership links
// Strategy:
// - If membership links exist, treat them as ground truth
// - Rebuild band.member_ids and member.band_ids from links
// - Remove any membership links with wrong endpoint types
// - Report changes per band and member
// Usage: node scripts/repair-membership-arrays.js

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
  const bands = nodes.filter(n => n.type === 'band');
  const members = nodes.filter(n => n.type === 'member');

  // Build canonical membership map from links
  const memberToBands = new Map();
  const bandToMembers = new Map();
  const keptLinks = [];
  let removedBadLinks = 0;
  for (const l of links) {
    if (l.type !== 'membership') { keptLinks.push(l); continue; }
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    if (!s || !t || s.type !== 'member' || t.type !== 'band') {
      removedBadLinks++;
      continue;
    }
    if (!memberToBands.has(s.id)) memberToBands.set(s.id, new Set());
    if (!bandToMembers.has(t.id)) bandToMembers.set(t.id, new Set());
    memberToBands.get(s.id).add(t.id);
    bandToMembers.get(t.id).add(s.id);
    keptLinks.push(l);
  }

  const changes = { bandFixed: 0, memberFixed: 0 };
  const bandReports = [];
  for (const b of bands) {
    const before = Array.isArray(b.member_ids) ? b.member_ids.slice() : [];
    const afterSet = bandToMembers.get(b.id) || new Set();
    const after = Array.from(afterSet);
    // Only update if different to avoid churn
    const same = before.length === after.length && before.every(x => after.includes(x));
    if (!same) {
      b.member_ids = after;
      changes.bandFixed++;
      bandReports.push({ band: b.name, bandId: b.id, before: before.length, after: after.length });
    }
  }

  const memberReports = [];
  for (const m of members) {
    const before = Array.isArray(m.band_ids) ? m.band_ids.slice() : [];
    const afterSet = memberToBands.get(m.id) || new Set();
    const after = Array.from(afterSet);
    const same = before.length === after.length && before.every(x => after.includes(x));
    if (!same) {
      m.band_ids = after;
      changes.memberFixed++;
      memberReports.push({ member: m.name, memberId: m.id, before: before.length, after: after.length });
    }
  }

  const out = { nodes, links: keptLinks };
  const backup = DATA_PATH + '.bak.repairMembership';
  fs.writeFileSync(backup, raw, 'utf8');
  writeJson(DATA_PATH, out);

  console.log(`Repaired membership arrays. Bands fixed=${changes.bandFixed}, Members fixed=${changes.memberFixed}, Removed bad membership links=${removedBadLinks}`);
  console.log('Sample band changes:');
  for (const r of bandReports.slice(0, 20)) console.log(r);
  console.log('Sample member changes:');
  for (const r of memberReports.slice(0, 20)) console.log(r);
}

try { main(); } catch (e) {
  console.error('Repair failed:', e.message);
  process.exit(1);
}


