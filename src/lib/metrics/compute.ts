import type { BusinessRules } from "@/lib/config/business-rules";
import { addDays, countDaysInclusive } from "@/lib/dates";
import { enumerateDiasHabiles } from "@/lib/festivos";
import type { Ticket } from "@/types/atenciones";
import type { MetricsResult } from "@/types/metrics";
import { computeMetricas } from "./metricas";
import { computeTendencias } from "./tendencias";

/** Tope de puntos de la serie diaria (protege el modo "todo" ante rangos anómalos). */
const MAX_DIAS_SERIE = 1100;

/** Orquestador: tickets ya filtrados → tendencias + métricas del dashboard. */
export function computeMetricsResult(
  tickets: Ticket[],
  rango: { desde: string | null; hasta: string | null },
  rules: BusinessRules,
): MetricsResult {
  const dias = resolveDias(tickets, rango);
  return {
    tendencias: computeTendencias(tickets, dias, rules),
    metricas: computeMetricas(tickets, rules),
    totalTickets: tickets.length,
  };
}

/**
 * Días HÁBILES del periodo: el rango filtrado, o min→max de los datos en modo
 * "todo". Sábados, domingos y festivos se excluyen del eje (la operación no
 * los gestiona); los tickets que caigan ahí siguen contando en los totales.
 */
function resolveDias(
  tickets: Ticket[],
  rango: { desde: string | null; hasta: string | null },
): string[] {
  let desde = rango.desde;
  let hasta = rango.hasta;

  if (!desde || !hasta) {
    if (!tickets.length) return [];
    desde = hasta = tickets[0].fechaDia;
    for (const { fechaDia } of tickets) {
      if (fechaDia < desde) desde = fechaDia;
      if (fechaDia > hasta) hasta = fechaDia;
    }
  }

  if (countDaysInclusive(desde, hasta) > MAX_DIAS_SERIE) {
    desde = addDays(hasta, -(MAX_DIAS_SERIE - 1));
  }

  return enumerateDiasHabiles(desde, hasta);
}
