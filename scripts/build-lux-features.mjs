import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parseOSM = require('osm-pbf-parser');

const DATA = 'data';
const OUT = path.join('src', 'data', 'lux');
fs.mkdirSync(OUT, { recursive: true });

function findFile(dir, test) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(p, test);
      if (found) return found;
    } else if (test(entry.name)) {
      return p;
    }
  }
  return null;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function round5(n) {
  return Math.round(n * 1e5) / 1e5;
}

function buildTransitStops() {
  const stopsFile = findFile(DATA, (n) => n === 'stops.txt');
  if (!stopsFile) throw new Error('stops.txt not found under data/');
  const lines = fs.readFileSync(stopsFile, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const iLat = header.indexOf('stop_lat');
  const iLon = header.indexOf('stop_lon');
  const seen = new Set();
  const stops = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const lat = Number(f[iLat]);
    const lon = Number(f[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${round5(lat)},${round5(lon)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stops.push([round5(lat), round5(lon)]);
  }
  fs.writeFileSync(path.join(OUT, 'transitStops.json'), JSON.stringify({ stops }));
  console.log(`transitStops.json: ${stops.length} stops`);
}

const HELP_KINDS = { police: 'police', hospital: 'hospital', pharmacy: 'pharmacy', clinic: 'hospital', fire_station: 'police' };

const LAT_STEP = 0.002;
const LON_STEP = 0.003;

function buildFromPbf() {
  return new Promise((resolve, reject) => {
    const pbf = findFile(DATA, (n) => n.endsWith('.osm.pbf'));
    if (!pbf) return reject(new Error('.osm.pbf not found under data/'));
    const points = [];
    const cells = {}; 
    let lamps = 0;
    const parse = parseOSM();
    fs.createReadStream(pbf)
      .pipe(parse)
      .on('data', (items) => {
        for (const item of items) {
          if (item.type !== 'node' || !item.tags) continue;
          const kind = HELP_KINDS[item.tags.amenity];
          if (kind) points.push([round5(item.lat), round5(item.lon), kind]);
          if (item.tags.highway === 'street_lamp' || item.tags.lit === 'yes') {
            const key = `${Math.round(item.lat / LAT_STEP)},${Math.round(item.lon / LON_STEP)}`;
            cells[key] = (cells[key] ?? 0) + 1;
            lamps++;
          }
        }
      })
      .on('error', reject)
      .on('end', () => {
        fs.writeFileSync(path.join(OUT, 'helpPoints.json'), JSON.stringify({ points }));
        fs.writeFileSync(
          path.join(OUT, 'lighting.json'),
          JSON.stringify({ latStep: LAT_STEP, lonStep: LON_STEP, cells }),
        );
        console.log(`helpPoints.json: ${points.length} help points`);
        console.log(`lighting.json: ${lamps} lamps in ${Object.keys(cells).length} cells`);
        resolve();
      });
  });
}

buildTransitStops();
await buildFromPbf();
console.log('done.');
