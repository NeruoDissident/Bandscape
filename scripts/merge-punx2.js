/*
  Merge additional band/member data from PUNX2.html (Cytoscape arrays)
  into public/data.js (JSON schema: { nodes, links }).

  - Extracts const nodes = [...] and const edges = [...] from HTML
  - Converts to our schema, creating missing nodes and membership links
  - Avoids duplicates by name (for nodes) and by (sourceId,targetId,type)
  - Updates band.member_ids and member.band_ids
*/

import fs from 'fs';
import path from 'path';

const WORKDIR = process.cwd();
const DATA_PATH = path.join(WORKDIR, 'public', 'data.js');
const PUNX2_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'OneDrive',
  'Desktop',
  'Current Projrcts',
  'PUNX2.html'
);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function parseJsonFileStrict(text, fileLabel) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to JSON.parse ${fileLabel}: ${err.message}`);
  }
}

function extractArrayFromHtml(html, varName) {
  const regex = new RegExp(`const\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const match = html.match(regex);
  if (!match) throw new Error(`Could not find array for ${varName} in PUNX2.html`);
  const arrayJs = match[1];
  // Evaluate the JS array safely
  try {
    // eslint-disable-next-line no-new-func
    const arr = new Function(`return (${arrayJs});`)();
    if (!Array.isArray(arr)) throw new Error(`${varName} is not an array`);
    return arr;
  } catch (err) {
    throw new Error(`Failed to evaluate ${varName} array: ${err.message}`);
  }
}

function getMaxNumericId(nodes, prefix) {
  let maxId = 0;
  for (const n of nodes) {
    if (typeof n.id !== 'string') continue;
    if (n.id.startsWith(prefix)) {
      const num = Number(n.id.slice(prefix.length));
      if (Number.isFinite(num)) maxId = Math.max(maxId, num);
    }
  }
  return maxId;
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function parseYearsToStartEnd(years) {
  if (!years || typeof years !== 'string') return { start_date: null, end_date: null };
  const txt = years.replace(/\s/g, '');
  // Match first range like 1999–2003 or 2000-present or single 1989
  const m = txt.match(/(\d{4})(?:[–-](\d{4}|present))?/i);
  if (!m) return { start_date: null, end_date: null };
  const start = m[1];
  const end = m[2] ? (m[2].toLowerCase() === 'present' ? null : m[2]) : (m[1] || null);
  return { start_date: start || null, end_date: end };
}

function ensureArrays(obj, keys) {
  for (const k of keys) {
    if (!Array.isArray(obj[k])) obj[k] = [];
  }
}

function main() {
  const dataText = readText(DATA_PATH);
  const existing = parseJsonFileStrict(dataText, 'public/data.js');
  const html = readText(PUNX2_PATH);

  const cyNodes = extractArrayFromHtml(html, 'nodes');
  const cyEdges = extractArrayFromHtml(html, 'edges');

  const nodes = existing.nodes || [];
  const links = existing.links || [];

  // Build name->nodeId map by type
  const bandNameToId = new Map();
  const memberNameToId = new Map();
  for (const n of nodes) {
    if (!n || !n.type || !n.name) continue;
    const key = normalizeName(n.name);
    if (n.type === 'band') bandNameToId.set(key, n.id);
    if (n.type === 'member') memberNameToId.set(key, n.id);
  }

  let nextBandNum = getMaxNumericId(nodes, 'band_') + 1;
  let nextMemberNum = getMaxNumericId(nodes, 'member_') + 1;
  let nextLinkNum = getMaxNumericId(links, 'link_') + 1;

  const createdBands = [];
  const createdMembers = [];
  const createdLinks = [];

  // First, create any missing nodes
  for (const node of cyNodes) {
    const { id: name, type, years } = (node && node.data) || {};
    if (!name || !type) continue;
    const key = normalizeName(name);
    const { start_date, end_date } = parseYearsToStartEnd(years);

    if (type === 'band') {
      if (bandNameToId.has(key)) continue;
      const id = `band_${nextBandNum++}`;
      const bandNode = {
        id,
        type: 'band',
        name,
        aliases: [],
        description: '',
        image_url: '',
        location: { lat: null, lng: null, city: '', country: '' },
        start_date,
        end_date,
        origin: '',
        tag_ids: [],
        label_ids: [],
        member_ids: []
      };
      nodes.push(bandNode);
      bandNameToId.set(key, id);
      createdBands.push(id);
    } else if (type === 'member') {
      if (memberNameToId.has(key)) continue;
      const id = `member_${nextMemberNum++}`;
      const memberNode = {
        id,
        type: 'member',
        name,
        aliases: [],
        description: '',
        image_url: '',
        location: { lat: null, lng: null, city: '', country: '' },
        start_date,
        end_date,
        tag_ids: [],
        band_ids: [],
        roles: []
      };
      nodes.push(memberNode);
      memberNameToId.set(key, id);
      createdMembers.push(id);
    }
  }

  // Helper: quick lookup by id
  const idToNode = new Map(nodes.map(n => [n.id, n]));

  // Build a fast duplicate check for links by (type,source,target)
  const linkKeySet = new Set(
    links.map(l => `${l.type || 'membership'}|${l.source}|${l.target}`)
  );

  // Process edges as membership links
  for (const edge of cyEdges) {
    const { source, target, label } = (edge && edge.data) || {};
    if (!source || !target) continue;
    // Determine direction: member -> band
    const sourceKey = normalizeName(source);
    const targetKey = normalizeName(target);
    let memberId = memberNameToId.get(sourceKey);
    let bandId = bandNameToId.get(targetKey);

    // If flipped, try the opposite
    if (!memberId || !bandId) {
      const altMemberId = memberNameToId.get(targetKey);
      const altBandId = bandNameToId.get(sourceKey);
      if (altMemberId && altBandId) {
        memberId = altMemberId;
        bandId = altBandId;
      }
    }

    if (!memberId || !bandId) {
      continue; // skip non member<->band relations
    }

    const key = `membership|${memberId}|${bandId}`;
    if (linkKeySet.has(key)) {
      continue; // duplicate
    }

    const id = `link_${nextLinkNum++}`;
    const link = {
      id,
      type: 'membership',
      source: memberId,
      target: bandId,
      label: label || '',
      start_date: null,
      end_date: null
    };
    links.push(link);
    linkKeySet.add(key);
    createdLinks.push(id);

    // Update cross references
    const memberNode = idToNode.get(memberId);
    const bandNode = idToNode.get(bandId);
    if (memberNode) {
      ensureArrays(memberNode, ['band_ids', 'roles']);
      if (!memberNode.band_ids.includes(bandId)) memberNode.band_ids.push(bandId);
    }
    if (bandNode) {
      ensureArrays(bandNode, ['member_ids']);
      if (!bandNode.member_ids.includes(memberId)) bandNode.member_ids.push(memberId);
    }
  }

  const merged = { nodes, links };

  // Backup
  writeText(DATA_PATH + '.bak', dataText);
  writeText(DATA_PATH, JSON.stringify(merged, null, 2));

  console.log(
    `Merged. Created bands=${createdBands.length}, members=${createdMembers.length}, links=${createdLinks.length}. Total nodes=${nodes.length}, links=${links.length}`
  );
}

try {
  main();
} catch (err) {
  console.error('Merge failed:', err.message);
  process.exit(1);
}


