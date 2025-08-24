/*
  Infer and create event->venue links in public/data.js.

  Rules:
  - If event has custom fields venue_id or venue_ids (array), use them directly
  - Else, match when event.name or event.description contains a venue name/alias
  - Else, match when event.location city/country equals venue.location city/country
    and geographic distance <= 50km (if coordinates available)
  - Only create when there is exactly one confident venue candidate
  - Link type: 'hosted_at' with source=event.id, target=venue.id
  - Avoid duplicates; append new links at end; do not modify existing IDs
*/

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

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

function normalize(s) { return String(s || '').toLowerCase(); }

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const { lat: lat1, lng: lon1 } = a;
  const { lat: lat2, lng: lon2 } = b;
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const aVal = s1 * s1 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function findVenueCandidates(evt, venues) {
  const candidates = new Set();
  const text = `${evt.name || ''} ${evt.description || ''}`.toLowerCase();
  const city = normalize(evt.location && evt.location.city);
  const country = normalize(evt.location && evt.location.country);

  for (const v of venues) {
    const vName = normalize(v.name);
    const aliasHits = (v.aliases || []).map(normalize).some(a => a && text.includes(a));
    if (vName && text.includes(vName)) candidates.add(v.id);
    if (aliasHits) candidates.add(v.id);

    const vCity = normalize(v.location && v.location.city);
    const vCountry = normalize(v.location && v.location.country);
    if (city && country && vCity && vCountry && city === vCity && country === vCountry) {
      // Optional distance check if both have coords
      const km = haversineKm(evt.location, v.location);
      if (km <= 50 || !Number.isFinite(km)) candidates.add(v.id);
    }
  }
  return Array.from(candidates);
}

function main() {
  const data = readJson(DATA_PATH);
  const nodes = data.nodes || [];
  const links = data.links || [];
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const venues = nodes.filter(n => n.type === 'venue');
  const events = nodes.filter(n => n.type === 'event');
  const linkKey = new Set(links.map(l => `${l.type}|${l.source}|${l.target}`));
  let nextLink = getMaxNumericId(links, 'link_') + 1;

  let created = 0;
  let ambiguous = 0;
  let fromExplicit = 0;

  for (const evt of events) {
    // Direct hints
    const directVenueIds = [];
    if (evt.venue_id && idToNode.has(evt.venue_id)) directVenueIds.push(evt.venue_id);
    if (Array.isArray(evt.venue_ids)) {
      for (const vid of evt.venue_ids) if (idToNode.has(vid)) directVenueIds.push(vid);
    }
    let chosen = null;
    if (directVenueIds.length === 1) {
      chosen = directVenueIds[0];
      fromExplicit++;
    } else if (directVenueIds.length > 1) {
      ambiguous++;
      continue;
    } else {
      const cands = findVenueCandidates(evt, venues);
      if (cands.length === 1) chosen = cands[0];
      else if (cands.length > 1) { ambiguous++; continue; }
    }
    if (!chosen) continue;

    const key = `hosted_at|${evt.id}|${chosen}`;
    if (linkKey.has(key)) continue;
    links.push({
      id: `link_${nextLink++}`,
      type: 'hosted_at',
      source: evt.id,
      target: chosen,
      label: '',
      start_date: null,
      end_date: null
    });
    linkKey.add(key);
    created++;
  }

  writeJson(DATA_PATH + '.bak.eventlinks', data);
  writeJson(DATA_PATH, { nodes, links });
  console.log(`Event→Venue links created=${created}, ambiguous=${ambiguous}, explicit=${fromExplicit}. Totals: nodes=${nodes.length}, links=${links.length}`);
}

try { main(); } catch (e) {
  console.error('Linking failed:', e.message);
  process.exit(1);
}



