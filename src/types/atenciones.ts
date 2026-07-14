/**
 * Fila cruda de la vista (SOLO servidor). El SELECT ya deduplica por
 * ticket_id (DISTINCT ON) y trae únicamente campos de nivel ticket.
 * La vista usa LEFT JOINs: todo puede venir null salvo ticket_id.
 */
export interface AtencionRow {
  ticket_id: string | number;
  /** YYYY-MM-DD */
  fecha_dia: string | null;
  sucursal_id: string | number | null;
  sucursal_nombre: string | null;
  asesor_id: string | number | null;
  asesor_nombre: string | null;
  ticket_estado: string | null;
  /** Minutos entre creación e inicio de atención. */
  tiempo_espera: number | null;
  /** Minutos entre inicio de atención y finalización. */
  tiempo_ejecucion: number | null;
}

/** Ticket deduplicado y decodificado en el cliente (unidad de todo el pipeline de métricas). */
export interface Ticket {
  fechaDia: string;
  sucursalId: string | null;
  sucursalNombre: string | null;
  asesorId: string | null;
  asesorNombre: string | null;
  ticketEstado: string | null;
  tiempoEspera: number | null;
  tiempoEjecucion: number | null;
}
