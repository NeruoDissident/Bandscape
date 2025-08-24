// Remove membership links with empty/blank labels and rebuild membership arrays from remaining links
// Usage: node scripts/remove-empty-membership-links.js

import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js')

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2), 'utf8') }

function isBlank(v) { return v == null || String(v).trim().length === 0 }

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  const data = JSON.parse(raw)
  const nodes = data.nodes || []
  const links = data.links || []

  const byId = new Map(nodes.map(n => [n.id, n]))

  // 1) Drop membership links that have empty/blank label
  const keptLinks = []
  let removedEmpty = 0
  for (const l of links) {
    if (l.type === 'membership' && isBlank(l.label)) {
      removedEmpty += 1
      continue
    }
    keptLinks.push(l)
  }

  // 2) Rebuild membership arrays from kept membership links (link-first)
  const memberToBands = new Map()
  const bandToMembers = new Map()
  const finalLinks = []
  let removedBad = 0
  for (const l of keptLinks) {
    if (l.type !== 'membership') { finalLinks.push(l); continue }
    const s = byId.get(l.source)
    const t = byId.get(l.target)
    if (!s || !t || s.type !== 'member' || t.type !== 'band') {
      removedBad += 1
      continue
    }
    if (!memberToBands.has(s.id)) memberToBands.set(s.id, new Set())
    if (!bandToMembers.has(t.id)) bandToMembers.set(t.id, new Set())
    memberToBands.get(s.id).add(t.id)
    bandToMembers.get(t.id).add(s.id)
    finalLinks.push(l)
  }

  nodes.forEach(n => {
    if (n.type === 'band') {
      const mems = Array.from(bandToMembers.get(n.id) || [])
      n.member_ids = mems
    }
    if (n.type === 'member') {
      const bands = Array.from(memberToBands.get(n.id) || [])
      n.band_ids = bands
    }
  })

  const backup = DATA_PATH + '.bak.cleanEmptyMemberships'
  fs.writeFileSync(backup, raw, 'utf8')
  writeJson(DATA_PATH, { nodes, links: finalLinks })
  console.log(`Removed empty-label membership links=${removedEmpty}, removed bad membership links=${removedBad}`)
}

try { main() } catch (e) {
  console.error('Cleanup failed:', e.message)
  process.exit(1)
}


