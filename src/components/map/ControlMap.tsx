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
/** Sedes del drill-down: símbolos elevados al techo de la extrusión 3D. */
const LAYER_SEDES_3D = "sedes-3d";
const SEDE_IMAGE_PREFIX = "sede-dot-";
const SEDE_IMAGE_SIN_DATOS = "sede-dot-sin-datos";

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

      // Si el puntero está sobre una sede (2D o 3D), su popup tiene prioridad.
      const capasSedes = [LAYER_SEDES, LAYER_SEDES_3D].filter((id) =>
        map.getLayer(id),
      );
      if (capasSedes.length > 0) {
        const sedes = map.queryRenderedFeatures(event.point, {
          layers: capasSedes,
        });
        if (sedes.length > 0) return;
      }

      // En drill-down el popup de departamento genera ruido: la info vive en
      // la card fija del mapa. El dblclick para cambiar de foco sigue activo.
      if (runtime.selected) {
        clearHover();
        map.getCanvas().style.cursor = "";
        popup.remove();
        return;
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

    const onSedeHover = (event: mapboxgl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = "pointer";
      popup
        .setLngLat(event.lngLat)
        .setHTML(sedePopupHtml(feature.properties as SedeProperties))
        .addTo(map);
    };
    map.on("mousemove", LAYER_SEDES, onSedeHover);
    map.on("mousemove", LAYER_SEDES_3D, onSedeHover);

    // Red de seguridad: si el estilo pide un sprite de sede aún no registrado
    // (p. ej. tras un setStyle), se regeneran todos.
    map.on("styleimagemissing", (event) => {
      if (event.id.startsWith(SEDE_IMAGE_PREFIX)) ensureSedeImages(map);
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

/**
 * Sprites circulares pre-tintados para la capa symbol del drill-down (evita
 * SDF): 6 stops del mapa de calor + gris "sin datos", con borde del color de
 * la superficie del tema. `map.addImage` NO sobrevive a `setStyle`, por eso
 * se (re)generan en cada `setupLayers`.
 */
function ensureSedeImages(map: mapboxgl.Map): void {
  const surface =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--surface")
      .trim() || "#ffffff";

  const colores = [
    ...ANS_HEAT_STOPS.map(([, color]) => color),
    COLOR_SIN_SEDES,
  ];
  const SIZE = 64; // 64 px @ pixelRatio 2 → 32 px CSS con icon-size 1

  colores.forEach((color, index) => {
    const id =
      index < ANS_HEAT_STOPS.length
        ? `${SEDE_IMAGE_PREFIX}${index}`
        : SEDE_IMAGE_SIN_DATOS;
    if (map.hasImage(id)) map.removeImage(id);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = surface;
    ctx.stroke();
    map.addImage(id, ctx.getImageData(0, 0, SIZE, SIZE), { pixelRatio: 2 });
  });
}

async function setupLayers(map: mapboxgl.Map, runtime: MapRuntime): Promise<void> {
  try {
    runtime.geo = await loadDepartamentosGeo();
  } catch (error) {
    console.error("[ControlMap] geojson:", error);
    return;
  }
  if (!map.getStyle() || map.getSource(SOURCE_DEPTOS)) return;

  ensureSedeImages(map);

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

  const ink =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ink")
      .trim() || "#1c1917";

  // Sedes del drill-down: símbolos elevados al TECHO de la extrusión 3D
  // (symbol-z-elevate), con etiqueta del nombre. Oculta hasta que haya foco.
  map.addLayer({
    id: LAYER_SEDES_3D,
    type: "symbol",
    source: SOURCE_SEDES,
    filter: ["==", ["get", "departamento"], "__ninguno__"],
    layout: {
      "symbol-z-elevate": true,
      "icon-image": [
        "match",
        ["get", "ansBucket"],
        0,
        `${SEDE_IMAGE_PREFIX}0`,
        1,
        `${SEDE_IMAGE_PREFIX}1`,
        2,
        `${SEDE_IMAGE_PREFIX}2`,
        3,
        `${SEDE_IMAGE_PREFIX}3`,
        4,
        `${SEDE_IMAGE_PREFIX}4`,
        5,
        `${SEDE_IMAGE_PREFIX}5`,
        SEDE_IMAGE_SIN_DATOS,
      ] as unknown as mapboxgl.ExpressionSpecification,
      "icon-size": [
        "interpolate",
        ["linear"],
        ["sqrt", ["get", "tickets"]],
        0,
        0.3,
        10,
        0.45,
        40,
        0.7,
        130,
        1.1,
      ] as unknown as mapboxgl.ExpressionSpecification,
      "icon-allow-overlap": true,
      "text-field": ["get", "nombre"] as unknown as mapboxgl.ExpressionSpecification,
      "text-size": 11,
      "text-anchor": "top",
      "text-offset": [0, 1.1],
      "text-optional": true,
    },
    paint: {
      "text-color": ink,
      "text-halo-color": surface,
      "text-halo-width": 1.2,
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

  // Drill-down: solo las sedes del departamento enfocado, elevadas al techo
  // de la extrusión (las circles nacionales se ocultan — las sedes ajenas
  // generan ruido). Vista nacional: circles de vuelta y símbolos ocultos.
  if (selected !== null) {
    map.setLayoutProperty(LAYER_SEDES, "visibility", "none");
    map.setFilter(LAYER_SEDES_3D, ["==", ["get", "departamento"], selected]);
    map.setLayoutProperty(LAYER_SEDES_3D, "visibility", "visible");
  } else {
    map.setLayoutProperty(LAYER_SEDES, "visibility", "visible");
    map.setFilter(LAYER_SEDES_3D, ["==", ["get", "departamento"], "__ninguno__"]);
    map.setLayoutProperty(LAYER_SEDES_3D, "visibility", "none");
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
  /** Normalizado 0..1 para el color de las circles (−1 = sin datos). */
  ansNorm: number;
  /** Stop de ANS_HEAT_STOPS más cercano (0..5; −1 = sin datos) para los sprites 3D. */
  ansBucket: number;
}

/** Umbrales (puntos medios entre stops) para asignar el sprite pre-tintado. */
const BUCKET_UMBRALES = [0.125, 0.375, 0.6, 0.775, 0.925];

function ansBucketDe(ansNorm: number): number {
  if (ansNorm < 0) return -1;
  let bucket = 0;
  for (const umbral of BUCKET_UMBRALES) {
    if (ansNorm >= umbral) bucket += 1;
  }
  return bucket;
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
          ansBucket: ansBucketDe(ansNorm),
        } satisfies SedeProperties,
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
