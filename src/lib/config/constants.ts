/** Ciclo de refresco del dataset en cliente: ping + fetch en background. */
export const REFRESH_INTERVAL_MS = 180_000; // 3 minutos

/** Vista de solo lectura en Postgres — única fuente de datos permitida. */
export const VIEW_ATENCIONES = "gestion_turnos.vw_reporte_atenciones_v2";

/** Bounds de Colombia continental (lng/lat). San Andrés queda fuera para que el país llene el encuadre. */
export const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-79.1, -4.3],
  [-66.8, 12.6],
];

/** Estilo personalizado compartido para el proyecto (tema claro). */
export const MAP_STYLE_LIGHT =
  "mapbox://styles/andres-ramirez/cmre3k8i1002101s75idde7ph";

/** Estilo oscuro de Mapbox (tema oscuro del dashboard). */
export const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";

export const DEPARTAMENTOS_GEOJSON_URL = "/data/colombia-departamentos.geojson";

/** Clave de la propiedad con el nombre del departamento en el geojson. */
export const GEOJSON_NOMBRE_DEPTO = "NOMBRE_DPT";

/** Cámara del drill-down 3D de departamento. */
export const DRILLDOWN_PITCH = 55;
export const DRILLDOWN_BEARING = -15;
export const DRILLDOWN_EXTRUSION_HEIGHT = 40_000;

/** Horizonte de las proyecciones (días) y ventana de entrenamiento. */
export const FORECAST_HORIZON_DIAS = 14;
export const FORECAST_VENTANA_DIAS = 56;
export const FORECAST_HISTORIA_VISIBLE_DIAS = 30;
