import { VIEW_ATENCIONES } from "@/lib/config/constants";
import { getDbPool } from "@/lib/db/pool";
import type { AtencionRow } from "@/types/atenciones";

/**
 * Trae el dataset COMPLETO deduplicado por ticket en el origen (DISTINCT ON).
 * La vista une atenciones (N filas por ticket): el ORDER BY por
 * subtramite_inicio hace determinista la fila ganadora (la PRIMERA atención,
 * de donde sale tramite_nombre); el resto de columnas son de nivel ticket.
 * ticket_inicio es timestamptz en UTC (verificado con muestreo) → se convierte
 * a hora Bogotá y viaja como minutos del día. Los casts garantizan tipos JS
 * correctos (pg devuelve NUMERIC como string y DATE como Date si no se castea).
 * SOLO lecturas — nunca insert/update/delete.
 */
const QUERY = `
  SELECT DISTINCT ON (ticket_id)
         ticket_id::text,
         fecha_dia::text,
         turno_completo,
         sucursal_id::text,
         sucursal_nombre,
         asesor_id::text,
         asesor_nombre,
         ticket_estado,
         tramite_nombre,
         CASE
           WHEN ticket_inicio IS NULL THEN NULL
           ELSE (EXTRACT(HOUR FROM ticket_inicio AT TIME ZONE 'America/Bogota') * 60
               + EXTRACT(MINUTE FROM ticket_inicio AT TIME ZONE 'America/Bogota'))::int
         END AS inicio_min,
         tiempo_espera::float8,
         tiempo_ejecucion::float8
  FROM ${VIEW_ATENCIONES}
  ORDER BY ticket_id, subtramite_inicio ASC NULLS LAST
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
