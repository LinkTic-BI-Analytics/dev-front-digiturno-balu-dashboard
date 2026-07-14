import { VIEW_ATENCIONES } from "@/lib/config/constants";
import { getDbPool } from "@/lib/db/pool";
import type { AtencionRow } from "@/types/atenciones";

/**
 * Trae el dataset COMPLETO deduplicado por ticket en el origen (DISTINCT ON):
 * la vista une atenciones (N filas por ticket) pero solo se necesitan campos
 * de nivel ticket. Los casts garantizan tipos JS correctos (pg devuelve
 * NUMERIC como string y DATE como Date si no se castea).
 * SOLO lecturas — nunca insert/update/delete.
 */
const QUERY = `
  SELECT DISTINCT ON (ticket_id)
         ticket_id::text,
         fecha_dia::text,
         sucursal_id::text,
         sucursal_nombre,
         asesor_id::text,
         asesor_nombre,
         ticket_estado,
         tiempo_espera::float8,
         tiempo_ejecucion::float8
  FROM ${VIEW_ATENCIONES}
  ORDER BY ticket_id
`;

export async function fetchDataset(): Promise<AtencionRow[]> {
  const pool = getDbPool();
  const result = await pool.query<AtencionRow>(QUERY);
  return result.rows;
}

/** Ping barato para el health-check del ciclo de refresco. */
export async function pingDatabase(): Promise<void> {
  const pool = getDbPool();
  await pool.query("SELECT 1");
}
