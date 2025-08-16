/*
  Generate human-readable reference files from public/data.js
  - docs/reference-index.md: condensed list of entities grouped by type
  - docs/research-checklist.md: expanded details with clear MISSING markers
*/

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'public', 'data.js');
const DOCS_DIR = path.join(ROOT, 'docs');
const INDEX_PATH = path.join(DOCS_DIR, 'reference-index.md');
const CHECKLIST_PATH = path.join(DOCS_DIR, 'research-checklist.md');

function readJson(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(txt);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sortByName(a, b) {
  const an = (a.name || '').toLowerCase();
  const bn = (b.name || '').toLowerCase();
  return an.localeCompare(bn);
}

function missing(value) {
  if (value == null) return 'MISSING';
  if (typeof value === 'string') return value.trim() ? value : 'MISSING';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'MISSING';
  if (typeof value === 'object') return Object.keys(value).length ? JSON.stringify(value) : 'MISSING';
  return String(value);
}

function idListToNames(ids, byId) {
  const arr = Array.isArray(ids) ? ids : [];
  const names = arr.map(id => (byId.get(id)?.name) || id).filter(Boolean);
  return names.length ? names.join(', ') : 'MISSING';
}

function formatLocation(loc) {
  if (!loc) return 'MISSING';
  const parts = [];
  if (loc.city) parts.push(loc.city);
  if (loc.country) parts.push(loc.country);
  const coord = (loc.lat != null && loc.lng != null) ? `(${loc.lat}, ${loc.lng})` : '';
  return parts.length || coord ? `${parts.join(', ')} ${coord}`.trim() : 'MISSING';
}

function buildIndex(groups) {
  const lines = [];
  lines.push('### BandScape Reference Index');
  for (const [type, list] of Object.entries(groups)) {
    const sorted = [...list].sort(sortByName);
    lines.push(`\n## ${type} (${sorted.length})`);
    for (const n of sorted) lines.push(`- ${n.name} (${n.id})`);
  }
  return lines.join('\n');
}

function buildChecklist(groups, byId) {
  const lines = [];
  lines.push('### BandScape Research Checklist');
  lines.push('Note: Fields marked MISSING need research.');

  function section(title) { lines.push(`\n## ${title}`); }

  // Bands
  section(`Bands (${groups.band.length})`);
  for (const b of [...groups.band].sort(sortByName)) {
    lines.push(`- Name: ${b.name}`);
    lines.push(`  - ID: ${b.id}`);
    lines.push(`  - Aliases: ${missing(b.aliases)}`);
    lines.push(`  - Description: ${missing(b.description)}`);
    lines.push(`  - Image: ${missing(b.image_url)}`);
    lines.push(`  - Location: ${formatLocation(b.location)}`);
    lines.push(`  - Start: ${missing(b.start_date)}  End: ${missing(b.end_date)}`);
    lines.push(`  - Origin: ${missing(b.origin)}`);
    lines.push(`  - Tags: ${idListToNames(b.tag_ids, byId)}`);
    lines.push(`  - Labels: ${idListToNames(b.label_ids, byId)}`);
    lines.push(`  - Members: ${idListToNames(b.member_ids, byId)}`);
    if (b.website_url) lines.push(`  - Website: ${b.website_url}`);
    if (b.socials) lines.push(`  - Socials: ${Object.entries(b.socials).map(([k,v])=>`${k}: ${v}`).join('; ')}`);
  }

  // Members
  section(`Members (${groups.member.length})`);
  for (const m of [...groups.member].sort(sortByName)) {
    lines.push(`- Name: ${m.name}`);
    lines.push(`  - ID: ${m.id}`);
    lines.push(`  - Aliases: ${missing(m.aliases)}`);
    lines.push(`  - Bio: ${missing(m.description)}`);
    lines.push(`  - Image: ${missing(m.image_url)}`);
    lines.push(`  - Location: ${formatLocation(m.location)}`);
    lines.push(`  - Start: ${missing(m.start_date)}  End: ${missing(m.end_date)}`);
    lines.push(`  - Tags: ${idListToNames(m.tag_ids, byId)}`);
    lines.push(`  - Bands: ${idListToNames(m.band_ids, byId)}`);
    lines.push(`  - Roles: ${missing(m.roles)}`);
    if (m.website_url) lines.push(`  - Website: ${m.website_url}`);
    if (m.socials) lines.push(`  - Socials: ${Object.entries(m.socials).map(([k,v])=>`${k}: ${v}`).join('; ')}`);
  }

  // Labels
  section(`Labels (${groups.label.length})`);
  for (const l of [...groups.label].sort(sortByName)) {
    lines.push(`- Name: ${l.name}`);
    lines.push(`  - ID: ${l.id}`);
    lines.push(`  - Aliases: ${missing(l.aliases)}`);
    lines.push(`  - Description: ${missing(l.description)}`);
    lines.push(`  - Location: ${formatLocation(l.location)}`);
    lines.push(`  - Artists: ${idListToNames(l.artist_ids, byId)}`);
    if (l.website_url) lines.push(`  - Website: ${l.website_url}`);
    if (l.socials) lines.push(`  - Socials: ${Object.entries(l.socials).map(([k,v])=>`${k}: ${v}`).join('; ')}`);
  }

  // Genres
  section(`Genres (${groups.genre.length})`);
  for (const g of [...groups.genre].sort(sortByName)) {
    lines.push(`- ${g.name} (${g.id})`);
  }

  // Tags
  section(`Tags (${groups.tag.length})`);
  for (const t of [...groups.tag].sort(sortByName)) {
    lines.push(`- ${t.name} (${t.id})`);
  }

  // Venues
  section(`Venues (${groups.venue.length})`);
  for (const v of [...groups.venue].sort(sortByName)) {
    lines.push(`- Name: ${v.name || v.id}`);
    lines.push(`  - ID: ${v.id}`);
    lines.push(`  - Location: ${formatLocation(v.location)}`);
  }

  // Events
  section(`Events (${groups.event.length})`);
  for (const e of [...groups.event].sort(sortByName)) {
    lines.push(`- Name: ${e.name || e.id}`);
    lines.push(`  - ID: ${e.id}`);
    lines.push(`  - Date(s): Start ${missing(e.start_date)} End ${missing(e.end_date)}`);
    lines.push(`  - Location: ${formatLocation(e.location)}`);
  }

  return lines.join('\n');
}

function main() {
  const { nodes } = readJson(DATA_PATH);
  const byId = new Map(nodes.map(n => [n.id, n]));

  const groups = { band: [], member: [], label: [], genre: [], tag: [], venue: [], event: [] };
  for (const n of nodes) {
    if (groups[n.type]) groups[n.type].push(n);
  }

  ensureDir(DOCS_DIR);
  fs.writeFileSync(INDEX_PATH, buildIndex(groups), 'utf8');
  fs.writeFileSync(CHECKLIST_PATH, buildChecklist(groups, byId), 'utf8');

  console.log(`Wrote:\n- ${INDEX_PATH}\n- ${CHECKLIST_PATH}`);
}

try { main(); } catch (e) {
  console.error('Generation failed:', e.message);
  process.exit(1);
}


