import type { DataSource } from "./metrics";

/** Bump invalida las cachés de IndexedDB de los clientes. */
export const DATASET_SCHEMA_VERSION = 1;

/**
 * Payload columnar con diccionarios: ~136k tickets viajan como columnas
 * paralelas de enteros (gzip lo comprime a ~1 MB). Tiempos en centésimas de
 * minuto (enteros); -1 = null en columnas de índice; null en columnas de tiempo.
 */
export interface DatasetPayload {
  v: number;
  /** Fecha mínima del dataset; `dia` son offsets en días desde aquí. */
  fechaBase: string;
  sucursales: [id: string, nombre: string][];
  asesores: [id: string, nombre: string][];
  estados: string[];
  dia: number[];
  suc: number[];
  ase: number[];
  est: number[];
  esp: (number | null)[];
  eje: (number | null)[];
}

export interface DatasetApiResponse {
  source: DataSource;
  generatedAt: string;
  payload: DatasetPayload;
}
