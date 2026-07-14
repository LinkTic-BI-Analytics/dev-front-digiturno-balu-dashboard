import type { Ticket } from "@/types/atenciones";
import type { DailyPoint } from "@/types/metrics";

/** Construye la serie diaria sobre los días del periodo, rellenando huecos con 0. */
export function buildDailySeries(
  dias: string[],
  valorPorDia: Map<string, number>,
): DailyPoint[] {
  return dias.map((fecha) => ({ fecha, valor: valorPorDia.get(fecha) ?? 0 }));
}

/** Conteo de tickets por día. */
export function countByDay(tickets: Ticket[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ticket of tickets) {
    counts.set(ticket.fechaDia, (counts.get(ticket.fechaDia) ?? 0) + 1);
  }
  return counts;
}

/** Promedio diario de un valor numérico (ignora nulls), redondeado a 1 decimal. */
export function avgByDay(
  tickets: Ticket[],
  selector: (ticket: Ticket) => number | null,
): Map<string, number> {
  const acc = new Map<string, { total: number; count: number }>();
  for (const ticket of tickets) {
    const value = selector(ticket);
    if (value === null) continue;
    const entry = acc.get(ticket.fechaDia);
    if (entry) {
      entry.total += value;
      entry.count += 1;
    } else {
      acc.set(ticket.fechaDia, { total: value, count: 1 });
    }
  }
  const result = new Map<string, number>();
  for (const [fecha, { total, count }] of acc) {
    result.set(fecha, Math.round((total / count) * 10) / 10);
  }
  return result;
}

/**
 * Tendencia del periodo: variación % entre el primer y el último día filtrado.
 * null cuando no es calculable (menos de 2 días o primer día en 0).
 */
export function computeDeltaPct(serie: DailyPoint[]): number | null {
  if (serie.length < 2) return null;
  const primero = serie[0].valor;
  const ultimo = serie[serie.length - 1].valor;
  if (primero === 0) return null;
  return ((ultimo - primero) / primero) * 100;
}
