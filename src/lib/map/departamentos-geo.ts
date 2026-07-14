import {
  DEPARTAMENTOS_GEOJSON_URL,
  GEOJSON_NOMBRE_DEPTO,
} from "@/lib/config/constants";
import { canonicoDesdeGeojson } from "@/lib/config/sucursales";
import type { FeatureCollection, Geometry, Position } from "geojson";

/**
 * Carga única del geojson de departamentos (caché de módulo) con:
 * - `feature.id` numérico explícito por índice (feature-state determinista,
 *   sobrevive a cambios de estilo — `generateId` no lo garantiza).
 * - bbox precomputado por departamento (cámara del drill-down).
 * - índice NOMBRE_DPT ↔ clave canónica del negocio.
 */

export interface DepartamentoFeatureInfo {
  id: number;
  nombreGeojson: string;
  canonico: string;
  bounds: [[number, number], [number, number]];
}

export interface DepartamentosGeo {
  collection: FeatureCollection;
  byCanonico: ReadonlyMap<string, DepartamentoFeatureInfo>;
  byId: ReadonlyMap<number, DepartamentoFeatureInfo>;
}

let cache: Promise<DepartamentosGeo> | null = null;

export function loadDepartamentosGeo(): Promise<DepartamentosGeo> {
  cache ??= fetchAndBuild().catch((error) => {
    cache = null; // permite reintentar si la carga falla
    throw error;
  });
  return cache;
}

async function fetchAndBuild(): Promise<DepartamentosGeo> {
  const response = await fetch(DEPARTAMENTOS_GEOJSON_URL);
  if (!response.ok) {
    throw new Error(`No fue posible cargar el geojson (HTTP ${response.status})`);
  }
  const collection = (await response.json()) as FeatureCollection;

  const byCanonico = new Map<string, DepartamentoFeatureInfo>();
  const byId = new Map<number, DepartamentoFeatureInfo>();

  collection.features.forEach((feature, index) => {
    feature.id = index;
    const nombreGeojson = String(
      feature.properties?.[GEOJSON_NOMBRE_DEPTO] ?? `DEPTO-${index}`,
    );
    const info: DepartamentoFeatureInfo = {
      id: index,
      nombreGeojson,
      canonico: canonicoDesdeGeojson(nombreGeojson),
      bounds: computeBounds(feature.geometry),
    };
    byCanonico.set(info.canonico, info);
    byId.set(index, info);
  });

  return { collection, byCanonico, byId };
}

function computeBounds(
  geometry: Geometry,
): [[number, number], [number, number]] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (position: Position) => {
    const [lng, lat] = position;
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  };

  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) ring.forEach(visit);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) ring.forEach(visit);
    }
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
