// Build missing links in public/data.js
// - membership (member ↔ band)
// - label_signing (band ↔ label)
// - performed_at (band ↔ event) inferred by event.description name matching
// Usage: node scripts/build-links.js

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2), 'utf8'); }
function getMaxNumericId(items, prefix) {
  let maxId = 0;
  for (const it of items) {
    const id = it && it.id;
    if (typeof id !== 'string' || !id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isFinite(n)) maxId = Math.max(maxId, n);
  }
  return maxId;
}
function normalizeName(s) { return String(s || '').trim().toLowerCase(); }

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')      // normalize dashes
    .replace(/['’]/g, "'")                 // apostrophes
    .replace(/[^a-z0-9\s\-\.&]/g, ' ')     // keep letters, digits, spaces, dash, dot, ampersand
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBandNameIndex(bands) {
  const entries = [];
  const stop = new Set(['live']); // avoid overly generic names
  for (const b of bands) {
    const names = new Set();
    if (b.name) names.add(b.name);
    if (Array.isArray(b.aliases)) for (const a of b.aliases) if (a) names.add(a);
    const variants = [];
    for (const nm of names) {
      const key = normalizeText(nm);
      if (!key || stop.has(key)) continue;
      variants.push(key);
    }
    if (variants.length) entries.push({ id: b.id, name: b.name, variants });
  }
  return entries;
}

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const nodes = data.nodes || [];
  const links = data.links || [];

  const byId = new Map(nodes.map(n => [n.id, n]));
  const bands = nodes.filter(n => n.type === 'band');
  const members = nodes.filter(n => n.type === 'member');
  const labels = nodes.filter(n => n.type === 'label');
  const events = nodes.filter(n => n.type === 'event');

  let nextLink = getMaxNumericId(links, 'link_') + 1;
  const linkKey = new Set(links.map(l => `${l.type}|${l.source}|${l.target}`));

  let addedMembership = 0;
  let addedLabels = 0;
  let addedPerformedAt = 0;

  // membership from member.band_ids and band.member_ids
  for (const m of members) {
    const bandIds = Array.isArray(m.band_ids) ? m.band_ids : [];
    for (const bid of bandIds) {
      if (!byId.has(bid)) continue;
      const key = `membership|${m.id}|${bid}`;
      if (linkKey.has(key)) continue;
      links.push({ id: `link_${nextLink++}`, type: 'membership', source: m.id, target: bid, label: '', start_date: null, end_date: null });
      linkKey.add(key);
      addedMembership++;
    }
  }
  for (const b of bands) {
    const memberIds = Array.isArray(b.member_ids) ? b.member_ids : [];
    for (const mid of memberIds) {
      if (!byId.has(mid)) continue;
      const key = `membership|${mid}|${b.id}`;
      if (linkKey.has(key)) continue;
      links.push({ id: `link_${nextLink++}`, type: 'membership', source: mid, target: b.id, label: '', start_date: null, end_date: null });
      linkKey.add(key);
      addedMembership++;
    }
  }

  // label_signing from band.label_ids and label.artist_ids
  for (const b of bands) {
    const labelIds = Array.isArray(b.label_ids) ? b.label_ids : [];
    for (const lid of labelIds) {
      if (!byId.has(lid)) continue;
      const key = `label_signing|${b.id}|${lid}`;
      if (linkKey.has(key)) continue;
      links.push({ id: `link_${nextLink++}`, type: 'label_signing', source: b.id, target: lid, label: '', start_date: null, end_date: null });
      linkKey.add(key);
      addedLabels++;
    }
  }
  for (const l of labels) {
    const artistIds = Array.isArray(l.artist_ids) ? l.artist_ids : [];
    for (const bid of artistIds) {
      if (!byId.has(bid)) continue;
      const key = `label_signing|${bid}|${l.id}`;
      if (linkKey.has(key)) continue;
      links.push({ id: `link_${nextLink++}`, type: 'label_signing', source: bid, target: l.id, label: '', start_date: null, end_date: null });
      linkKey.add(key);
      addedLabels++;
    }
  }

  // performed_at from event.description matching
  const bandIdx = buildBandNameIndex(bands);
  const eventReport = [];
  for (const ev of events) {
    const desc = [ev.name, ev.description].filter(Boolean).join(' \u2013 ');
    const text = normalizeText(desc);
    const matched = [];
    for (const b of bandIdx) {
      // require any variant to be present as a whole-word-ish match
      const hit = b.variants.some(v => {
        const patt = new RegExp(`(^|[^a-z0-9])${v}([^a-z0-9]|$)`);
        return patt.test(text);
      });
      if (hit) matched.push(b.id);
    }
    let addedForEvent = 0;
    for (const bid of matched) {
      const key = `performed_at|${bid}|${ev.id}`;
      if (linkKey.has(key)) continue;
      links.push({ id: `link_${nextLink++}`, type: 'performed_at', source: bid, target: ev.id, label: '', start_date: null, end_date: null });
      linkKey.add(key);
      addedPerformedAt++;
      addedForEvent++;
    }
    eventReport.push({ event: ev.name, eventId: ev.id, added: addedForEvent });
  }

  const backup = DATA_PATH + '.bak.links';
  fs.writeFileSync(backup, JSON.stringify(data, null, 2), 'utf8');
  writeJson(DATA_PATH, { nodes, links });

  console.log(`Links added: membership=${addedMembership}, label_signing=${addedLabels}, performed_at=${addedPerformedAt}. Totals: nodes=${nodes.length}, links=${links.length}`);
  const summary = eventReport.map(r => `${r.eventId} (${r.event}): +${r.added}`).join('\n');
  console.log('Event linking summary:\n' + summary);
}

try { main(); } catch (e) {
  console.error('Build links failed:', e.message);
  process.exit(1);
}


