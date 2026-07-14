# Digiturno Balú — Tablero de Operación

Dashboard **gerencial** de la operación de **Digiturno Balú** (iniciativa de **Positiva**):
panorama nacional de tickets y asesores, mapa de calor por departamentos con drill-down 3D
y proyecciones estadísticas para la toma de decisiones.
Desarrollado por el equipo de **BI Analytics de LinkTic**.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Características

- 🔐 **Login con token maestro**: sesión HMAC httpOnly (12 h), rutas protegidas por
  `src/proxy.ts`, modal de acceso denegado y transición animada de ingreso.
- ⚡ **Caché de dataset en el cliente**: el histórico completo (~136k tickets) viaja una vez
  en formato columnar comprimido (~0,9 MB gzip), se refresca en background cada **3 min**
  (ping + doble búfer, sin parpadeos) y persiste en **IndexedDB**: tras un F5 el dashboard
  aparece en ~0,1 s. Gate de carga animado solo en el primer acceso. Los filtros son
  **instantáneos** (pipeline client-side memoizado).
- 📊 **Tendencias (4 cards interactivas)**: Tickets, Apoyo Operativo (sucursal MESA AYUDA),
  Asesores y **ANS · Tiempo de atención** (objetivo 15 min, delta invertido: subir = rojo).
  Expansión animada a ⅔ con gráfica detallada.
- 🗺️ **Mapa de Control gerencial**: choropleth por ANS (verde = ágil → rojo = lento),
  departamentos sin sedes en gris, leyenda con escala real, sedes como puntos (tamaño ∝
  tickets) con popups de dirección y métricas, popups de departamento con acumulados, y
  **doble clic → drill-down 3D** (cámara inclinada + extrusión) que filtra TODO el tablero;
  botón "← Volver a nacional".
- 📅 **Filtros**: presets Última semana / Mes actual / Mes anterior / Todo, rango
  personalizado, **combobox de asesores con búsqueda** (subcadena, ignora tildes) y chip del
  departamento enfocado. Todo el dashboard reacciona a los tres filtros combinados.
- 📈 **Proyecciones a 14 días**: estacionalidad semanal + regresión sobre serie
  desestacionalizada + σ de residuales → escenarios optimista/base/pesimista con banda de
  incertidumbre, demanda por día de la semana, ANS proyectado, carga por asesor y lectura
  gerencial narrativa. Degrada con historia insuficiente.
- 📉 **Métricas**: cerrados, desistidos (`cancelado`), **no asistidos** (`no_asistio`),
  abiertos y horas totales en atención.
- 🌗 Tema claro/oscuro (el mapa alterna de estilo conservando choropleth y selección),
  100 % responsivo, favicon con el emblema de Positiva.

## Inicio rápido

```bash
pnpm install
cp .env.example .env   # completar valores
pnpm dev               # http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `TOKEN_DIGITURNO_BALU` | Token maestro de acceso (solo servidor). |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Token público de Mapbox (restringir por dominio). |
| `DEMO_MODE` | `true` = datos simulados con sedes reales cuando no hay `DATABASE_URL`. |
| `DATABASE_URL` | Postgres directo (Session Pooler de Supabase) con rol de **solo lectura**. |

## Fuente de datos

Única fuente: la vista **`gestion_turnos.vw_reporte_atenciones_v2`** ([db/context.sql](db/context.sql)),
consultada con SQL directo (rol `readonly_bi_team`, **solo SELECT**). El servidor deduplica
por ticket en el origen (`DISTINCT ON`) y responde `/api/dataset` en formato columnar con
diccionarios; `/api/health` hace el ping del ciclo de refresco. La vista usa LEFT JOINs:
los campos pueden venir null y el pipeline es defensivo.

Las 35 sedes (id, departamento, dirección estandarizada, coordenadas) viven hardcodeadas en
[src/lib/config/sucursales.ts](src/lib/config/sucursales.ts) — fuente de verdad del match
geográfico (el `id` coincide con `sucursal_id` de la vista).

## Arquitectura (resumen)

```
src/
├── proxy.ts                    # Guard de /dashboard (Next 16)
├── app/                        # Login (/), /dashboard, /api/dataset, /api/health, icon.svg
├── components/                 # auth · dashboard (LoadingGate) · layout · filters ·
│                               # tendencias · map (choropleth+3D) · metricas · proyecciones · ui
├── providers/                  # ThemeProvider · DashboardDataProvider (pipeline de filtros)
├── lib/
│   ├── auth/                   # Sesión HMAC + server actions
│   ├── config/                 # business-rules (confirmadas) · sucursales (35 sedes) · constants
│   ├── data/                   # fetch-dataset (SQL) · dataset-codec (columnar) ·
│   │                           # dataset-store (ciclo 3 min + doble búfer) · idb · demo-data
│   ├── map/                    # Loader del geojson (ids deterministas + bbox)
│   └── metrics/                # filter · series · tendencias · metricas · compute · geo · forecast
└── types/                      # Ticket, DatasetPayload, FilterState, MetricsResult…
```

Contexto completo para desarrollo (decisiones, gotchas, riesgos): **[CLAUDE.md](CLAUDE.md)**.

## Reglas de negocio (confirmadas)

- **ANS = tiempo de atención** (`tiempo_ejecucion`), objetivo **15 min**. El mapa de calor
  pinta rojo el departamento más lento y verde el más ágil.
- **Apoyo Operativo** = tickets de la sucursal **MESA AYUDA** (match por `sucursal_id`).
- Estados: cerrados = `finalizado` · desistidos = `cancelado` · no asistidos = `no_asistio` ·
  abiertos = `pendiente`, `llamando`, `atendiendo`.

## Despliegue (Vercel)

Configurar las variables de entorno y `pnpm build` limpio. El favicon es
[src/app/icon.svg](src/app/icon.svg) (emblema Positiva).

---

Desarrollado por el equipo de **BI Analytics de LinkTic** · Digiturno Balú · Positiva
