// Clean description fields in public/data.js by removing AI citation markers and HTML tags
// Usage: node scripts/sanitize-descriptions.js

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');

function cleanDescription(text) {
  if (typeof text !== 'string') return text;
  let s = text;
  // Remove :contentReference[oaicite:...]{index=...}
  s = s.replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, '');
  // Remove residual double colons and stray spaces near punctuation
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s+([,.;:!?])/g, '$1');
  // Strip simple HTML tags like <em>...</em>
  s = s.replace(/<[^>]+>/g, '');
  // Trim
  s = s.trim();
  // Ensure trailing punctuation for sentence-like text
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  let changed = 0;
  for (const n of data.nodes || []) {
    if (n && typeof n.description === 'string' && n.description) {
      const cleaned = cleanDescription(n.description);
      if (cleaned !== n.description) {
        n.description = cleaned;
        changed += 1;
      }
    }
  }
  const backup = DATA_PATH + '.bak.sanitize';
  fs.writeFileSync(backup, raw, 'utf8');
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Sanitized descriptions for ${changed} node(s). Backup at ${backup}`);
}

try { main(); } catch (e) {
  console.error('Sanitize failed:', e.message);
  process.exit(1);
}


