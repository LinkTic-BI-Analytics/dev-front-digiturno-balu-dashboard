import type { DataSource } from "./metrics";

/** Bump invalida las cachés de IndexedDB de los clientes. */
export const DATASET_SCHEMA_VERSION = 2;

/**
 * Payload columnar con diccionarios: ~136k tickets viajan como columnas
 * paralelas de enteros (gzip lo comprime a ~1,3 MB). Tiempos en centésimas de
 * minuto (enteros); -1 = null en columnas de índice; null en columnas de tiempo.
 * v2 añade turno (`tur`, plana: alta cardinalidad), trámite (`tra` + dict
 * `tramites`) y hora de inicio de atención (`ini`, minutos del día).
 */
export interface DatasetPayload {
  v: number;
  /** Fecha mínima del dataset; `dia` son offsets en días desde aquí. */
  fechaBase: string;
  sucursales: [id: string, nombre: string][];
  asesores: [id: string, nombre: string][];
  estados: string[];
  tramites: string[];
  dia: number[];
  suc: number[];
  ase: number[];
  est: number[];
  tra: number[];
  tur: (string | null)[];
  ini: (number | null)[];
  esp: (number | null)[];
  eje: (number | null)[];
}

export interface DatasetApiResponse {
  source: DataSource;
  generatedAt: string;
  payload: DatasetPayload;
}
