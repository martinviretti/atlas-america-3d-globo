// build-geojson.mjs — genera assets/data/americas.geojson a partir de Natural Earth 50m.
// Uso (una sola vez, durante el build; NO es dependencia de runtime):
//   node tools/build-geojson.mjs
// Fuente: Natural Earth (dominio público) — ne_50m_admin_0_countries.geojson
import fs from 'node:fs';

const RAW = new URL('./ne_50m_raw.geojson', import.meta.url);
const OUT = new URL('../assets/data/americas.geojson', import.meta.url);

// ISO_A3 -> metadatos pedagógicos (fuente única de mapeo geometría<->dataset)
const MAP = {
  CAN: ['canada', 'ca', 'norte', 'Canadá'],
  USA: ['estados-unidos', 'us', 'norte', 'Estados Unidos'],
  MEX: ['mexico', 'mx', 'norte', 'México'],
  BLZ: ['belice', 'bz', 'central', 'Belice'],
  GTM: ['guatemala', 'gt', 'central', 'Guatemala'],
  SLV: ['el-salvador', 'sv', 'central', 'El Salvador'],
  HND: ['honduras', 'hn', 'central', 'Honduras'],
  NIC: ['nicaragua', 'ni', 'central', 'Nicaragua'],
  CRI: ['costa-rica', 'cr', 'central', 'Costa Rica'],
  PAN: ['panama', 'pa', 'central', 'Panamá'],
  ATG: ['antigua-y-barbuda', 'ag', 'caribe', 'Antigua y Barbuda'],
  BHS: ['bahamas', 'bs', 'caribe', 'Bahamas'],
  BRB: ['barbados', 'bb', 'caribe', 'Barbados'],
  CUB: ['cuba', 'cu', 'caribe', 'Cuba'],
  DMA: ['dominica', 'dm', 'caribe', 'Dominica'],
  DOM: ['republica-dominicana', 'do', 'caribe', 'República Dominicana'],
  GRD: ['granada', 'gd', 'caribe', 'Granada'],
  HTI: ['haiti', 'ht', 'caribe', 'Haití'],
  JAM: ['jamaica', 'jm', 'caribe', 'Jamaica'],
  KNA: ['san-cristobal-y-nieves', 'kn', 'caribe', 'San Cristóbal y Nieves'],
  LCA: ['santa-lucia', 'lc', 'caribe', 'Santa Lucía'],
  VCT: ['san-vicente-y-las-granadinas', 'vc', 'caribe', 'San Vicente y las Granadinas'],
  TTO: ['trinidad-y-tobago', 'tt', 'caribe', 'Trinidad y Tobago'],
  ARG: ['argentina', 'ar', 'sur', 'Argentina'],
  BOL: ['bolivia', 'bo', 'sur', 'Bolivia'],
  BRA: ['brasil', 'br', 'sur', 'Brasil'],
  CHL: ['chile', 'cl', 'sur', 'Chile'],
  COL: ['colombia', 'co', 'sur', 'Colombia'],
  ECU: ['ecuador', 'ec', 'sur', 'Ecuador'],
  GUY: ['guyana', 'gy', 'sur', 'Guyana'],
  PRY: ['paraguay', 'py', 'sur', 'Paraguay'],
  PER: ['peru', 'pe', 'sur', 'Perú'],
  SUR: ['surinam', 'sr', 'sur', 'Surinam'],
  URY: ['uruguay', 'uy', 'sur', 'Uruguay'],
  VEN: ['venezuela', 've', 'sur', 'Venezuela'],
};

const P = 3; // decimales de precisión (~100 m)
const round = (n) => Math.round(n * 10 ** P) / 10 ** P;

// Redondea un anillo, elimina puntos consecutivos duplicados, cierra el anillo.
function cleanRing(ring) {
  const out = [];
  let prev = null;
  for (const [lng, lat] of ring) {
    const p = [round(lng), round(lat)];
    if (!prev || p[0] !== prev[0] || p[1] !== prev[1]) out.push(p);
    prev = p;
  }
  // asegurar cierre
  const a = out[0], b = out[out.length - 1];
  if (a && b && (a[0] !== b[0] || a[1] !== b[1])) out.push([a[0], a[1]]);
  return out;
}

// ¿el anillo cruza el antimeridiano? (span de longitud > 180 => artefacto en el globo)
function crossesAntimeridian(ring) {
  let min = Infinity, max = -Infinity;
  for (const [lng] of ring) { if (lng < min) min = lng; if (lng > max) max = lng; }
  return (max - min) > 180;
}

function cleanPolygon(rings) {
  const cleaned = [];
  for (let i = 0; i < rings.length; i++) {
    if (crossesAntimeridian(rings[i])) continue; // descarta anillos problemáticos (ej. Aleutianas lejanas)
    const r = cleanRing(rings[i]);
    if (r.length >= 4) cleaned.push(r); // anillo válido mínimo
  }
  return cleaned;
}

function cleanGeometry(geom) {
  if (geom.type === 'Polygon') {
    const rings = cleanPolygon(geom.coordinates);
    return rings.length ? { type: 'Polygon', coordinates: rings } : null;
  }
  if (geom.type === 'MultiPolygon') {
    const polys = [];
    for (const poly of geom.coordinates) {
      const rings = cleanPolygon(poly);
      if (rings.length) polys.push(rings);
    }
    return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null;
  }
  return null;
}

const raw = JSON.parse(fs.readFileSync(RAW));
const byIso = new Map();
for (const f of raw.features) {
  const iso = f.properties.ISO_A3;
  if (MAP[iso] && !byIso.has(iso)) byIso.set(iso, f);
}

const features = [];
for (const iso of Object.keys(MAP)) {
  const f = byIso.get(iso);
  if (!f) { console.warn('SIN GEOMETRÍA:', iso); continue; }
  const geom = cleanGeometry(f.geometry);
  if (!geom) { console.warn('GEOMETRÍA VACÍA tras limpieza:', iso); continue; }
  const [id, iso2, region, nombreES] = MAP[iso];
  features.push({
    type: 'Feature',
    id,
    properties: { id, iso2, iso3: iso, region, nombreES },
    geometry: geom,
  });
}

const fc = { type: 'FeatureCollection', features };
fs.writeFileSync(OUT, JSON.stringify(fc));
const bytes = fs.statSync(OUT).size;
console.log(`americas.geojson OK -> ${features.length} países, ${bytes.toLocaleString()} bytes`);
