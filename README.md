# Atlas América 3D

Aplicación web educativa para **estudiar, memorizar, practicar y evaluar los 35 Estados
independientes de América y sus capitales**, con un globo terráqueo 3D interactivo como
experiencia central. Español latinoamericano. Funciona **100 % offline** desde un servidor
local, sin cuentas, sin backend y sin claves.

Regiones cubiertas: **América del Norte (3) · América Central (7) · Caribe (13) · América del Sur (12)**.

---

## Cómo ejecutarla

La app necesita un **servidor local** (no alcanza con abrir `index.html` con doble clic, porque
carga la geometría del mapa por `fetch`, que el navegador bloquea sobre `file://`).

Elegí **una** de estas opciones, parada en la carpeta del proyecto:

**Node (incluido, sin dependencias):**
```powershell
node tools/serve.mjs 8080
```
Luego abrí http://localhost:8080

**Python:**
```powershell
python -m http.server 8080
```

**VS Code:** extensión *Live Server* → clic derecho sobre `index.html` → *Open with Live Server*.

Navegadores modernos: Chrome, Edge, Firefox, Safari.

---

## Qué incluye

- **Inicio** — portada con globo 3D, resumen de progreso y accesos rápidos.
- **Explorar** — globo interactivo (girar, zoom, seleccionar), buscador, filtros por región,
  **cinco estilos de globo** (Relieve, Satélite, Educativa, Política, Nocturna), **retícula de
  meridianos y paralelos** configurable, **etiquetas de país con bandera** siempre visibles,
  marca y nombre de cada capital, recorrido automático, alternativa 2D, y ficha completa de cada
  país (bandera, capital, ISO, ubicación, nota, mnemotecnia, pronunciación).
- **Aprender** — recorridos guiados por región y de norte a sur, con preguntas rápidas.
- **Tarjetas** — 6 modos (país↔capital, bandera, silueta, ubicación, mezcla) con repetición
  espaciada y calificación *Fácil / Dudé / No la sabía*.
- **Práctica** — 16 modos (A–P): opción múltiple, escritura, ubicar en el mapa/globo, banderas,
  siluetas, ordenar N→S, relacionar, contrarreloj, supervivencia, sin errores, repaso de fallos,
  desafío diario y respuesta por voz (experimental).
- **Evaluación** — constructor configurable (región, nº de preguntas, duración, dificultad, tipos,
  % de aprobación, modo examen/práctica, devolución inmediata/diferida) y evaluación final
  recomendada de 35 preguntas con cobertura equilibrada. Resultados con nota, precisión por
  región, mapa de dominio y repetición de errores.
- **Progreso** — dominio por país, precisión, rachas, tiempo de estudio, evolución de notas,
  errores frecuentes, matriz de dominio, logros y certificado 35/35.
- **Comparar** — dos países lado a lado + distancia entre capitales + línea en el globo.
- **Confusiones** — casos que suelen confundirse (Ottawa/Toronto, Sucre/La Paz, Dominica/Rep.
  Dominicana, las tres Guayanas, etc.).
- **Glosario · Territorios · Fuentes · Configuración/Accesibilidad.**

### El globo: relieve, retícula y capas

Todo se configura desde *Explorar → Capas y relieve del globo* o desde *Configuración → Globo y visuales*.

| Control | Qué hace |
|---|---|
| **Estilo del globo** | `Relieve` (terreno real con sombreado, por defecto) · `Satélite` (la Tierra sin colores por región) · `Educativa` (océano plano, máxima legibilidad) · `Política` (colores plenos, fronteras marcadas) · `Nocturna` (luces de las ciudades). |
| **Intensidad del relieve** | 0–100 %. Controla el `bumpScale` del terreno y la luz principal. Con 0 % el relieve se apaga. |
| **Meridianos y paralelos** | Retícula de coordenadas sobre el globo, con separación configurable (10°, 15°, 20° o 30°). |
| **Líneas con nombre** | Ecuador, Trópico de Cáncer, Trópico de Capricornio, Círculos Polares Ártico y Antártico, y meridiano de Greenwich (0°) / antimeridiano (180°). Los rótulos siguen a la cámara para quedar siempre legibles. |
| **Resto del mundo** | Dibuja los otros continentes como contexto. Nunca entran en el examen de los 35. |
| **Nombres / Banderas / Capitales** | Etiqueta de cada país con su bandera en miniatura, y marca ★ + nombre de su capital. Al pasar el mouse o tocar un país se resaltan el país y su capital. |

Las etiquetas usan **anticolisión**: si dos se pisan en pantalla, se muestra la de mayor prioridad
(seleccionada > país grande > país chico > capital) y el resto aparece al acercar el zoom.

La luz principal sigue a la cámara, así el hemisferio visible siempre está iluminado y el relieve
mantiene sus sombras.

En *Configuración → Diagnóstico* se puede revisar el estado real: WebGL, geometrías cargadas,
contexto mundial, retícula, `localStorage` y cada textura con su resolución.

Para depurar desde la consola del navegador, la instancia de Globe.GL queda expuesta en
`window.__globo` (por ejemplo `__globo.pathsData().length` o `__globo.globeMaterial().bumpScale`).

### Niveles de dificultad
Principiante (3 opciones, con pistas) · Intermedio (4 opciones) · Avanzado (respuesta escrita) ·
Experto (escrito + tiempo limitado).

### Caso Bolivia
Se distingue explícitamente **Sucre** (capital constitucional) de **La Paz** (sede de los órganos
Ejecutivo y Legislativo). Las preguntas especifican qué se pide y ninguna respuesta válida se
marca como incorrecta.

---

## Controles

- **Globo:** arrastrar para girar · rueda/pellizco para zoom · clic en un país para seleccionarlo.
- **Teclado:** `Tab` recorre controles y países (en el mapa 2D) · `Enter`/`Espacio` selecciona ·
  en opción múltiple, teclas `1`–`4` responden.
- **Barra superior:** botón de sonido (silenciado por defecto) y botón de accesibilidad/config.
- **Sin WebGL:** si el navegador no soporta WebGL, la app cambia automáticamente a un **mapa 2D
  accesible**; se puede estudiar y rendir la evaluación igual.

---

## Accesibilidad

- HTML semántico, jerarquía de encabezados y regiones ARIA.
- Navegación completa por teclado y foco visible.
- Anuncios con `aria-live` para respuestas y cambios de sección.
- Modo de **alto contraste**, **tamaño de texto** ajustable y **reducción de movimiento**
  (respeta `prefers-reduced-motion`).
- Nunca se depende solo del color: se usan íconos, patrones (○ ◔ ◑ ◕ ● ⟳) y texto.
- Alternativa 2D + lista/tabla al globo 3D.

---

## Privacidad

Todo el progreso, la configuración y el historial se guardan **solo en el `localStorage` de tu
navegador**. No se recopilan datos personales, no hay rastreadores y no se envía nada a ningún
servidor. Podés **exportar / importar / reiniciar** tus datos desde *Configuración*.

---

## Estructura del proyecto

```
atlas-america-3d/
├─ index.html                     # App completa (HTML + CSS + JS). Punto de entrada único.
├─ assets/
│  ├─ lib/globe.gl.min.js         # Globe.GL 2.46 (incluye three.js). MIT.
│  ├─ data/americas.geojson       # 35 países, Natural Earth 1:50m, filtrado y simplificado.
│  ├─ data/world.geojson          # 138 países del resto del mundo (contexto del globo).
│  ├─ textures/earth-day.jpg      # Mapa diurno de la Tierra (NASA, dominio público).
│  ├─ textures/earth-night.jpg    # Luces nocturnas (NASA, dominio público).
│  ├─ textures/earth-topology.png # Mapa de alturas usado como bump map del relieve.
│  ├─ textures/earth-water.png    # Máscara de agua: brillo especular del océano.
│  └─ flags/{iso2}.svg            # 35 banderas (dominio público, flag-icons).
├─ tools/
│  ├─ serve.mjs                   # Servidor estático de desarrollo (sin dependencias).
│  ├─ build-geojson.mjs           # Generó americas.geojson desde Natural Earth (no es runtime).
│  └─ build-world.mjs             # Generó world.geojson (contexto mundial). No es runtime.
└─ README.md
```

---

## Fuentes y metodología

- **Estados independientes:** miembros de la Organización de los Estados Americanos (OEA).
- **Códigos de país:** ISO 3166-1 (alfa-2 y alfa-3).
- **Agrupación regional:** clasificación pedagógica en 4 subregiones (adaptada de ONU M49).
- **Geometrías/fronteras:** [Natural Earth](https://www.naturalearthdata.com/) 1:50m — dominio público.
- **Banderas:** [flag-icons](https://github.com/lipis/flag-icons) — código MIT, banderas en dominio público.
- **Texturas del globo:** imágenes de la Tierra de **NASA Visible Earth / Blue Marble** (dominio
  público), distribuidas con [three-globe](https://github.com/vasturiano/three-globe). Se sirven
  desde `assets/textures/`: en tiempo de ejecución **no se pide nada a la red**.
- **Coordenadas:** coordenadas geográficas publicadas de capitales y puntos representativos.
- **Fecha de revisión de datos:** 15 de julio de 2026.

Los **territorios dependientes** (Puerto Rico, Guayana Francesa, Groenlandia, etc.) se estudian
en un módulo aparte y **nunca** entran en el examen de los 35 Estados. En casos con matices
políticos se usa lenguaje neutral y se indica la fuente. Ver la sección *Fuentes* dentro de la app.

### Librerías
- [Globe.GL](https://github.com/vasturiano/globe.gl) y [three.js](https://threejs.org/) — licencia MIT.
- El resto (interfaz, lógica educativa, gráficos de progreso en SVG) es código original de la app.

---

## Limitaciones conocidas

- La geometría 1:50m simplifica las islas pequeñas del Caribe (se ven como puntos). Es adecuado
  para el uso educativo y el rendimiento; las capitales igualmente se marcan y estudian.
- El **contexto mundial** (`world.geojson`) está simplificado a ~11 km de precisión: sirve para
  ubicarse, no para estudiar fronteras fuera de América.
- Si falta alguna textura en `assets/textures/`, la app avisa y cambia sola al estilo **Educativa**;
  el resto sigue funcionando igual.
- La **pronunciación** usa la Web Speech API y depende de las voces del sistema operativo; si no
  hay voz en español, degrada en silencio (siempre hay texto equivalente).
- La **respuesta por voz** (modo P) usa reconocimiento de voz del navegador, que puede requerir
  conexión y no está disponible en todos los navegadores; si falta, se responde escribiendo.
```
