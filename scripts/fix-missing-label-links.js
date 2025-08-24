/*
  Ensure graph connectivity by generating missing edges from existing arrays:
  - For every band.label_ids and label.artist_ids create label_signing edges
  - For every band.member_ids and member.band_ids create membership edges
  Avoid duplicates; append new links to the end; do not change existing IDs.
*/

import fs from 'fs';
import path from 'path';

const WORKDIR = process.cwd();
const DATA_PATH = path.join(WORKDIR, 'public', 'data.js');

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function writeText(p, s) { fs.writeFileSync(p, s, 'utf8'); }

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

function main() {
  const text = readText(DATA_PATH);
  const data = JSON.parse(text);
  const nodes = data.nodes || [];
  const links = data.links || [];

  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const linkKeySet = new Set(links.map(l => `${l.type || ''}|${l.source}|${l.target}`));
  let nextLink = getMaxNumericId(links, 'link_') + 1;

  let addedLabelLinks = 0;
  let addedMembershipLinks = 0;

  // Create label_signing edges from band.label_ids
  for (const band of nodes.filter(n => n.type === 'band')) {
    const labelIds = Array.isArray(band.label_ids) ? band.label_ids : [];
    for (const labelId of labelIds) {
      if (!idToNode.has(labelId)) continue;
      const key = `label_signing|${band.id}|${labelId}`;
      if (linkKeySet.has(key)) continue;
      const newLink = {
        id: `link_${nextLink++}`,
        type: 'label_signing',
        source: band.id,
        target: labelId,
        label: '',
        start_date: null,
        end_date: null
      };
      links.push(newLink);
      linkKeySet.add(key);
      addedLabelLinks += 1;
    }
  }

  // Create label_signing edges from label.artist_ids
  for (const label of nodes.filter(n => n.type === 'label')) {
    const artistIds = Array.isArray(label.artist_ids) ? label.artist_ids : [];
    for (const bandId of artistIds) {
      const band = idToNode.get(bandId);
      if (!band || band.type !== 'band') continue;
      const key = `label_signing|${bandId}|${label.id}`;
      if (linkKeySet.has(key)) continue;
      const newLink = {
        id: `link_${nextLink++}`,
        type: 'label_signing',
        source: bandId,
        target: label.id,
        label: '',
        start_date: null,
        end_date: null
      };
      links.push(newLink);
      linkKeySet.add(key);
      addedLabelLinks += 1;
    }
  }

  // Create membership edges from band.member_ids
  for (const band of nodes.filter(n => n.type === 'band')) {
    const memberIds = Array.isArray(band.member_ids) ? band.member_ids : [];
    for (const memberId of memberIds) {
      const member = idToNode.get(memberId);
      if (!member || member.type !== 'member') continue;
      const key = `membership|${memberId}|${band.id}`;
      if (linkKeySet.has(key)) continue;
      const newLink = {
        id: `link_${nextLink++}`,
        type: 'membership',
        source: memberId,
        target: band.id,
        label: '',
        start_date: null,
        end_date: null
      };
      links.push(newLink);
      linkKeySet.add(key);
      addedMembershipLinks += 1;
    }
  }

  // Create membership edges from member.band_ids
  for (const member of nodes.filter(n => n.type === 'member')) {
    const bandIds = Array.isArray(member.band_ids) ? member.band_ids : [];
    for (const bandId of bandIds) {
      const band = idToNode.get(bandId);
      if (!band || band.type !== 'band') continue;
      const key = `membership|${member.id}|${bandId}`;
      if (linkKeySet.has(key)) continue;
      const newLink = {
        id: `link_${nextLink++}`,
        type: 'membership',
        source: member.id,
        target: bandId,
        label: '',
        start_date: null,
        end_date: null
      };
      links.push(newLink);
      linkKeySet.add(key);
      addedMembershipLinks += 1;
    }
  }

  const out = { nodes, links };
  writeText(DATA_PATH + '.bak.fixlinks', text);
  writeText(DATA_PATH, JSON.stringify(out, null, 2));

  console.log(`Added label_signing=${addedLabelLinks}, membership=${addedMembershipLinks}. Totals: nodes=${nodes.length}, links=${links.length}`);
}

try { main(); } catch (e) {
  console.error('Fix missing links failed:', e.message);
  process.exit(1);
}




