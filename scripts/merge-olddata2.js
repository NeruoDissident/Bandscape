/*
  Merge data from public/olddata2.js into public/data.js

  - Does NOT change any existing IDs in data.js
  - Maps old IDs to existing/new IDs, renumbering ONLY for items imported from olddata2
  - De-duplicates nodes by (type, normalized name) and links by (type, sourceId, targetId)
  - Fills missing fields on existing nodes (non-empty values win; arrays are unioned)
  - Appends new nodes/links to the end
*/

import fs from 'fs';
import path from 'path';

const WORKDIR = process.cwd();
const DATA_PATH = path.join(WORKDIR, 'public', 'data.js');
const OLD_PATH = path.join(WORKDIR, 'public', 'olddata2.js');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function tryParseAsJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function extractArrayByRegex(text, varName) {
  const rx = new RegExp(`${varName}\s*[:=]\s*(\\[[\\s\\S]*?\\])`, 'm');
  const m = text.match(rx);
  if (!m) return null;
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${m[1]});`)();
  } catch (_) {
    return null;
  }
}

function parseOldData(text) {
  // Path A: plain JSON { nodes, links }
  const asJson = tryParseAsJson(text);
  if (asJson && Array.isArray(asJson.nodes) && Array.isArray(asJson.links)) {
    return { nodes: asJson.nodes, links: asJson.links };
  }

  // Path B: multiple top-level arrays one after another (legacy dump)
  const arrays = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('[', i);
    if (start === -1) break;
    let depth = 0;
    let j = start;
    let inString = false;
    let stringQuote = '';
    let escaped = false;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === stringQuote) {
          inString = false;
          stringQuote = '';
        }
        continue;
      }
      if (ch === '"' || ch === '\'') {
        inString = true;
        stringQuote = ch;
        continue;
      }
      if (ch === '[') depth++;
      if (ch === ']') {
        depth--;
        if (depth === 0) {
          const arrText = text.slice(start, j + 1);
          try {
            const arr = JSON.parse(arrText);
            arrays.push(arr);
            i = j + 1;
          } catch (_) {
            i = j + 1;
          }
          break;
        }
      }
    }
    if (j >= text.length) break;
  }
  if (arrays.length > 0) {
    const out = { nodes: [], links: [] };
    for (const arr of arrays) {
      for (const item of arr) {
        if (item && (item.source != null && item.target != null)) {
          out.links.push(item);
        } else if (item && typeof item === 'object' && item.type) {
          out.nodes.push(item);
        }
      }
    }
    return out;
  }

  // Path C: Extract arrays by regex like nodes: [...], links: [...]
  const rxNodes = extractArrayByRegex(text, 'nodes');
  const rxLinks = extractArrayByRegex(text, 'links');
  if (Array.isArray(rxNodes) || Array.isArray(rxLinks)) {
    return { nodes: rxNodes || [], links: rxLinks || [] };
  }

  // Path D: evaluate as expression
  try {
    // eslint-disable-next-line no-new-func
    const obj = new Function(`return (${text});`)();
    if (obj && (Array.isArray(obj.nodes) || Array.isArray(obj.links))) {
      return { nodes: obj.nodes || [], links: obj.links || [] };
    }
  } catch (_) {}

  throw new Error('Unable to parse olddata2.js as arrays');
}

function getMaxNumericId(items, prefix) {
  let maxId = 0;
  for (const it of items) {
    const id = it && it.id;
    if (!id || typeof id !== 'string') continue;
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isFinite(n)) maxId = Math.max(maxId, n);
  }
  return maxId;
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

function isNonEmpty(val) {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return true;
}

function unionUnique(arr, add) {
  const set = new Set(arr || []);
  for (const v of add || []) set.add(v);
  return Array.from(set);
}

function fillNodeFields(existing, incoming) {
  // Primitive fields: only fill when incoming is non-empty and existing is emptyish
  const scalarFields = [
    'description', 'image_url', 'origin', 'start_date', 'end_date', 'name', 'website_url'
  ];
  for (const f of scalarFields) {
    if (!isNonEmpty(existing[f]) && isNonEmpty(incoming[f])) existing[f] = incoming[f];
  }
  // Socials merge: do not overwrite existing non-empty keys
  if (incoming.socials) {
    existing.socials = existing.socials || {};
    for (const [k, v] of Object.entries(incoming.socials)) {
      if (!isNonEmpty(existing.socials[k]) && isNonEmpty(v)) existing.socials[k] = v;
    }
  }
  // Aliases
  existing.aliases = unionUnique(existing.aliases, incoming.aliases);
  // Location: prefer coordinates if missing
  existing.location = existing.location || {};
  const loc = existing.location;
  const inLoc = incoming.location || {};
  if ((loc.lat == null || loc.lat === '') && (inLoc.lat != null && inLoc.lat !== '')) loc.lat = inLoc.lat;
  if ((loc.lng == null || loc.lng === '') && (inLoc.lng != null && inLoc.lng !== '')) loc.lng = inLoc.lng;
  if (!isNonEmpty(loc.city) && isNonEmpty(inLoc.city)) loc.city = inLoc.city;
  if (!isNonEmpty(loc.country) && isNonEmpty(inLoc.country)) loc.country = inLoc.country;
  // Array refs by type
  if (existing.type === 'band') {
    existing.tag_ids = unionUnique(existing.tag_ids, incoming.tag_ids);
    existing.label_ids = unionUnique(existing.label_ids, incoming.label_ids);
    existing.member_ids = unionUnique(existing.member_ids, incoming.member_ids);
  } else if (existing.type === 'member') {
    existing.tag_ids = unionUnique(existing.tag_ids, incoming.tag_ids);
    existing.band_ids = unionUnique(existing.band_ids, incoming.band_ids);
    existing.roles = unionUnique(existing.roles, incoming.roles);
  } else if (existing.type === 'label') {
    existing.artist_ids = unionUnique(existing.artist_ids, incoming.artist_ids);
  }
}

function ensureArraysOnNode(node) {
  const arraysByType = {
    band: ['aliases', 'tag_ids', 'label_ids', 'member_ids'],
    member: ['aliases', 'tag_ids', 'band_ids', 'roles'],
    label: ['aliases', 'artist_ids'],
    genre: [],
    tag: [],
    venue: [],
    event: []
  };
  const baseArrays = ['aliases'];
  const list = new Set([...(arraysByType[node.type] || []), ...baseArrays]);
  for (const k of list) if (!Array.isArray(node[k])) node[k] = [];
  if (!node.location) node.location = { lat: null, lng: null, city: '', country: '' };
}

function prefixForType(type) {
  switch (type) {
    case 'band': return 'band_';
    case 'member': return 'member_';
    case 'label': return 'label_';
    case 'genre': return 'genre_';
    case 'tag': return 'tag_';
    case 'venue': return 'venue_';
    case 'event': return 'event_';
    default: return 'node_';
  }
}

function normalizeUrlsAndSocials(raw) {
  const out = { website_url: undefined, socials: {} };
  if (!raw || typeof raw !== 'object') return out;
  const urlRx = /^https?:\/\//i;
  const keyMap = {
    website: 'website_url', homepage: 'website_url', site: 'website_url', url: 'website_url',
    twitter: 'twitter', x: 'twitter', instagram: 'instagram', ig: 'instagram',
    facebook: 'facebook', fb: 'facebook', bandcamp: 'bandcamp', discogs: 'discogs',
    spotify: 'spotify', soundcloud: 'soundcloud', sc: 'soundcloud', youtube: 'youtube',
    yt: 'youtube', tiktok: 'tiktok', linktree: 'linktree', threads: 'threads', bluesky: 'bluesky'
  };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && urlRx.test(v)) {
      const key = k.toLowerCase();
      if (key in keyMap) {
        const mapped = keyMap[key];
        if (mapped === 'website_url') {
          if (!out.website_url) out.website_url = v;
        } else {
          if (!out.socials[mapped]) out.socials[mapped] = v;
        }
      } else {
        // Heuristic: if key contains a known platform name
        for (const plat of ['twitter','instagram','facebook','bandcamp','discogs','spotify','soundcloud','youtube','tiktok','linktr','threads','bluesky','bsky']) {
          if (key.includes(plat)) {
            const mapped = plat === 'linktr' ? 'linktree' : (plat === 'bsky' ? 'bluesky' : plat);
            if (!out.socials[mapped]) out.socials[mapped] = v;
            break;
          }
        }
        if (!out.website_url && key.includes('site')) out.website_url = v;
      }
    }
  }
  return out;
}

function linkImpactUpdates(link, idToNode) {
  if (!link || !link.type) return;
  const src = idToNode.get(link.source);
  const tgt = idToNode.get(link.target);
  if (!src || !tgt) return;
  if (link.type === 'membership' && src.type === 'member' && tgt.type === 'band') {
    if (!Array.isArray(src.band_ids)) src.band_ids = [];
    if (!src.band_ids.includes(tgt.id)) src.band_ids.push(tgt.id);
    if (!Array.isArray(tgt.member_ids)) tgt.member_ids = [];
    if (!tgt.member_ids.includes(src.id)) tgt.member_ids.push(src.id);
  }
  if (link.type === 'label_signing' && src.type === 'band' && tgt.type === 'label') {
    if (!Array.isArray(src.label_ids)) src.label_ids = [];
    if (!src.label_ids.includes(tgt.id)) src.label_ids.push(tgt.id);
    if (!Array.isArray(tgt.artist_ids)) tgt.artist_ids = [];
    if (!tgt.artist_ids.includes(src.id)) tgt.artist_ids.push(src.id);
  }
}

function main() {
  const dataText = readText(DATA_PATH);
  const existing = JSON.parse(dataText);
  const oldText = readText(OLD_PATH);
  const old = parseOldData(oldText);

  const nodes = existing.nodes || [];
  const links = existing.links || [];

  // Index existing by id and by (type,name)
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const typeNameToId = new Map();
  for (const n of nodes) {
    const key = `${n.type}|${normalizeName(n.name)}`;
    if (!typeNameToId.has(key)) typeNameToId.set(key, n.id);
    ensureArraysOnNode(n);
  }

  // Compute next id numbers per prefix present
  const prefixes = ['band_', 'member_', 'label_', 'genre_', 'tag_', 'venue_', 'event_'];
  const nextNum = {};
  for (const p of prefixes) nextNum[p] = getMaxNumericId(nodes, p) + 1;
  let nextLink = getMaxNumericId(links, 'link_') + 1;

  // Map from old IDs to new/existing IDs
  const idMap = new Map();
  const createdNodeIds = [];

  // First pass: nodes
  for (const inNode of old.nodes || []) {
    if (!inNode || !inNode.type || !inNode.name) continue;
    const type = inNode.type;
    const nameNorm = normalizeName(inNode.name);
    const key = `${type}|${nameNorm}`;
    let targetId = typeNameToId.get(key);
    if (targetId) {
      // Existing node: fill missing fields
      const ex = idToNode.get(targetId);
      ensureArraysOnNode(inNode);
      // Merge website/socials if present on incoming
      const { website_url, socials } = normalizeUrlsAndSocials(inNode);
      if (website_url) inNode.website_url = website_url;
      if (socials && Object.keys(socials).length) inNode.socials = socials;
      fillNodeFields(ex, inNode);
    } else {
      // Create new node with next prefix id
      const prefix = prefixForType(type);
      const id = `${prefix}${nextNum[prefix] || (nextNum[prefix] = 1)}`;
      nextNum[prefix] += 1;
      const { website_url, socials } = normalizeUrlsAndSocials(inNode);
      const newNode = {
        id,
        type,
        name: inNode.name,
        aliases: Array.isArray(inNode.aliases) ? inNode.aliases : [],
        description: inNode.description || '',
        image_url: inNode.image_url || '',
        location: inNode.location || { lat: null, lng: null, city: '', country: '' },
        start_date: inNode.start_date || null,
        end_date: inNode.end_date || null,
        origin: inNode.origin || '',
        tag_ids: Array.isArray(inNode.tag_ids) ? inNode.tag_ids : [],
        label_ids: Array.isArray(inNode.label_ids) ? inNode.label_ids : [],
        member_ids: Array.isArray(inNode.member_ids) ? inNode.member_ids : [],
        band_ids: Array.isArray(inNode.band_ids) ? inNode.band_ids : [],
        roles: Array.isArray(inNode.roles) ? inNode.roles : [],
        artist_ids: Array.isArray(inNode.artist_ids) ? inNode.artist_ids : [],
        website_url: website_url || inNode.website_url || '',
        socials: socials || inNode.socials || undefined
      };
      ensureArraysOnNode(newNode);
      nodes.push(newNode);
      idToNode.set(id, newNode);
      typeNameToId.set(key, id);
      targetId = id;
      createdNodeIds.push(id);
    }
    if (inNode.id) idMap.set(String(inNode.id), targetId);
  }

  // Build de-dupe key set for existing links
  const linkKeySet = new Set(links.map(l => `${l.type || ''}|${l.source}|${l.target}`));
  const createdLinkIds = [];

  // Second pass: links
  for (const inLink of old.links || []) {
    let src = inLink.source;
    let tgt = inLink.target;
    // Map old IDs to new/existing IDs if possible
    if (idMap.has(String(src))) src = idMap.get(String(src));
    if (idMap.has(String(tgt))) tgt = idMap.get(String(tgt));

    // If still not mapped, try name-based rescue: if src/tgt look like names
    const srcNode = idToNode.get(src) || [...idToNode.values()].find(n => normalizeName(n.name) === normalizeName(src));
    const tgtNode = idToNode.get(tgt) || [...idToNode.values()].find(n => normalizeName(n.name) === normalizeName(tgt));
    if (!srcNode || !tgtNode) continue;

    const type = inLink.type || 'membership';
    const key = `${type}|${srcNode.id}|${tgtNode.id}`;
    if (linkKeySet.has(key)) {
      // Optionally enrich label on existing link if empty
      const existingLink = links.find(l => (l.type || '') === type && l.source === srcNode.id && l.target === tgtNode.id);
      if (existingLink && (!isNonEmpty(existingLink.label)) && isNonEmpty(inLink.label)) existingLink.label = inLink.label;
      continue;
    }

    const id = `link_${nextLink++}`;
    const newLink = {
      id,
      type,
      source: srcNode.id,
      target: tgtNode.id,
      label: inLink.label || '',
      start_date: inLink.start_date || null,
      end_date: inLink.end_date || null
    };
    links.push(newLink);
    linkKeySet.add(key);
    createdLinkIds.push(id);
    // Cross-update node arrays based on link semantics
    linkImpactUpdates(newLink, idToNode);
  }

  const merged = { nodes, links };
  // Backup and write
  writeText(DATA_PATH + '.bak.olddata2', dataText);
  writeText(DATA_PATH, JSON.stringify(merged, null, 2));

  console.log(
    `Merged olddata2. Added nodes=${createdNodeIds.length}, links=${createdLinkIds.length}. Totals: nodes=${nodes.length}, links=${links.length}`
  );
}

try {
  main();
} catch (err) {
  console.error('Merge olddata2 failed:', err.message);
  process.exit(1);
}


