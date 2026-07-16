# CLAUDE.md — Digiturno Balú · Tablero de Operación (gerencial)

Contexto para agentes que desarrollen sobre este proyecto. Última actualización: 2026-07-16.

## Qué es este proyecto

Dashboard **gerencial** (toma de decisiones) de la operación de **Digiturno Balú**
(iniciativa de **Positiva**, aplicativo desarrollado por **LinkTic**): tickets, asesores,
mapa de calor por departamentos con drill-down 3D, tabla de trazabilidad de tickets y
proyecciones estadísticas a 14 días.
UI 100 % en español (Colombia). Desarrollado por el equipo de **BI Analytics de LinkTic**.

## Stack

- **Next.js 16.2.10** (App Router, `src/app/`, Turbopack) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** (config CSS-first en `src/app/globals.css`) · **pnpm**
- **chart.js + react-chartjs-2** (línea + barras, registro tree-shaken) · **mapbox-gl v3** ·
  **motion** (FLIP de cards) · **pg** (Postgres directo, solo lectura, solo servidor)
- Guard de rutas: **`src/proxy.ts`** (convención Next 16)

## Comandos

```bash
pnpm dev / build / lint / start
```

## Variables de entorno (`.env`, ver `.env.example`)

| Variable | Ámbito | Descripción |
|---|---|---|
| `TOKEN_DIGITURNO_BALU` | servidor | Token maestro: valida login y firma la cookie HMAC. Jamás al cliente. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | cliente | Token pk. de Mapbox (restringir por dominio). |
| `DEMO_MODE` | servidor | `true` = datos simulados (usa sedes/estados REALES) sin `DATABASE_URL`. |
| `DATABASE_URL` | servidor | Postgres vía **Session Pooler** de Supabase, rol `readonly_bi_team` (solo SELECT). |

Prioridad de fuente en `/api/dataset`: **DATABASE_URL > DEMO_MODE > vacío**.

## Arquitectura (caché de dataset en el cliente)

```
Login (/) ─token─▶ Server Action ─▶ cookie httpOnly balu_session (HMAC, 12 h)
/dashboard ◀─ src/proxy.ts
   │
   ▼ primer acceso: LoadingGate (emblema animado) mientras carga el dataset completo
dataset-store (módulo + useSyncExternalStore)
   ├─ bootstrap: hidrata desde IndexedDB (F5 → dashboard en ~0,1 s) + revalida
   ├─ ciclo 3 min: GET /api/health (ping barato) → GET /api/dataset → decode fuera de
   │  React → swap atómico de `tickets` (doble búfer) → persiste IDB
   ├─ fallo (502/red): datos intactos + "Sin conexión — reintentando" + retry al ciclo
   └─ logout: disposeDatasetCache() limpia IDB
   │
   ▼ (servidor) /api/dataset: SELECT DISTINCT ON (ticket_id) 12 columnas →
     packDataset() → payload COLUMNAR con diccionarios (v2: ~4,6 MB crudo → ~1,4 MB gzip
     manual en la ruta; 136k tickets) — cookie auth, 401 → login
   │
   ▼ (cliente) pipeline 100 % memoizado en DashboardDataProvider:
tickets → filterByPeriodo → filterByAsesor → filterBySucursal
                                             ┬ geoStats (SIN filtro depto → mapa nacional)
                                             └ filterByDepartamento → computeMetricsResult
                                                                    → computeForecast
                                                                    → TicketsTable (drill-down)
```

**Filtro de sucursal (2026-07-16)**: `selectSucursal(id)` fija `sucursalId` + el
`departamento` de la sede (drill-down automático del mapa) y limpia el asesor huérfano;
`selectSucursal(null)` vuelve a vista nacional; `selectDepartamento` conserva la sucursal
solo si pertenece al nuevo departamento. Con sucursal activa el resto del país queda "sin
datos" en el mapa — coherente con el filtro de asesor.

**El dedupe por ticket vive en SQL** (`DISTINCT ON`) — la vista une atenciones (N filas por
ticket). El `ORDER BY ticket_id, subtramite_inicio ASC NULLS LAST` hace determinista la fila
ganadora: la **primera atención** (de ahí sale `tramite_nombre`; el resto de columnas son de
nivel ticket). La vista usa **LEFT JOINs**: puede venir ticket con estado/asesor/sucursal
null (hay 1 ticket huérfano real con sucursal inexistente: el codec usa el id como nombre y
`geo.ts` lo ignora defensivamente).

**Payload v2** (`DATASET_SCHEMA_VERSION = 2`): además de dia/suc/ase/est/esp/eje trae
`tur` (turno_completo, columna plana: alta cardinalidad), `tra` + dict `tramites` (solo 8
distintos) e `ini` (hora de inicio de atención en **minutos del día, ya convertida a
Bogotá** — `ticket_inicio` es timestamptz UTC, verificado con muestreo de distribución
horaria). Alimentan la tabla "Detalle de tickets", visible solo con departamento enfocado
o asesor seleccionado (orden por columna + paginación de 10, client-side sobre copia de
`filteredTickets` — nunca mutar el array compartido).

### Mapa de archivos clave

- `src/lib/config/sucursales.ts` — ★ fuente de verdad de las 35 sedes (id = `sucursal_id`
  de la vista, direcciones estandarizadas, lat/lng) + `SEDES_POR_DEPARTAMENTO`,
  `MESA_AYUDA_ID`, alias geojson (`BOGOTA`↔`SANTAFE DE BOGOTA D.C`…), `formatDepartamento()`
  → SIEMPRE MAYÚSCULAS con tildes ("BOGOTÁ D.C.", pedido del negocio 2026-07-15)
- `src/lib/config/business-rules.ts` — reglas CONFIRMADAS: cerrados=`finalizado`,
  desistidos=`cancelado`, noAsistidos=`no_asistio`, abiertos=`pendiente/llamando/atendiendo`;
  `apoyoOperativoSucursalId=MESA_AYUDA_ID`; **ANS = tiempo_ejecucion, objetivo 15 min**
- `src/lib/festivos.ts` — ★ calendario laboral colombiano CALCULADO (computus de Pascua +
  Ley Emiliani + fijos; **18 festivos/año, 19 desde 2026**: la Ley 2578 de 2026 añadió el
  9 de julio trasladable a lunes — en 2026 fue el lunes 13 jul, verificado 0 tickets en BD.
  Cache por año; en 2025 hay 17 FECHAS distintas porque San Pedro y Sagrado Corazón
  colisionaron en jun 30 — correcto, el set deduplica). **Todos los ejes de días del
  tablero son DÍAS HÁBILES** (`esDiaHabil`, `enumerateDiasHabiles`, `addDiasHabiles`,
  `lastNDiasHabiles`, `countDiasHabiles`): la operación no gestiona Sáb/Dom/festivos
  (verificado en datos: 0,05 %). Los tickets de días no hábiles SIGUEN contando en
  totales/buckets/horas/tabla; solo salen de series, promedios y forecast.
- `src/lib/data/` — `dataset-codec.ts` (pack/decode columnar, `DATASET_SCHEMA_VERSION`
  invalida cachés IDB), `fetch-dataset.ts` (SQL + ping), `dataset-store.ts` (ciclo 3 min),
  `idb.ts` (IndexedDB tolerante a fallos), `demo-data.ts`
- `src/lib/metrics/` — `filter` / `series` / `tendencias` / `metricas` / `compute` (eje =
  días hábiles vía `resolveDias`) / `geo` (agregación por departamento/sede) / `forecast`
  (TODO en días hábiles: estacionalidad Lun–Vie + regresión + σ → escenarios
  **mínimo/base/máximo** a 14 días hábiles con `addDiasHabiles`, `demandaActualDia` para
  la comparativa hoy→proyección, insights narrativos; degrada con <10 días hábiles o
  <20 tickets) — todo puro. En la UI los escenarios se llaman Mínimo/Base/Máximo esperado,
  SIN jerga σ.
- `src/lib/map/departamentos-geo.ts` — geojson con `feature.id` explícito por índice
  (feature-state determinista) + bbox por depto
- `src/components/map/ControlMap.tsx` — choropleth por feature-state (`ansNorm` 0..1,
  verde→rojo; gris sin sedes), capa de sedes (circles ∝ √tickets, SOLO vista nacional),
  dblclick → drill-down 3D (fitBounds pitch 55 + fill-extrusion + dimmed). **En drill-down**:
  las circles se ocultan y una capa symbol `sedes-3d` con **`symbol-z-elevate: true`** posa
  SOLO las sedes del departamento (sprites canvas pre-tintados por bucket de ANS + etiqueta
  con el nombre) **en el TECHO de la extrusión**; el popup hover de departamento se
  DESACTIVA (la info vive en `DepartamentoInfoCard`). **Todo el estado del mapa se re-aplica
  en `style.load`** (cambio de tema) desde un objeto runtime mutable fuera de React —
  incluidas las imágenes (`ensureSedeImages`: `addImage` NO sobrevive a `setStyle`; red de
  seguridad con `styleimagemissing`).
- `src/components/map/DepartamentoInfoCard.tsx` — card fija del drill-down (abajo-derecha
  en ≥sm, en flujo bajo el mapa en móvil) con las cifras del departamento; `MapLegend`
  rediseñada (Ágil/Medio/Lento + swatches, compactable) abajo-izquierda con el mismo patrón
  responsive (overlays en `MapSection` con `sm:absolute`, flujo normal en `<sm`).
- `src/components/filters/` — `FiltersBar` (card full-width: grupos etiquetados
  Periodo/Sucursal/Asesor, segmented control de presets — 2×2 en móvil —, fila de resumen
  con días hábiles + chip de depto + "Limpiar todo") y `FilterCombobox` GENÉRICO (búsqueda
  por subcadena normalizando tildes, opción con `detalle` secundario; instanciado para las
  35 sucursales —con su departamento— y para asesores **acotados a la sucursal o al
  departamento enfocado** — el provider limpia filtros huérfanos al enfocar)
- `src/components/tickets/` — `TicketsSection` (subtítulo contextual + estado vacío),
  `TicketsTable` (8 columnas: Turno/Fecha·hora/Sucursal/Asesor/Trámite/Estado/Espera/
  Atención con punto ANS; sort por columna con nulls al final; reset de página con el patrón
  "ajuste de estado durante render", sin efectos), `EstadoBadge` (tonos por bucket de
  business-rules), `TablePagination`
- `src/components/proyecciones/` — ForecastChart (historia con gradiente + base punteada +
  banda mín–máx; las líneas de límites van en NEUTRO `--ink-mute`: el trío verde/rojo/naranja
  FALLA la validación CVD del skill dataviz — la identidad la dan posición, banda y leyenda),
  ScenarioCards (Mínimo/Base/Máximo + "±X% vs hoy"), WeekdayDemandChart (5 barras Lun–Vie),
  InsightsPanel (tiles comparativos "Hoy → En 14 días hábiles" con TrendDelta + narrativa)
- `src/providers/DashboardDataProvider.tsx` — pipeline de filtros/métricas (los datos viven
  en dataset-store); `ThemeProvider` — tema vía `useSyncExternalStore` sobre `.dark`
- Favicon: `src/app/icon.svg` (emblema Positiva). **No hay footer.**

## Identidad gráfica y theming

- Capa semántica derivada de los tokens Balú (modernizados) en `globals.css`:
  `--canvas/--surface*/--stroke*/--ink*/--brand*/--success*/--danger*/--warning*/--info*/--chart-*`
  para `:root` y `.dark`. Fuentes Montserrat + Poppins (`font-button`).
- **Refresh 2026-07-15 ("temas vivos")**: `--canvas-glow` (lavado radial cálido en el body,
  `background-attachment: fixed`), dark con superficies más cálidas (#1e1c19/#27231c),
  strokes más definidos, success/danger más vivos y **sombras por capas + highlight inset**
  (recuperan elevación); `.card-lift` (hover translateY(−2px), respeta reduced-motion —
  NUNCA en la card de filtros ni en TrendCard), `verticalAreaFill()` en charts (gradiente
  0.22→0), `SectionTitle` (barra de acento brand), glow del LiveIndicator, segmented activo
  y chips brand con gradiente, hairline brand bajo el header.
- Series de charts: `--chart-1`/`--chart-2` **validadas** con el skill dataviz en ambos temas
  (re-validadas contra la surface oscura nueva; `--chart-axis` dark ≥3,5:1). Las líneas
  mín/máx del forecast usan `--ink-mute` (ver proyecciones).
  Escala del mapa de calor (`ANS_HEAT_STOPS` en ControlMap): verde=ágil → rojo=lento,
  colores fijos entre temas (pedido explícito del negocio; el ANS en minutos: subir = peor).
- Delta de tendencias: `TrendDelta` acepta `invert` (ANS: ↑rojo/↓verde).
- Mapa: claro = estilo compartido del proyecto, oscuro = `mapbox/dark-v11`.

## Decisiones de producto confirmadas (2026-07-14/15)

- Card **Nivel Satisfacción eliminada** (4 cards de tendencias; expandida = ⅔ + 3 apiladas).
- **Métricas**: cerrados · desistidos (`cancelado`) · **no asistidos** (`no_asistio`) ·
  abiertos · horas totales (sin card de tiempo promedio: vive en ANS).
- **Proyecciones**: escenarios renombrados a Mínimo/Base/Máximo (2026-07-15; internamente
  mínimo = base−σ, máximo = base+σ — la σ no se muestra en la UI).
- El término "asesores activos" no se usa en la UI.
- El CSV de sedes será eliminado: `sucursales.ts` es la fuente. BUENAVENTURA corregida con
  dato oficial (2026-07-16: Calle 2A # 3 - 19, lat 3.88988, lng −77.07948); SINCELEJO sigue
  con dirección ambigua interpretada.
- **Tema OSCURO por defecto** (2026-07-16): el script anti-FOUC aplica `.dark` salvo
  `localStorage["balu-theme"]==="light"`; `getServerSnapshot()` devuelve `"dark"`.
- **Departamentos SIEMPRE en MAYÚSCULAS** en la UI (con tildes).
- **Toda cifra lleva unidad o leyenda**: cards de tendencias con `leyenda` bajo el valor
  (la de Asesores dice "Tickets promedio por asesor" — el valor NO es un conteo), sub-
  indicadores con sufijo ("15 días", "355,2 tickets"), las 5 métricas con `detalle`.
- **Tabla "Detalle de tickets"** solo en drill-down (departamento o asesor): panorama
  general → detalle. Paginación fija de 10, orden default fecha desc.
- **Días hábiles (2026-07-15)**: Sáb/Dom/festivos colombianos fuera de TODOS los ejes de
  días (series, "Promedio por día hábil", deltas, forecast). El salto de cifras vs antes
  (+~40 % en promedios) es esperado: el denominador ya no incluye días en cero.
- **Escenarios del forecast**: Mínimo / Base / Máximo esperado (sin σ en la UI); la lectura
  gerencial compara explícitamente Hoy → En 14 días hábiles ("Demanda diaria", "Tiempo de
  atención (ANS)", "Tickets por asesor al día" — antes "Carga proyectada por asesor" — y
  "Día pico de demanda").

## Riesgos / notas

- Rol `readonly_bi_team` solo SELECT; grants de escritura del rol `anon` del API REST
  siguen en Supabase → recomendar al DBA revocarlos. Sin secretos en `.next/static` (verificado).
- Payload v2 = ~1,4 MB gzip y crece ~25 KB crudo/día: el esquema versionado permite migrar
  (piso de fecha o binario) sin romper cachés IDB. Próxima válvula si pesa: piso de fecha.
- Si el volumen crece 5×, mover decode+compute a un Web Worker (lib/metrics ya es puro).
- La vista NO expone datos del ciudadano ni `created_at` del ticket (y está prohibido
  modificarla): la tabla de detalle muestra lo que existe (turno, hora de inicio, trámite).

## Gotchas aprendidos

- Next 16: `"use server"` solo exporta funciones async (constantes → `login-state.ts`).
- ESLint Next 16: sin `setState` síncrono en efectos, sin escribir refs en render, y las
  funciones usadas por efectos deben declararse antes (o vivir a nivel de módulo, como en
  ControlMap con su objeto `MapRuntime`).
- `readChartTheme()` necesita fallback SSR (`getComputedStyle` no existe en servidor).
- `pg` devuelve NUMERIC como string y DATE como Date → castear en SQL (`::float8`, `::text`).
- Pooler de Supabase: TLS con `ssl: { rejectUnauthorized: false }`; usar SIEMPRE el session
  pooler (`aws-0-us-east-2.pooler.supabase.com:5432`, usuario `readonly_bi_team.<ref>`).
- mapbox-gl: los listeners delegados por capa sobreviven a `setStyle`, pero fuentes, capas,
  feature-states, filtros y extrusiones NO → re-aplicar todo en `style.load`.
- `interpolate` sobre feature-state null lanza error → `coalesce` + centinela −1.
- `next start` no comprime route handlers → gzip manual con `Content-Encoding` en /api/dataset.
- Playwright: `mouse.dblclick` no hace scroll automático — llevar el mapa al viewport antes.
- `buildLineOptions` es `ChartOptions<"line">`: los charts de barras arman sus opciones aparte.
- `Math.max(...array)` revienta la pila con >100k elementos (preset "Todo") → min/max en
  una pasada (`tendencias.ts`).
- Animación con `fill-mode: both` que termina en `transform: translateY(0)` deja un
  **stacking context permanente** → los dropdowns quedan tapados por secciones posteriores
  del DOM. El keyframe debe terminar en `transform: none` (+ `relative z-20` en la Section
  de filtros como cinturón durante la animación).
- `ticket_inicio`/`subtramite_inicio` son **timestamptz en UTC** → convertir con
  `AT TIME ZONE 'America/Bogota'` en SQL antes de extraer hora/minuto.
- El trámite es de nivel ATENCIÓN (joins atenciones→subtramites→tramites): con
  `DISTINCT ON (ticket_id)` hay que ordenar por `subtramite_inicio` para elegir fila
  determinista; ordenar por `ticket_inicio` NO sirve (es igual en todas las filas del ticket).
- Reset de estado dependiente de props sin efectos: patrón "ajuste durante render"
  (`if (prev !== actual) { setPrev(actual); setPage(1); }`) — pasa el lint de React estricto.
- El pooler de Supabase tiene días lentos: la misma query pasó de ~7 s a ~100 s (con 502
  por `statement timeout`, código PG 57014) en horas pico. El ciclo degrada con gracia
  (datos intactos + retry); para e2e usar DEMO_MODE si la BD está lenta.
- Scriptable `backgroundColor` de chart.js: `chartArea` es `undefined` en el primer render
  → fallback al fill plano y cachear el gradiente por dimensiones (`verticalAreaFill`).
- El trío verde/naranja/rojo como SERIES de un chart falla la validación dataviz (CVD en
  claro, piso normal-vision en oscuro; no existe combinación legal rojo/naranja en dark) →
  límites del forecast en `--ink-mute` neutro.
- `map.addImage` NO sobrevive a `setStyle`: regenerar sprites en cada `setupLayers`
  (style.load) con `hasImage→removeImage→addImage` + listener `styleimagemissing`.
- `queryRenderedFeatures` con un layer id inexistente LANZA error → filtrar los ids con
  `map.getLayer(id)` antes de consultar.
- Los festivos por año se comparan como FECHAS distintas: en años con colisión de traslados
  (2025: San Pedro + Sagrado Corazón ambos en jun 30) el set tiene menos entradas que
  festivos "de calendario" — no es un bug.
