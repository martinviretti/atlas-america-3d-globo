/* ============================================================
   ATLAS AMÉRICA 3D — datos compartidos
   Fuente única de verdad de los 35 Estados independientes de América.
   La usan index.html (app completa) y estudiar.html (versión breve),
   así los datos nunca se desincronizan entre las dos.
   Fuentes: ISO 3166 · OEA · ONU M49 · Natural Earth · coordenadas publicadas.
   ============================================================ */
'use strict';
const _uniq=a=>Array.from(new Set(a));

/* Normalización de respuestas (tildes opcionales, mayúsculas, espacios, puntuación) */
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g,'').replace(/["'`´.,]/g,'').replace(/[-_/]/g,' ')
  .replace(/\s+/g,' ').trim();}
function answerMatches(input, accepted){
  const ni=norm(input); if(!ni) return false;
  const nis=ni.replace(/\s/g,'');
  return accepted.some(a=>{const na=norm(a);const nas=na.replace(/\s/g,'');
    return na===ni || (nis.length>=4 && nas.length>=4 && nas===nis);});
}

/* ---------- Regiones ---------- */
const REGIONS={
  norte:{id:'norte',nombre:'América del Norte',color:'var(--r-norte)',hex:'#6aa9ff',pattern:'▲'},
  central:{id:'central',nombre:'América Central',color:'var(--r-central)',hex:'#ffb454',pattern:'■'},
  caribe:{id:'caribe',nombre:'Caribe',color:'var(--r-caribe)',hex:'#37d6b3',pattern:'●'},
  sur:{id:'sur',nombre:'América del Sur',color:'var(--r-sur)',hex:'#c58bfa',pattern:'◆'},
};
const REGION_ORDER=['norte','central','caribe','sur'];

/* ---------- Dataset de los 35 Estados independientes ---------- */
const FUENTE='ISO 3166 · OEA · ONU M49 · Natural Earth · coordenadas publicadas';
const _RAW=[
 // id, iso2, iso3, nombreES, oficial, capital, [capitalesAceptadas], tipoCapital, region,
 // [latPais,lngPais], [latCap,lngCap], desc, mnemo, [aliasPais], [aliasCapital]
 ['canada','ca','CAN','Canadá','Canadá','Ottawa',['Ottawa'],'capital','norte',[56.13,-106.35],[45.4215,-75.6972],
   'El país más extenso de América y el segundo del mundo. Bilingüe: inglés y francés.',
   'Ottawa NO es Toronto ni Montreal: es una capital más pequeña, elegida como punto medio entre el mundo anglófono y el francófono.',
   ['Canada'],['Ottawa']],
 ['estados-unidos','us','USA','Estados Unidos','Estados Unidos de América','Washington D. C.',['Washington D. C.','Washington','Washington DC','Distrito de Columbia'],'capital','norte',[39.83,-98.58],[38.9072,-77.0369],
   'Estado federal de 50 estados. Su capital, Washington D. C., es un distrito federal, no un estado.',
   'Washington D. C. (Distrito de Columbia) ≠ el estado de Washington, que está en la costa oeste. La capital está en el este.',
   ['EEUU','EE. UU.','EE.UU.','USA','Estados Unidos de America','United States'],['Washington D.C.','Washington, D.C.','Washington DC']],
 ['mexico','mx','MEX','México','Estados Unidos Mexicanos','Ciudad de México',['Ciudad de México','CDMX','México D.F.'],'capital','norte',[23.63,-102.55],[19.4326,-99.1332],
   'País más poblado de habla hispana. Su capital comparte nombre con el país: Ciudad de México.',
   'El país es "México"; la capital es "Ciudad de México" (antes D.F.). No confundir país con capital.',
   ['Mexico'],['CDMX','Mexico DF','Ciudad de Mexico']],
 ['belice','bz','BLZ','Belice','Belice','Belmopán',['Belmopán'],'capital','central',[17.19,-88.50],[17.2514,-88.7705],
   'Único país de América Central con el inglés como idioma oficial. Frontera con México y Guatemala.',
   'La capital Belmopán (interior) reemplazó a Ciudad de Belice (costa) tras un huracán en 1961. La ciudad más grande NO es la capital.',
   ['Belize'],['Belmopan']],
 ['guatemala','gt','GTM','Guatemala','República de Guatemala','Ciudad de Guatemala',['Ciudad de Guatemala','Guatemala'],'capital','central',[15.78,-90.23],[14.6349,-90.5069],
   'País más poblado de América Central, de fuerte herencia maya.',
   'El país "Guatemala" y su capital "Ciudad de Guatemala" comparten nombre, igual que México.',
   ['Guatemala'],['Guatemala City','Nueva Guatemala de la Asunción']],
 ['el-salvador','sv','SLV','El Salvador','República de El Salvador','San Salvador',['San Salvador'],'capital','central',[13.79,-88.90],[13.6929,-89.2182],
   'El país más pequeño y densamente poblado de América Central. Único sin costa caribeña.',
   'San Salvador (capital) — recordá "el Salvador salva en San Salvador".',
   ['Salvador'],['San Salvador']],
 ['honduras','hn','HND','Honduras','República de Honduras','Tegucigalpa',['Tegucigalpa'],'capital','central',[15.20,-86.24],[14.0723,-87.1921],
   'País montañoso del centro de la región. Capital de nombre indígena: Tegucigalpa.',
   'Tegucigalpa: capital de nombre largo y difícil; "Tegus" para los locales.',
   ['Honduras'],['Tegucigalpa']],
 ['nicaragua','ni','NIC','Nicaragua','República de Nicaragua','Managua',['Managua'],'capital','central',[12.87,-85.21],[12.1364,-86.2514],
   'País más extenso de América Central, con grandes lagos (Nicaragua y Managua).',
   'Managua está junto a su lago homónimo. NicaraGUA → ManaGUA.',
   ['Nicaragua'],['Managua']],
 ['costa-rica','cr','CRI','Costa Rica','República de Costa Rica','San José',['San José'],'capital','central',[9.75,-83.75],[9.9281,-84.0907],
   'Democracia estable sin ejército desde 1948. Gran biodiversidad.',
   'San José de Costa Rica ≠ San Juan (capital de Puerto Rico). Costa Rica → San JOSÉ.',
   ['Costa Rica'],['San Jose']],
 ['panama','pa','PAN','Panamá','República de Panamá','Ciudad de Panamá',['Ciudad de Panamá','Panamá'],'capital','central',[8.54,-80.78],[8.9824,-79.5199],
   'Une América Central y del Sur; alberga el Canal de Panamá.',
   'El país "Panamá" y la capital "Ciudad de Panamá" comparten nombre. El Canal atraviesa el país.',
   ['Panama'],['Panama City','Ciudad de Panama']],
 ['antigua-y-barbuda','ag','ATG','Antigua y Barbuda','Antigua y Barbuda',"Saint John's",["Saint John's","Saint John","St. John's"],'capital','caribe',[17.28,-61.79],[17.1274,-61.8468],
   'Estado insular de dos islas principales. Turismo de playas.',
   "Saint John's (Antigua) ≠ Saint George's (Granada). Antigua → JOHN's.",
   ['Antigua and Barbuda','Antigua'],["St John's","St. John's","Saint Johns"]],
 ['bahamas','bs','BHS','Bahamas','Mancomunidad de las Bahamas','Nassau',['Nassau'],'capital','caribe',[24.79,-77.55],[25.0443,-77.3504],
   'Archipiélago de cientos de islas al sureste de Florida.',
   'Nassau (Bahamas): pensá en "Nassau, cerca de Florida".',
   ['Las Bahamas','The Bahamas'],['Nassau']],
 ['barbados','bb','BRB','Barbados','Barbados','Bridgetown',['Bridgetown'],'capital','caribe',[13.19,-59.54],[13.0975,-59.6167],
   'Isla más oriental del Caribe. Antigua colonia británica.',
   'Bridgetown: la "ciudad del puente" en Barbados, la isla más al este.',
   ['Barbados'],['Bridgetown']],
 ['cuba','cu','CUB','Cuba','República de Cuba','La Habana',['La Habana','Habana'],'capital','caribe',[21.52,-79.55],[23.1136,-82.3666],
   'La isla más grande del Caribe. Capital histórica: La Habana.',
   'La Habana (con "La"): capital de Cuba, la mayor isla caribeña.',
   ['Cuba'],['Havana','La Habana']],
 ['dominica','dm','DMA','Dominica','Mancomunidad de Dominica','Roseau',['Roseau'],'capital','caribe',[15.41,-61.36],[15.3092,-61.3790],
   'Isla montañosa y selvática, la "Isla de la Naturaleza". NO confundir con República Dominicana.',
   'Dominica (pequeña, capital Roseau) ≠ República Dominicana (capital Santo Domingo). Son países distintos.',
   ['Commonwealth of Dominica'],['Roseau']],
 ['republica-dominicana','do','DOM','República Dominicana','República Dominicana','Santo Domingo',['Santo Domingo'],'capital','caribe',[18.74,-70.16],[18.4861,-69.9312],
   'Comparte la isla La Española con Haití. Capital: Santo Domingo.',
   'República Dominicana → Santo Domingo (la ciudad europea más antigua de América). No confundir con Dominica.',
   ['Dominican Republic','R. Dominicana','RD'],['Santo Domingo']],
 ['granada','gd','GRD','Granada','Granada',"Saint George's",["Saint George's","St. George's"],'capital','caribe',[12.12,-61.68],[12.0561,-61.7488],
   'Isla de las especias (nuez moscada). País del Caribe, NO la ciudad española.',
   "Granada país (Caribe) → Saint George's. No es la Granada de España. Saint George's ≠ Saint John's (Antigua).",
   ['Grenada'],["St George's","St. George's","Saint Georges"]],
 ['haiti','ht','HTI','Haití','República de Haití','Puerto Príncipe',['Puerto Príncipe','Port-au-Prince'],'capital','caribe',[18.97,-72.29],[18.5944,-72.3074],
   'Comparte La Española con Rep. Dominicana. Único país americano de habla mayoritaria francesa/criollo.',
   'Puerto Príncipe (Port-au-Prince): capital de Haití, en el oeste de la isla.',
   ['Haiti'],['Port-au-Prince','Port au Prince','Puerto Principe']],
 ['jamaica','jm','JAM','Jamaica','Jamaica','Kingston',['Kingston'],'capital','caribe',[18.11,-77.30],[18.0179,-76.8099],
   'Isla anglófona, cuna del reggae. Capital: Kingston.',
   'Kingston (Jamaica) ≠ Kingstown (San Vicente). Jamaica → KingsTON.',
   ['Jamaica'],['Kingston']],
 ['san-cristobal-y-nieves','kn','KNA','San Cristóbal y Nieves','Federación de San Cristóbal y Nieves','Basseterre',['Basseterre'],'capital','caribe',[17.30,-62.73],[17.3026,-62.7177],
   'El país más pequeño de América en superficie y población. Dos islas: San Cristóbal y Nieves.',
   'San Cristóbal y Nieves = Saint Kitts and Nevis. Capital: Basseterre.',
   ['Saint Kitts and Nevis','St. Kitts and Nevis','San Cristobal y Nieves'],['Basseterre']],
 ['santa-lucia','lc','LCA','Santa Lucía','Santa Lucía','Castries',['Castries'],'capital','caribe',[13.91,-60.98],[14.0101,-60.9875],
   'Isla volcánica con los picos Pitons. Antigua colonia británica.',
   'Castries: capital de Santa Lucía. "Santa Lucía castiga en Castries".',
   ['Saint Lucia','Santa Lucia'],['Castries']],
 ['san-vicente-y-las-granadinas','vc','VCT','San Vicente y las Granadinas','San Vicente y las Granadinas','Kingstown',['Kingstown'],'capital','caribe',[13.25,-61.20],[13.1600,-61.2248],
   'Estado de una isla principal (San Vicente) y las Granadinas.',
   'Kingstown (con "town") en San Vicente ≠ Kingston (Jamaica, sin "town").',
   ['Saint Vincent and the Grenadines','San Vicente'],['Kingstown']],
 ['trinidad-y-tobago','tt','TTO','Trinidad y Tobago','República de Trinidad y Tobago','Puerto España',['Puerto España','Port of Spain','Port-of-Spain'],'capital','caribe',[10.69,-61.22],[10.6549,-61.5019],
   'Dos islas frente a Venezuela. Rica en gas y petróleo; cuna del calipso.',
   'Puerto España (Port of Spain): capital de Trinidad y Tobago, cerca de Venezuela.',
   ['Trinidad and Tobago','Trinidad'],['Port of Spain','Puerto Espana','Port-of-Spain']],
 ['argentina','ar','ARG','Argentina','República Argentina','Buenos Aires',['Buenos Aires'],'capital','sur',[-38.42,-63.62],[-34.6037,-58.3816],
   'Segundo país más extenso de América del Sur. Capital: Buenos Aires (CABA).',
   'Buenos Aires: "buenos aires" a orillas del Río de la Plata.',
   ['Argentina'],['Buenos Aires','CABA','Capital Federal']],
 ['bolivia','bo','BOL','Bolivia','Estado Plurinacional de Bolivia','Sucre',['Sucre','La Paz'],'dual','sur',[-16.29,-63.59],[-19.0333,-65.2627],
   'País sin salida al mar. Caso especial: capital constitucional Sucre; sede de gobierno La Paz.',
   'Bolivia tiene DOS: Sucre es la capital constitucional; La Paz es la sede del gobierno (Ejecutivo y Legislativo).',
   ['Bolivia'],['Sucre','La Paz']],
 ['brasil','br','BRA','Brasil','República Federativa del Brasil','Brasilia',['Brasilia','Brasília'],'capital','sur',[-14.24,-51.93],[-15.7939,-47.8828],
   'País más extenso y poblado de América del Sur. Idioma: portugués.',
   'Brasilia (capital planificada, 1960) ≠ Río de Janeiro ni São Paulo. La capital NO es la ciudad más grande.',
   ['Brazil','Brasil'],['Brasília','Brasilia']],
 ['chile','cl','CHL','Chile','República de Chile','Santiago',['Santiago','Santiago de Chile'],'capital','sur',[-35.68,-71.54],[-33.4489,-70.6693],
   'País largo y angosto entre los Andes y el Pacífico.',
   'Santiago de Chile: capital al pie de los Andes.',
   ['Chile'],['Santiago de Chile']],
 ['colombia','co','COL','Colombia','República de Colombia','Bogotá',['Bogotá','Santa Fe de Bogotá'],'capital','sur',[4.57,-74.30],[4.7110,-74.0721],
   'Único país sudamericano con costa en el Pacífico y el Caribe. Capital: Bogotá.',
   'Bogotá: capital de Colombia, en el altiplano andino a ~2.600 m.',
   ['Colombia'],['Bogota','Santa Fe de Bogota']],
 ['ecuador','ec','ECU','Ecuador','República del Ecuador','Quito',['Quito'],'capital','sur',[-1.83,-78.18],[-0.1807,-78.4678],
   'Atravesado por la línea ecuatorial. Incluye las islas Galápagos.',
   'Quito: capital de Ecuador, casi sobre la línea del ecuador. NO es Guayaquil (la ciudad más grande).',
   ['Ecuador'],['Quito']],
 ['guyana','gy','GUY','Guyana','República Cooperativa de Guyana','Georgetown',['Georgetown'],'capital','sur',[4.86,-58.93],[6.8013,-58.1551],
   'Único país sudamericano con el inglés oficial. NO confundir con la Guayana Francesa (territorio).',
   'Guyana (inglés) → Georgetown. Al lado: Surinam → Paramaribo; y la Guayana Francesa → Cayena (territorio, no país).',
   ['Guyana'],['Georgetown']],
 ['paraguay','py','PRY','Paraguay','República del Paraguay','Asunción',['Asunción'],'capital','sur',[-23.44,-58.44],[-25.2637,-57.5759],
   'País sin salida al mar, bilingüe español-guaraní.',
   'Asunción: capital de Paraguay, sobre el río Paraguay.',
   ['Paraguay'],['Asuncion']],
 ['peru','pe','PER','Perú','República del Perú','Lima',['Lima'],'capital','sur',[-9.19,-75.02],[-12.0464,-77.0428],
   'Cuna del Imperio Inca (Cusco). Capital actual: Lima, en la costa.',
   'Lima: capital de Perú, en la costa del Pacífico. Cusco fue la capital inca, no la actual.',
   ['Peru'],['Lima']],
 ['surinam','sr','SUR','Surinam','República de Surinam','Paramaribo',['Paramaribo'],'capital','sur',[3.92,-56.03],[5.8520,-55.2038],
   'País más pequeño de Sudamérica; idioma oficial: neerlandés.',
   'Surinam (neerlandés) → Paramaribo. Vecino de Guyana (Georgetown).',
   ['Suriname'],['Paramaribo']],
 ['uruguay','uy','URY','Uruguay','República Oriental del Uruguay','Montevideo',['Montevideo'],'capital','sur',[-32.52,-55.77],[-34.9011,-56.1645],
   'País pequeño entre Argentina y Brasil, sobre el Río de la Plata.',
   'Montevideo: capital de Uruguay, frente a Buenos Aires sobre el Plata.',
   ['Uruguay'],['Montevideo']],
 ['venezuela','ve','VEN','Venezuela','República Bolivariana de Venezuela','Caracas',['Caracas'],'capital','sur',[6.42,-66.59],[10.4806,-66.9036],
   'País caribeño-andino con las mayores reservas de petróleo. Capital: Caracas.',
   'Caracas: capital de Venezuela, cerca de la costa caribeña.',
   ['Venezuela'],['Caracas']],
];
const COUNTRIES=_RAW.map(r=>({
  id:r[0], iso2:r[1], iso3:r[2], nombreES:r[3], nombreAlternativo:r[4],
  capitalPrincipal:r[5], capitalesAceptadas:r[6], tipoCapital:r[7], regionPedagogica:r[8],
  coordenadasPais:{lat:r[9][0],lng:r[9][1]}, coordenadasCapital:{lat:r[10][0],lng:r[10][1]},
  bandera:`assets/flags/${r[1]}.svg`, descripcionBreve:r[11], ayudaMemoria:r[12],
  aliasPais:r[13]||[], aliasCapital:r[14]||[], estadoSoberania:'Estado soberano', fuente:FUENTE,
}));
const BY_ID=Object.fromEntries(COUNTRIES.map(c=>[c.id,c]));
const byId=id=>BY_ID[id];
const inRegion=r=>r==='todas'?COUNTRIES.slice():COUNTRIES.filter(c=>c.regionPedagogica===r);
// nombres aceptados para validar "país"
function paisAceptado(c){return _uniq([c.nombreES,c.nombreAlternativo,...c.aliasPais]);}
function capitalAceptada(c){return _uniq([...(c.capitalesAceptadas||[]),...c.aliasCapital]);}

/* ---------- Pares que suelen confundirse ---------- */
const CONFUSABLES=[
 {a:'Ottawa',b:'Toronto',tipo:'Capital vs. ciudad más poblada',nota:'Ottawa es la capital de Canadá; Toronto es la ciudad más grande, pero NO la capital.'},
 {a:'Washington D. C.',b:'Estado de Washington',tipo:'Distrito federal vs. estado',nota:'La capital es el Distrito de Columbia (este). El estado de Washington está en la costa oeste.'},
 {a:'Brasilia',b:'Río de Janeiro',tipo:'Capital vs. antigua capital',nota:'Brasilia es la capital desde 1960. Río fue capital hasta entonces; São Paulo es la mayor ciudad.'},
 {a:'Sucre',b:'La Paz',tipo:'Capital constitucional vs. sede de gobierno',nota:'Sucre es la capital constitucional de Bolivia; La Paz es la sede del Ejecutivo y el Legislativo.'},
 {a:'Belmopán',b:'Ciudad de Belice',tipo:'Capital vs. ciudad más poblada',nota:'Belmopán es la capital de Belice; Ciudad de Belice es la más poblada.'},
 {a:'Dominica',b:'República Dominicana',tipo:'Dos países distintos',nota:'Dominica (capital Roseau) y República Dominicana (capital Santo Domingo) son países diferentes.'},
 {a:'Georgetown',b:'Paramaribo / Cayena',tipo:'Las tres Guayanas',nota:'Georgetown = Guyana; Paramaribo = Surinam; Cayena = Guayana Francesa (territorio, no país).'},
 {a:'San José',b:'San Juan',tipo:'Costa Rica vs. Puerto Rico',nota:'San José es capital de Costa Rica; San Juan es la capital de Puerto Rico (territorio de EE. UU.).'},
 {a:"Saint John's",b:"Saint George's",tipo:'Antigua vs. Granada',nota:"Saint John's = Antigua y Barbuda; Saint George's = Granada."},
 {a:'Kingston',b:'Kingstown',tipo:'Jamaica vs. San Vicente',nota:'Kingston = Jamaica; Kingstown (con "town") = San Vicente y las Granadinas.'},
 {a:'Guatemala',b:'Ciudad de Guatemala',tipo:'País vs. capital homónima',nota:'El país es Guatemala; la capital es Ciudad de Guatemala.'},
 {a:'Panamá',b:'Ciudad de Panamá',tipo:'País vs. capital homónima',nota:'El país es Panamá; la capital es Ciudad de Panamá.'},
 {a:'México',b:'Ciudad de México',tipo:'País vs. capital homónima',nota:'El país es México; la capital es Ciudad de México (antes D.F.).'},
];

/* ---------- Territorios y casos especiales (NO forman parte de los 35) ---------- */
const TERRITORIES=[
 {nombre:'Groenlandia',capital:'Nuuk',soberania:'Territorio autónomo de Dinamarca',region:'Norte (geográfico)',nota:'Isla más grande del mundo; políticamente parte del Reino de Dinamarca.'},
 {nombre:'Puerto Rico',capital:'San Juan',soberania:'Territorio no incorporado de EE. UU.',region:'Caribe',nota:'Estado libre asociado a Estados Unidos; sus habitantes son ciudadanos estadounidenses.'},
 {nombre:'Guayana Francesa',capital:'Cayena',soberania:'Departamento de ultramar de Francia',region:'Sudamérica',nota:'Parte de Francia y de la UE; no es un Estado independiente. No confundir con Guyana.'},
 {nombre:'Bermudas',capital:'Hamilton',soberania:'Territorio británico de ultramar',region:'Atlántico N.',nota:'Archipiélago en el Atlántico, autónomo bajo soberanía británica.'},
 {nombre:'Aruba',capital:'Oranjestad',soberania:'País constitutivo del Reino de los Países Bajos',region:'Caribe',nota:'Autónomo dentro del Reino de los Países Bajos.'},
 {nombre:'Curazao',capital:'Willemstad',soberania:'País constitutivo del Reino de los Países Bajos',region:'Caribe',nota:'Autónomo dentro del Reino de los Países Bajos.'},
 {nombre:'Islas Caimán',capital:'George Town',soberania:'Territorio británico de ultramar',region:'Caribe',nota:'Centro financiero; bajo soberanía británica.'},
 {nombre:'Islas Vírgenes (EE. UU.)',capital:'Charlotte Amalie',soberania:'Territorio no incorporado de EE. UU.',region:'Caribe',nota:'Grupo de islas administrado por Estados Unidos.'},
 {nombre:'Islas Vírgenes Británicas',capital:'Road Town',soberania:'Territorio británico de ultramar',region:'Caribe',nota:'Bajo soberanía británica.'},
 {nombre:'Guadalupe',capital:'Basse-Terre',soberania:'Departamento de ultramar de Francia',region:'Caribe',nota:'Parte de Francia y de la UE.'},
 {nombre:'Martinica',capital:'Fort-de-France',soberania:'Departamento de ultramar de Francia',region:'Caribe',nota:'Parte de Francia y de la UE.'},
 {nombre:'San Martín',capital:'Marigot',soberania:'Colectividad de Francia (parte norte de la isla)',region:'Caribe',nota:'La isla se divide entre Francia (San Martín) y los Países Bajos (Sint Maarten).'},
 {nombre:'Montserrat',capital:'Plymouth (de iure) / Brades (de facto)',soberania:'Territorio británico de ultramar',region:'Caribe',nota:'Plymouth fue abandonada por la actividad volcánica; el gobierno opera desde Brades.'},
 {nombre:'Islas Turcas y Caicos',capital:'Cockburn Town',soberania:'Territorio británico de ultramar',region:'Caribe',nota:'Bajo soberanía británica.'},
];

/* ---------- Glosario ---------- */
const GLOSSARY=[
 ['País','Territorio con una comunidad política. En el uso cotidiano suele equivaler a un Estado soberano, aunque no siempre.'],
 ['Estado soberano','Entidad política con territorio definido, población, gobierno propio y capacidad de relacionarse con otros Estados. Los 35 de esta app.'],
 ['Capital','Ciudad donde reside la sede principal del gobierno de un Estado (o la designada oficialmente como tal).'],
 ['Sede de gobierno','Ciudad donde funcionan efectivamente los poderes del Estado, que puede no coincidir con la capital oficial (ej.: La Paz en Bolivia).'],
 ['Capital constitucional','Ciudad designada como capital por la constitución, aunque el gobierno opere en otra (ej.: Sucre en Bolivia).'],
 ['Territorio dependiente','Zona bajo soberanía de otro Estado, sin independencia plena (ej.: Puerto Rico, Guayana Francesa).'],
 ['Continente','Gran extensión de tierra. América abarca Norte, Centro, Sur y el Caribe.'],
 ['Subregión','División pedagógica o estadística de un continente (aquí: Norte, Central, Caribe, Sur).'],
 ['Frontera','Límite que separa el territorio de dos Estados.'],
 ['Coordenadas','Par de valores (latitud, longitud) que ubican un punto sobre la Tierra.'],
 ['Latitud','Distancia angular al norte o sur del ecuador (de -90° a +90°).'],
 ['Longitud','Distancia angular al este u oeste del meridiano de Greenwich (de -180° a +180°).'],
 ['Código ISO','Código estandarizado por ISO 3166 para países: alfa-2 (AR) y alfa-3 (ARG).'],
 ['GeoJSON','Formato basado en JSON para representar geometrías geográficas (puntos, líneas, polígonos).'],
 ['Mapa político','Representación que muestra países, fronteras y capitales, en vez de relieve o clima.'],
];

/* ---------- Fuentes ---------- */
const SOURCES={
  revision:'15 de julio de 2026',
  conjunto:'35 Estados independientes de América reconocidos como miembros de la Organización de los Estados Americanos (OEA).',
  clasificacion:'Clasificación pedagógica en cuatro subregiones: América del Norte (3), América Central (7), Caribe (13) y América del Sur (12). El Caribe se trata como subregión propia, no dentro de "Centro".',
  items:[
   ['Estados y soberanía','Organización de los Estados Americanos (OEA) — miembros.'],
   ['Códigos de país','ISO 3166-1 (alfa-2 y alfa-3).'],
   ['Agrupaciones regionales','Naciones Unidas — clasificación M49 (adaptada pedagógicamente).'],
   ['Geometrías / fronteras','Natural Earth, escala 1:50m (dominio público). Simplificadas para rendimiento.'],
   ['Contexto mundial del globo','Fronteras del resto del mundo derivadas de Natural Earth (dominio público), simplificadas a ~11 km. Solo sirven para ubicarse: no entran en el examen.'],
   ['Texturas del globo (relieve)','Imágenes de la Tierra de NASA Visible Earth / Blue Marble (dominio público), distribuidas con three-globe. Mapa diurno, luces nocturnas, mapa de alturas (bump) y máscara de agua.'],
   ['Retícula de coordenadas','Meridianos y paralelos calculados por la app. Trópicos a 23,4363° y círculos polares a 66,5637° (oblicuidad de la eclíptica, IERS).'],
   ['Banderas','flag-icons (lipis/flag-icons) — banderas en dominio público.'],
   ['Coordenadas','Coordenadas geográficas publicadas de capitales y puntos representativos de país.'],
   ['Caso Bolivia','Se distingue Sucre (capital constitucional) de La Paz (sede de los órganos Ejecutivo y Legislativo).'],
  ],
  licencias:'Natural Earth: dominio público. flag-icons: código MIT, banderas en dominio público. Texturas de la Tierra: NASA Visible Earth / Blue Marble, dominio público (empaquetadas con three-globe). globe.gl y three.js: licencia MIT. Contenido educativo original de esta aplicación. Todo se sirve localmente: en tiempo de ejecución la app no pide nada a Internet.',
  notas:'Los territorios dependientes (Puerto Rico, Guayana Francesa, etc.) se estudian en un módulo aparte y NUNCA se incluyen en el examen de los 35 Estados. En casos con matices políticos se usa lenguaje neutral y se indica la fuente.',
};
