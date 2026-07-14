import type { BusinessRules } from "@/lib/config/business-rules";
import type { Ticket } from "@/types/atenciones";
import type { MetricasOperacion } from "@/types/metrics";

/** Calcula las métricas de la columna derecha sobre el conjunto ya filtrado. */
export function computeMetricas(
  tickets: Ticket[],
  rules: BusinessRules,
): MetricasOperacion {
  const cerrados = new Set(rules.estadosTicket.cerrados.map(normalizeEstado));
  const desistidos = new Set(rules.estadosTicket.desistidos.map(normalizeEstado));
  const noAsistidos = new Set(
    rules.estadosTicket.noAsistidos.map(normalizeEstado),
  );
  const abiertos = new Set(rules.estadosTicket.abiertos.map(normalizeEstado));

  let cerradosCount = 0;
  let desistidosCount = 0;
  let noAsistidosCount = 0;
  let abiertosCount = 0;
  let totalEjecucionMin = 0;

  for (const ticket of tickets) {
    const estado = ticket.ticketEstado ? normalizeEstado(ticket.ticketEstado) : "";
    if (cerrados.has(estado)) cerradosCount += 1;
    else if (desistidos.has(estado)) desistidosCount += 1;
    else if (noAsistidos.has(estado)) noAsistidosCount += 1;
    else if (abiertos.has(estado)) abiertosCount += 1;

    if (ticket.tiempoEjecucion !== null) {
      totalEjecucionMin += ticket.tiempoEjecucion;
    }
  }

  return {
    cerrados: cerradosCount,
    desistidos: desistidosCount,
    noAsistidos: noAsistidosCount,
    abiertos: abiertosCount,
    horasOperacion: totalEjecucionMin / 60,
  };
}

function normalizeEstado(estado: string): string {
  return estado.trim().toUpperCase();
}
