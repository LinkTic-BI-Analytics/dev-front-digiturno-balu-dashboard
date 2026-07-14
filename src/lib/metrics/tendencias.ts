import type { BusinessRules } from "@/lib/config/business-rules";
import {
  formatDecimal,
  formatEntero,
  formatMinutos,
  formatPorcentaje,
} from "@/lib/format";
import type { Ticket } from "@/types/atenciones";
import type { TendenciasResult, TrendMetric } from "@/types/metrics";
import { avgByDay, buildDailySeries, computeDeltaPct, countByDay } from "./series";

/** Calcula las 4 tendencias del dashboard sobre el conjunto ya filtrado. */
export function computeTendencias(
  tickets: Ticket[],
  dias: string[],
  rules: BusinessRules,
): TendenciasResult {
  return {
    tickets: tendenciaTickets(tickets, dias),
    apoyoOperativo: tendenciaApoyoOperativo(tickets, dias, rules),
    asesores: tendenciaAsesores(tickets, dias),
    ans: tendenciaAns(tickets, dias, rules),
  };
}

function tendenciaTickets(tickets: Ticket[], dias: string[]): TrendMetric {
  const serie = buildDailySeries(dias, countByDay(tickets));
  return {
    valor: tickets.length,
    unidad: "numero",
    serie,
    deltaPct: computeDeltaPct(serie),
    subIndicadores: [
      { etiqueta: "Días del periodo", valor: formatEntero(dias.length) },
      {
        etiqueta: "Promedio por día",
        valor: dias.length ? formatDecimal(tickets.length / dias.length) : "—",
      },
    ],
  };
}

function tendenciaApoyoOperativo(
  tickets: Ticket[],
  dias: string[],
  rules: BusinessRules,
): TrendMetric {
  const apoyo = tickets.filter(
    (t) => t.sucursalId === rules.apoyoOperativoSucursalId,
  );
  const serie = buildDailySeries(dias, countByDay(apoyo));
  const tiempoPromedio = promedioEjecucion(apoyo);

  return {
    valor: apoyo.length,
    unidad: "numero",
    serie,
    deltaPct: computeDeltaPct(serie),
    subIndicadores: [
      {
        etiqueta: "% del total",
        valor: tickets.length
          ? formatPorcentaje((apoyo.length / tickets.length) * 100)
          : "—",
      },
      {
        etiqueta: "Promedio por día",
        valor: dias.length ? formatDecimal(apoyo.length / dias.length) : "—",
      },
      {
        etiqueta: "Tiempo prom. de atención",
        valor: tiempoPromedio === null ? "—" : formatMinutos(tiempoPromedio),
      },
    ],
  };
}

function tendenciaAsesores(tickets: Ticket[], dias: string[]): TrendMetric {
  const conAsesor = tickets.filter((t) => t.asesorId !== null);

  const ticketsPorAsesor = new Map<string, number>();
  const asesoresPorDia = new Map<string, Set<string>>();
  for (const ticket of conAsesor) {
    const asesorId = ticket.asesorId as string;
    ticketsPorAsesor.set(asesorId, (ticketsPorAsesor.get(asesorId) ?? 0) + 1);
    let delDia = asesoresPorDia.get(ticket.fechaDia);
    if (!delDia) {
      delDia = new Set();
      asesoresPorDia.set(ticket.fechaDia, delDia);
    }
    delDia.add(asesorId);
  }

  const ticketsPorDia = countByDay(conAsesor);
  const promedioPorDia = new Map<string, number>();
  for (const [fecha, total] of ticketsPorDia) {
    const asesoresDia = asesoresPorDia.get(fecha)?.size ?? 0;
    promedioPorDia.set(
      fecha,
      asesoresDia ? Math.round((total / asesoresDia) * 10) / 10 : 0,
    );
  }

  const acumulados = [...ticketsPorAsesor.values()];
  const totalAsesores = ticketsPorAsesor.size;
  const serie = buildDailySeries(dias, promedioPorDia);

  return {
    valor: totalAsesores
      ? Math.round((conAsesor.length / totalAsesores) * 10) / 10
      : 0,
    unidad: "numero",
    serie,
    deltaPct: computeDeltaPct(serie),
    subIndicadores: [
      { etiqueta: "Asesores distintos", valor: formatEntero(totalAsesores) },
      {
        etiqueta: "Máx. por asesor",
        valor: acumulados.length ? formatEntero(Math.max(...acumulados)) : "—",
      },
      {
        etiqueta: "Mín. por asesor",
        valor: acumulados.length ? formatEntero(Math.min(...acumulados)) : "—",
      },
    ],
  };
}

/** ANS = tiempo de atención (tiempo_ejecucion). Subir es MALO → delta invertido. */
function tendenciaAns(
  tickets: Ticket[],
  dias: string[],
  rules: BusinessRules,
): TrendMetric {
  const valores: number[] = [];
  let cumplen = 0;
  for (const ticket of tickets) {
    if (ticket.tiempoEjecucion === null) continue;
    valores.push(ticket.tiempoEjecucion);
    if (ticket.tiempoEjecucion <= rules.ansObjetivoMin) cumplen += 1;
  }

  const promedio = valores.length
    ? valores.reduce((a, b) => a + b, 0) / valores.length
    : 0;
  const serie = buildDailySeries(
    dias,
    avgByDay(tickets, (t) => t.tiempoEjecucion),
  );

  return {
    valor: Math.round(promedio * 10) / 10,
    unidad: "minutos",
    serie,
    deltaPct: computeDeltaPct(serie),
    deltaInvertido: true,
    subIndicadores: [
      {
        etiqueta: `Cumplimiento ≤ ${rules.ansObjetivoMin} min`,
        valor: valores.length
          ? formatPorcentaje((cumplen / valores.length) * 100)
          : "—",
      },
      {
        etiqueta: "Mayor tiempo de cierre",
        valor: valores.length ? formatMinutos(Math.max(...valores)) : "—",
      },
      {
        etiqueta: "Menor tiempo de cierre",
        valor: valores.length ? formatMinutos(Math.min(...valores)) : "—",
      },
    ],
  };
}

function promedioEjecucion(tickets: Ticket[]): number | null {
  let total = 0;
  let count = 0;
  for (const ticket of tickets) {
    if (ticket.tiempoEjecucion === null) continue;
    total += ticket.tiempoEjecucion;
    count += 1;
  }
  return count ? total / count : null;
}
