"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { MapPinIcon } from "@/components/ui/icons";
import {
  COLOMBIA_BOUNDS,
  DRILLDOWN_BEARING,
  DRILLDOWN_EXTRUSION_HEIGHT,
  DRILLDOWN_PITCH,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
} from "@/lib/config/constants";
import {
  SEDES_POR_DEPARTAMENTO,
  SUCURSALES,
  formatDepartamento,
} from "@/lib/config/sucursales";
import { formatEntero, formatMinutos, formatPorcentaje } from "@/lib/format";
import {
  loadDepartamentosGeo,
  type DepartamentosGeo,
} from "@/lib/map/departamentos-geo";
import type { GeoStats } from "@/lib/metrics/geo";
import { useTheme } from "@/providers/ThemeProvider";
import type { FeatureCollection } from "geojson";

const SOURCE_DEPTOS = "departamentos";
const SOURCE_SEDES = "sedes";
const LAYER_FILL = "departamentos-fill";
const LAYER_LINE = "departamentos-line";
const LAYER_EXTRUSION = "departamentos-extrusion";
const LAYER_SEDES = "sedes-circles";

/** Escala del mapa de calor: verde = ANS más bajo (ágil) → rojo = más alto (lento). */
export const ANS_HEAT_STOPS: [number, string][] = [
  [0, "#15803d"],
  [0.25, "#65a30d"],
  [0.5, "#eab308"],
  [0.7, "#f59e0b"],
  [0.85, "#ea580c"],
  [1, "#dc2626"],
];

const COLOR_SIN_SEDES = "#a8a29e";
const COLOR_SIN_DATOS = "#d6d3d1";

/**
 * Estado mutable del mapa fuera de React: los handlers de mapbox (delegados,
 * sobreviven a los cambios de estilo) y las funciones de pintado leen siempre
 * la versión vigente sin re-registrarse.
 */
interface MapRuntime {
  geo: DepartamentosGeo | null;
  geoStats: GeoStats;
  selected: string | null;
  ready: boolean;
  onSelect: (departamento: string | null) => void;
}

interface ControlMapProps {
  geoStats: GeoStats;
  /** Departamento canónico enfocado (drill-down 3D) o null = vista nacional. */
  selectedDepartamento: string | null;
  onSelectDepartamento: (departamento: string | null) => void;
}

export function ControlMap({
  geoStats,
  selectedDepartamento,
  onSelectDepartamento,
}: ControlMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const appliedStyleRef = useRef("");
  const runtimeRef = useRef<MapRuntime>({
    geo: null,
    geoStats,
    selected: selectedDepartamento,
    ready: false,
    onSelect: onSelectDepartamento,
  });

  const { theme } = useTheme();
  const tokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    runtimeRef.current.onSelect = onSelectDepartamento;
  }, [onSelectDepartamento]);

  // ── Inicialización única ────────────────────────────────────────────────
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !containerRef.current) return;

    const runtime = runtimeRef.current;
    mapboxgl.accessToken = token;
    const initialStyle = document.documentElement.classList.contains("dark")
      ? MAP_STYLE_DARK
      : MAP_STYLE_LIGHT;
    appliedStyleRef.current = initialStyle;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialStyle,
      bounds: COLOMBIA_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-left",
    );
    // El doble clic pertenece al drill-down, no al zoom.
    map.doubleClickZoom.disable();

    // Al cambiar de estilo se pierden capas y feature-states: se re-aplica todo.
    map.on("style.load", () => {
      runtime.ready = false;
      void setupLayers(map, runtime);
    });

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
      maxWidth: "320px",
      className: "balu-map-popup",
    });
    let hoveredId: number | null = null;

    const clearHover = () => {
      if (hoveredId !== null && map.getSource(SOURCE_DEPTOS)) {
        map.setFeatureState(
          { source: SOURCE_DEPTOS, id: hoveredId },
          { hover: false },
        );
      }
      hoveredId = null;
    };

    map.on("mousemove", LAYER_FILL, (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.id === undefined) return;

      // Si el puntero está sobre una sede, su popup tiene prioridad.
      if (map.getLayer(LAYER_SEDES)) {
        const sedes = map.queryRenderedFeatures(event.point, {
          layers: [LAYER_SEDES],
        });
        if (sedes.length > 0) return;
      }

      if (feature.id !== hoveredId) {
        clearHover();
        hoveredId = feature.id as number;
        map.setFeatureState(
          { source: SOURCE_DEPTOS, id: hoveredId },
          { hover: true },
        );
      }

      map.getCanvas().style.cursor = "pointer";
      const info = runtime.geo?.byId.get(feature.id as number);
      if (info) {
        popup
          .setLngLat(event.lngLat)
          .setHTML(departamentoPopupHtml(info.canonico, runtime.geoStats))
          .addTo(map);
      }
    });

    map.on("mouseleave", LAYER_FILL, () => {
      clearHover();
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("mousemove", LAYER_SEDES, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = "pointer";
      popup
        .setLngLat(event.lngLat)
        .setHTML(sedePopupHtml(feature.properties as SedeProperties))
        .addTo(map);
    });

    map.on("dblclick", LAYER_FILL, (event) => {
      event.preventDefault();
      const featureId = event.features?.[0]?.id;
      if (featureId === undefined) return;
      const info = runtime.geo?.byId.get(featureId as number);
      // Departamentos sin sedes no tienen drill-down.
      if (!info || !SEDES_POR_DEPARTAMENTO.has(info.canonico)) return;
      runtime.onSelect(info.canonico);
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      popup.remove();
      map.remove();
      mapRef.current = null;
      runtime.ready = false;
    };
  }, []);

  // ── Tema → estilo del mapa ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
    if (target === appliedStyleRef.current) return;
    appliedStyleRef.current = target;
    map.setStyle(target);
  }, [theme]);

  // ── Datos → choropleth + sedes ──────────────────────────────────────────
  useEffect(() => {
    const runtime = runtimeRef.current;
    runtime.geoStats = geoStats;
    const map = mapRef.current;
    if (map && runtime.ready && runtime.geo) {
      applyGeoStats(map, runtime.geo, geoStats);
    }
  }, [geoStats]);

  // ── Selección → extrusión + atenuado + cámara ───────────────────────────
  useEffect(() => {
    const runtime = runtimeRef.current;
    const previous = runtime.selected;
    runtime.selected = selectedDepartamento;
    const map = mapRef.current;
    if (!map || !runtime.ready || !runtime.geo) return;
    applySelectionPaint(map, runtime.geo, selectedDepartamento);
    if (previous !== selectedDepartamento) {
      applySelectionCamera(map, runtime.geo, selectedDepartamento);
    }
  }, [selectedDepartamento]);

  if (tokenMissing) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-card border border-stroke bg-surface-2 p-8">
        <div className="max-w-sm text-center text-ink-mute">
          <MapPinIcon className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm font-medium">
            El mapa requiere la variable de entorno{" "}
            <code className="text-xs">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden rounded-card border border-stroke shadow-card">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// ── Capas y pintado (fuera de React: reciben el estado explícitamente) ────

const heatInterpolation = (input: unknown[]) => [
  "interpolate",
  ["linear"],
  input,
  ...ANS_HEAT_STOPS.flat(),
];

/** Color por feature-state: gris sin sedes, gris claro sin datos, calor por ANS. */
const heatColorExpression = () =>
  [
    "case",
    ["!", ["to-boolean", ["feature-state", "conSedes"]]],
    COLOR_SIN_SEDES,
    ["<", ["coalesce", ["feature-state", "ansNorm"], -1], 0],
    COLOR_SIN_DATOS,
    heatInterpolation(["coalesce", ["feature-state", "ansNorm"], 0]),
  ] as unknown as mapboxgl.ExpressionSpecification;

async function setupLayers(map: mapboxgl.Map, runtime: MapRuntime): Promise<void> {
  try {
    runtime.geo = await loadDepartamentosGeo();
  } catch (error) {
    console.error("[ControlMap] geojson:", error);
    return;
  }
  if (!map.getStyle() || map.getSource(SOURCE_DEPTOS)) return;

  map.addSource(SOURCE_DEPTOS, {
    type: "geojson",
    data: runtime.geo.collection,
  });
  map.addSource(SOURCE_SEDES, {
    type: "geojson",
    data: buildSedesCollection(runtime.geoStats),
  });

  map.addLayer({
    id: LAYER_FILL,
    type: "fill",
    source: SOURCE_DEPTOS,
    paint: {
      "fill-color": heatColorExpression(),
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "dimmed"], false],
        0.14,
        ["boolean", ["feature-state", "hover"], false],
        0.78,
        0.6,
      ],
    },
  });

  map.addLayer({
    id: LAYER_LINE,
    type: "line",
    source: SOURCE_DEPTOS,
    paint: {
      "line-color": "#78716c",
      "line-width": 0.8,
      "line-opacity": 0.5,
    },
  });

  map.addLayer({
    id: LAYER_EXTRUSION,
    type: "fill-extrusion",
    source: SOURCE_DEPTOS,
    filter: ["==", ["id"], -1],
    paint: {
      "fill-extrusion-color": heatColorExpression(),
      "fill-extrusion-height": DRILLDOWN_EXTRUSION_HEIGHT,
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.9,
    },
  });

  const surface =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--surface")
      .trim() || "#ffffff";

  map.addLayer({
    id: LAYER_SEDES,
    type: "circle",
    source: SOURCE_SEDES,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["sqrt", ["get", "tickets"]],
        0,
        3.5,
        10,
        6,
        40,
        10,
        130,
        16,
      ],
      "circle-color": [
        "case",
        ["<", ["get", "ansNorm"], 0],
        COLOR_SIN_SEDES,
        heatInterpolation(["get", "ansNorm"]),
      ] as unknown as mapboxgl.ExpressionSpecification,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": surface,
      "circle-opacity": 0.92,
    },
  });

  runtime.ready = true;
  applyGeoStats(map, runtime.geo, runtime.geoStats);
  applySelectionPaint(map, runtime.geo, runtime.selected);
}

function applyGeoStats(
  map: mapboxgl.Map,
  geo: DepartamentosGeo,
  stats: GeoStats,
): void {
  const { ansMin, ansMax } = stats;
  const span =
    ansMin !== null && ansMax !== null && ansMax > ansMin ? ansMax - ansMin : null;

  for (const info of geo.byId.values()) {
    const deptStats = stats.porDepartamento.get(info.canonico);
    const conSedes = SEDES_POR_DEPARTAMENTO.has(info.canonico);
    let ansNorm = -1;
    if (deptStats?.ansPromedioMin != null && ansMin !== null) {
      ansNorm = span ? (deptStats.ansPromedioMin - ansMin) / span : 0.5;
    }
    map.setFeatureState(
      { source: SOURCE_DEPTOS, id: info.id },
      { conSedes, ansNorm },
    );
  }

  const sedesSource = map.getSource(SOURCE_SEDES) as
    | mapboxgl.GeoJSONSource
    | undefined;
  sedesSource?.setData(buildSedesCollection(stats));
}

function applySelectionPaint(
  map: mapboxgl.Map,
  geo: DepartamentosGeo,
  selected: string | null,
): void {
  const selectedId = selected ? (geo.byCanonico.get(selected)?.id ?? -1) : -1;

  map.setFilter(LAYER_EXTRUSION, ["==", ["id"], selectedId]);
  for (const info of geo.byId.values()) {
    map.setFeatureState(
      { source: SOURCE_DEPTOS, id: info.id },
      { dimmed: selectedId !== -1 && info.id !== selectedId },
    );
  }
}

function applySelectionCamera(
  map: mapboxgl.Map,
  geo: DepartamentosGeo,
  selected: string | null,
): void {
  const info = selected ? geo.byCanonico.get(selected) : null;
  if (info) {
    map.fitBounds(info.bounds, {
      padding: 60,
      pitch: DRILLDOWN_PITCH,
      bearing: DRILLDOWN_BEARING,
      duration: 1400,
    });
  } else {
    map.fitBounds(COLOMBIA_BOUNDS, {
      padding: 24,
      pitch: 0,
      bearing: 0,
      duration: 1200,
    });
  }
}

// ── Sedes ────────────────────────────────────────────────────────────────

interface SedeProperties {
  nombre: string;
  direccion: string;
  departamento: string;
  tickets: number;
  ans: number;
}

function buildSedesCollection(stats: GeoStats): FeatureCollection {
  const { ansMin, ansMax } = stats;
  const span =
    ansMin !== null && ansMax !== null && ansMax > ansMin ? ansMax - ansMin : null;

  return {
    type: "FeatureCollection",
    features: SUCURSALES.map((sede, index) => {
      const sedeStats = stats.porSucursal.get(sede.id);
      const ans = sedeStats?.ansPromedioMin ?? null;
      let ansNorm = -1;
      if (ans !== null && ansMin !== null) {
        ansNorm = span ? Math.min(Math.max((ans - ansMin) / span, 0), 1) : 0.5;
      }
      return {
        type: "Feature",
        id: index,
        geometry: { type: "Point", coordinates: [sede.lng, sede.lat] },
        properties: {
          nombre: sede.nombre,
          direccion: sede.direccion,
          departamento: sede.departamento,
          tickets: sedeStats?.tickets ?? 0,
          ans: ans ?? -1,
          ansNorm,
        } satisfies SedeProperties & { ansNorm: number },
      };
    }),
  };
}

// ── Popups (HTML con valores escapados) ──────────────────────────────────

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function fila(etiqueta: string, valor: string): string {
  return `<div class="fila"><span>${esc(etiqueta)}</span><strong>${esc(valor)}</strong></div>`;
}

function departamentoPopupHtml(canonico: string, stats: GeoStats): string {
  const titulo = `<div class="titulo">${esc(formatDepartamento(canonico))}</div>`;

  if (!SEDES_POR_DEPARTAMENTO.has(canonico)) {
    return `${titulo}<div class="nota">No cuenta con sucursales activas en este momento.</div>`;
  }

  const dept = stats.porDepartamento.get(canonico);
  if (!dept || dept.tickets === 0) {
    return `${titulo}<div class="nota">Sin tickets en el periodo filtrado.</div>`;
  }

  return (
    titulo +
    fila("Tickets", formatEntero(dept.tickets)) +
    fila("Sucursales", formatEntero(dept.sucursales)) +
    fila("Asesores", formatEntero(dept.asesores)) +
    fila(
      "ANS · atención prom.",
      dept.ansPromedioMin === null ? "—" : formatMinutos(dept.ansPromedioMin),
    ) +
    fila(
      "Cumplimiento",
      dept.pctCumplimiento === null ? "—" : formatPorcentaje(dept.pctCumplimiento),
    ) +
    `<div class="nota">Doble clic para enfocar el departamento</div>`
  );
}

function sedePopupHtml(props: SedeProperties): string {
  return (
    `<div class="titulo">${esc(props.nombre)}</div>` +
    `<div class="nota">${esc(props.direccion)}</div>` +
    fila("Tickets", formatEntero(props.tickets)) +
    fila("ANS · atención prom.", props.ans < 0 ? "—" : formatMinutos(props.ans))
  );
}
