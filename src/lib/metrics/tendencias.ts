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
      {
        etiqueta: "Días hábiles",
        valor: `${formatEntero(dias.length)} días`,
      },
      {
        etiqueta: "Promedio por día hábil",
        valor: dias.length
          ? `${formatDecimal(tickets.length / dias.length)} tickets`
          : "—",
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
        etiqueta: "Participación del total",
        valor: tickets.length
          ? formatPorcentaje((apoyo.length / tickets.length) * 100)
          : "—",
      },
      {
        etiqueta: "Promedio por día hábil",
        valor: dias.length
          ? `${formatDecimal(apoyo.length / dias.length)} tickets`
          : "—",
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

  let maxPorAsesor = -Infinity;
  let minPorAsesor = Infinity;
  for (const total of ticketsPorAsesor.values()) {
    if (total > maxPorAsesor) maxPorAsesor = total;
    if (total < minPorAsesor) minPorAsesor = total;
  }
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
        valor: totalAsesores ? `${formatEntero(maxPorAsesor)} tickets` : "—",
      },
      {
        etiqueta: "Mín. por asesor",
        valor: totalAsesores ? `${formatEntero(minPorAsesor)} tickets` : "—",
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
  // Una sola pasada (sin spread: con "Todo" son >100k valores y revienta la pila).
  let suma = 0;
  let conValor = 0;
  let cumplen = 0;
  let mayor = -Infinity;
  let menor = Infinity;
  for (const ticket of tickets) {
    if (ticket.tiempoEjecucion === null) continue;
    suma += ticket.tiempoEjecucion;
    conValor += 1;
    if (ticket.tiempoEjecucion <= rules.ansObjetivoMin) cumplen += 1;
    if (ticket.tiempoEjecucion > mayor) mayor = ticket.tiempoEjecucion;
    if (ticket.tiempoEjecucion < menor) menor = ticket.tiempoEjecucion;
  }

  const promedio = conValor ? suma / conValor : 0;
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
        valor: conValor ? formatPorcentaje((cumplen / conValor) * 100) : "—",
      },
      {
        etiqueta: "Mayor tiempo de cierre",
        valor: conValor ? formatMinutos(mayor) : "—",
      },
      {
        etiqueta: "Menor tiempo de cierre",
        valor: conValor ? formatMinutos(menor) : "—",
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
