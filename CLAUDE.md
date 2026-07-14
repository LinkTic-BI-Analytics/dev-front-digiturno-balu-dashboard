# CLAUDE.md — Digiturno Balú · Tablero de Operación (gerencial)

Contexto para agentes que desarrollen sobre este proyecto. Última actualización: 2026-07-14.

## Qué es este proyecto

Dashboard **gerencial** (toma de decisiones) de la operación de **Digiturno Balú**
(iniciativa de **Positiva**, aplicativo desarrollado por **LinkTic**): tickets, asesores,
mapa de calor por departamentos con drill-down 3D, y proyecciones estadísticas a 14 días.
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
   ▼ (servidor) /api/dataset: SELECT DISTINCT ON (ticket_id) 9 columnas →
     packDataset() → payload COLUMNAR con diccionarios (~2,7 MB crudo → ~0,9 MB gzip
     manual en la ruta; 136k tickets; carga fría e2e ~11 s) — cookie auth, 401 → login
   │
   ▼ (cliente) pipeline 100 % memoizado en DashboardDataProvider:
tickets → filterByPeriodo → filterByAsesor → ┬ geoStats (SIN filtro depto → mapa nacional)
                                             └ filterByDepartamento → computeMetricsResult
                                                                    → computeForecast
```

**El dedupe por ticket vive en SQL** (`DISTINCT ON`) — la vista une atenciones (N filas por
ticket) pero solo viajan campos de nivel ticket. La vista usa **LEFT JOINs**: puede venir
ticket con estado/asesor/sucursal null (hay 1 ticket huérfano real con sucursal inexistente:
el codec usa el id como nombre y `geo.ts` lo ignora defensivamente).

### Mapa de archivos clave

- `src/lib/config/sucursales.ts` — ★ fuente de verdad de las 35 sedes (id = `sucursal_id`
  de la vista, direcciones estandarizadas, lat/lng) + `SEDES_POR_DEPARTAMENTO`,
  `MESA_AYUDA_ID`, alias geojson (`BOGOTA`↔`SANTAFE DE BOGOTA D.C`…), `formatDepartamento()`
- `src/lib/config/business-rules.ts` — reglas CONFIRMADAS: cerrados=`finalizado`,
  desistidos=`cancelado`, noAsistidos=`no_asistio`, abiertos=`pendiente/llamando/atendiendo`;
  `apoyoOperativoSucursalId=MESA_AYUDA_ID`; **ANS = tiempo_ejecucion, objetivo 15 min**
- `src/lib/data/` — `dataset-codec.ts` (pack/decode columnar, `DATASET_SCHEMA_VERSION`
  invalida cachés IDB), `fetch-dataset.ts` (SQL + ping), `dataset-store.ts` (ciclo 3 min),
  `idb.ts` (IndexedDB tolerante a fallos), `demo-data.ts`
- `src/lib/metrics/` — `filter` / `series` / `tendencias` / `metricas` / `compute` / `geo`
  (agregación por departamento/sede) / `forecast` (estacionalidad semanal + regresión + σ →
  3 escenarios, insights narrativos; degrada con <14 días o <20 tickets) — todo puro
- `src/lib/map/departamentos-geo.ts` — geojson con `feature.id` explícito por índice
  (feature-state determinista) + bbox por depto
- `src/components/map/ControlMap.tsx` — choropleth por feature-state (`ansNorm` 0..1,
  verde→rojo; gris sin sedes), capa de sedes (circles ∝ √tickets), popups ricos, dblclick →
  drill-down 3D (fitBounds pitch 55 + fill-extrusion + dimmed). **Todo el estado del mapa se
  re-aplica en `style.load`** (cambio de tema) desde un objeto runtime mutable fuera de React
- `src/components/filters/` — `FiltersBar` (presets Última semana / Mes actual / Mes
  anterior / Todo + rango + chip de departamento) y `AsesorCombobox` (búsqueda por subcadena
  normalizando tildes)
- `src/components/proyecciones/` — ForecastChart (historia + banda ±1σ + 3 punteadas),
  ScenarioCards, WeekdayDemandChart (barras), InsightsPanel
- `src/providers/DashboardDataProvider.tsx` — pipeline de filtros/métricas (los datos viven
  en dataset-store); `ThemeProvider` — tema vía `useSyncExternalStore` sobre `.dark`
- Favicon: `src/app/icon.svg` (emblema Positiva). **No hay footer.**

## Identidad gráfica y theming

- Capa semántica derivada de los tokens Balú (modernizados) en `globals.css`:
  `--canvas/--surface*/--stroke*/--ink*/--brand*/--success*/--danger*/--warning*/--info*/--chart-*`
  para `:root` y `.dark`. Fuentes Montserrat + Poppins (`font-button`).
- Series de charts: `--chart-1`/`--chart-2` **validadas** con el skill dataviz en ambos temas.
  Escala del mapa de calor (`ANS_HEAT_STOPS` en ControlMap): verde=ágil → rojo=lento,
  colores fijos entre temas (pedido explícito del negocio; el ANS en minutos: subir = peor).
- Delta de tendencias: `TrendDelta` acepta `invert` (ANS: ↑rojo/↓verde).
- Mapa: claro = estilo compartido del proyecto, oscuro = `mapbox/dark-v11`.

## Decisiones de producto confirmadas (2026-07-14)

- Card **Nivel Satisfacción eliminada** (4 cards de tendencias; expandida = ⅔ + 3 apiladas).
- **Métricas**: cerrados · desistidos (`cancelado`) · **no asistidos** (`no_asistio`) ·
  abiertos · horas totales (sin card de tiempo promedio: vive en ANS).
- **Proyecciones**: escenarios con encuadre de capacidad (pesimista = +1σ = mayor carga).
- El término "asesores activos" no se usa en la UI.
- El CSV de sedes será eliminado: `sucursales.ts` es la fuente. Direcciones sospechosas
  anotadas en el archivo (BUENAVENTURA duplica la de CAD Bosa; SINCELEJO ambigua).

## Riesgos / notas

- Rol `readonly_bi_team` solo SELECT; grants de escritura del rol `anon` del API REST
  siguen en Supabase → recomendar al DBA revocarlos. Sin secretos en `.next/static` (verificado).
- Payload crece ~14 KB crudo/día: el esquema versionado permite migrar (piso de fecha o
  binario) sin romper cachés IDB.
- Si el volumen crece 5×, mover decode+compute a un Web Worker (lib/metrics ya es puro).

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
