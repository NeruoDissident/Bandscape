import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'data.js');
const text = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(text);

const { nodes, links } = data;
console.log(`nodes=${nodes.length}, links=${links.length}`);

function countLinksForBand(bandId) {
  const membership = links.filter(l => l.type === 'membership' && l.target === bandId).length;
  const labelSign = links.filter(l => l.type === 'label_signing' && l.source === bandId).length;
  return { membership, labelSign };
}

const bands = [
  { id: 'band_34', name: 'Hatebreed' },
  { id: 'band_32', name: 'Glassjaw' },
  { id: 'band_35', name: 'The Bouncing Souls' }
];

for (const b of bands) {
  const c = countLinksForBand(b.id);
  console.log(`${b.name} (${b.id}) -> membership=${c.membership}, label_signing=${c.labelSign}`);
}




