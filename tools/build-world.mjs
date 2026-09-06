// build-world.mjs — genera assets/data/world.geojson (contexto mundial del globo).
// Fuente: Natural Earth (dominio público), derivado del dataset mundial del proyecto.
// Uso (una sola vez, build): node tools/build-world.mjs <ruta-a-data.js>
// Excluye los 35 Estados de América (esos los dibuja americas.geojson con color por región).
import fs from 'node:fs';

const SRC = process.argv[2];
const OUT = new URL('../assets/data/world.geojson', import.meta.url);
const EXCLUDE = new Set(['CAN','USA','MEX','BLZ','GTM','SLV','HND','NIC','CRI','PAN','ATG','BHS','BRB',
  'CUB','DMA','DOM','GRD','HTI','JAM','KNA','LCA','VCT','TTO','ARG','BOL','BRA','CHL','COL','ECU',
  'GUY','PRY','PER','SUR','URY','VEN']);

const P = 1;                 // 1 decimal ≈ 11 km: suficiente como telón de fondo
const MIN_RING_POINTS = 5;   // descarta islotes irrelevantes a esta escala
const round = n => Math.round(n * 10 ** P) / 10 ** P;

function cleanRing(ring){
  const out = []; let prev = null;
  for (const [lng, lat] of ring){
    const p = [round(lng), round(lat)];
    if (!prev || p[0] !== prev[0] || p[1] !== prev[1]) out.push(p);
    prev = p;
  }
  if (out.length && (out[0][0] !== out.at(-1)[0] || out[0][1] !== out.at(-1)[1])) out.push(out[0]);
  return out.length >= MIN_RING_POINTS ? out : null;
}
function cleanGeom(g){
  if (!g) return null;
  if (g.type === 'Polygon'){
    const rings = g.coordinates.map(cleanRing).filter(Boolean);
    return rings.length ? {type:'Polygon', coordinates:rings} : null;
  }
  if (g.type === 'MultiPolygon'){
    const polys = g.coordinates.map(p => p.map(cleanRing).filter(Boolean)).filter(p => p.length);
    return polys.length ? {type:'MultiPolygon', coordinates:polys} : null;
  }
  return null;
}

const raw = fs.readFileSync(SRC, 'utf8');
const win = {}; new Function('window', raw)(win);
const src = win.ATLAS_DATA.geojson;

const features = [];
for (const f of src.features){
  const iso3 = f.properties?.iso3;
  if (!iso3 || EXCLUDE.has(iso3)) continue;
  const geometry = cleanGeom(f.geometry);
  if (geometry) features.push({type:'Feature', properties:{iso3}, geometry});
}
const out = {type:'FeatureCollection', features};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('world.geojson:', features.length, 'países ·', (fs.statSync(OUT).size/1024).toFixed(0), 'KB');
