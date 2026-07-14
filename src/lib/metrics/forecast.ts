import type { BusinessRules } from "@/lib/config/business-rules";
import {
  FORECAST_HISTORIA_VISIBLE_DIAS,
  FORECAST_HORIZON_DIAS,
  FORECAST_VENTANA_DIAS,
} from "@/lib/config/constants";
import { addDays, enumerateDays, weekdayOf } from "@/lib/dates";
import { formatDecimal, formatEntero, formatMinutos } from "@/lib/format";
import type { Ticket } from "@/types/atenciones";
import type { DailyPoint } from "@/types/metrics";
import { avgByDay, buildDailySeries, countByDay } from "./series";

/**
 * Proyecciones gerenciales sobre el conjunto filtrado:
 *
 * 1. Serie diaria de tickets (huecos = 0) en una ventana de entrenamiento de
 *    hasta 56 días.
 * 2. Estacionalidad por día de semana: s_w = media_w / mediaGlobal
 *    (renormalizada a media 1, clamp ≥ 0.05).
 * 3. Tendencia por mínimos cuadrados sobre la serie desestacionalizada.
 * 4. Pronóstico a 14 días: ŷ_t = max(0, (a + b·t) · s_w).
 * 5. Incertidumbre: σ de los residuales → escenarios con encuadre de
 *    capacidad: pesimista = +1σ (mayor carga), optimista = −1σ (menor carga).
 */

const MIN_TICKETS = 20;
const MIN_DIAS_HISTORIA = 14;
const VENTANA_ANS_DIAS = 28;
const VENTANA_CARGA_DIAS = 14;
const MIN_PUNTOS_ANS = 7;

const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
/** Orden de exhibición Lunes → Domingo (índices de getUTCDay). */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export interface ForecastPoint {
  fecha: string;
  base: number;
  optimista: number;
  pesimista: number;
}

export interface ForecastData {
  insuficiente: false;
  /** Últimos 30 días reales de la serie. */
  history: DailyPoint[];
  forecast: ForecastPoint[];
  totales: { base: number; optimista: number; pesimista: number };
  demandaPorDiaSemana: { dia: string; promedio: number; esPico: boolean }[];
  /** Pendiente de la tendencia en % por semana relativo al nivel medio. */
  tendenciaSemanalPct: number;
  ansActualMin: number | null;
  ansProyectadoMin: number | null;
  asesoresActivos: number;
  cargaActualDia: number | null;
  cargaProyectadaDia: number | null;
  diaPico: { nombre: string; pctSobrePromedio: number } | null;
  insights: string[];
}

export type ForecastResult =
  | ForecastData
  | { insuficiente: true; motivo: string };

export function computeForecast(
  tickets: Ticket[],
  rules: BusinessRules,
): ForecastResult {
  if (tickets.length < MIN_TICKETS) {
    return {
      insuficiente: true,
      motivo: `Se requieren al menos ${MIN_TICKETS} tickets en el periodo filtrado para proyectar.`,
    };
  }

  let minFecha = tickets[0].fechaDia;
  let maxFecha = tickets[0].fechaDia;
  for (const { fechaDia } of tickets) {
    if (fechaDia < minFecha) minFecha = fechaDia;
    if (fechaDia > maxFecha) maxFecha = fechaDia;
  }

  const diasTotales = enumerateDays(minFecha, maxFecha);
  if (diasTotales.length < MIN_DIAS_HISTORIA) {
    return {
      insuficiente: true,
      motivo: `Se requieren al menos ${MIN_DIAS_HISTORIA} días de historia para proyectar (hay ${diasTotales.length}).`,
    };
  }

  const serieCompleta = buildDailySeries(diasTotales, countByDay(tickets));
  const training = serieCompleta.slice(-FORECAST_VENTANA_DIAS);
  const n = training.length;
  const y = training.map((p) => p.valor);
  const mediaGlobal = mean(y);
  if (mediaGlobal <= 0) {
    return {
      insuficiente: true,
      motivo: "El periodo filtrado no tiene demanda suficiente para proyectar.",
    };
  }

  // ── Estacionalidad semanal ──────────────────────────────────────────────
  const porDiaSemana = new Map<number, number[]>();
  training.forEach((p) => {
    const w = weekdayOf(p.fecha);
    const lista = porDiaSemana.get(w);
    if (lista) lista.push(p.valor);
    else porDiaSemana.set(w, [p.valor]);
  });

  const seasonality = new Array<number>(7).fill(1);
  for (const [w, valores] of porDiaSemana) {
    seasonality[w] = mean(valores) / mediaGlobal;
  }
  const mediaS = mean(seasonality);
  for (let w = 0; w < 7; w++) {
    seasonality[w] = Math.max(seasonality[w] / mediaS, 0.05);
  }

  // ── Tendencia (mínimos cuadrados sobre serie desestacionalizada) ────────
  const desestacionalizada = training.map(
    (p) => p.valor / seasonality[weekdayOf(p.fecha)],
  );
  const { a, b } = leastSquares(desestacionalizada);

  // ── Residuales → σ ──────────────────────────────────────────────────────
  const residuales = training.map(
    (p, t) => p.valor - (a + b * t) * seasonality[weekdayOf(p.fecha)],
  );
  const sigma = stdDev(residuales);

  // ── Pronóstico ──────────────────────────────────────────────────────────
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= FORECAST_HORIZON_DIAS; h++) {
    const fecha = addDays(maxFecha, h);
    const t = n - 1 + h;
    const base = Math.max(0, (a + b * t) * seasonality[weekdayOf(fecha)]);
    forecast.push({
      fecha,
      base: round1(base),
      optimista: round1(Math.max(0, base - sigma)),
      pesimista: round1(base + sigma),
    });
  }

  const totales = {
    base: Math.round(forecast.reduce((s, p) => s + p.base, 0)),
    optimista: Math.round(forecast.reduce((s, p) => s + p.optimista, 0)),
    pesimista: Math.round(forecast.reduce((s, p) => s + p.pesimista, 0)),
  };

  const tendenciaSemanalPct = ((b * 7) / mediaGlobal) * 100;

  // ── Demanda por día de semana (dimensionamiento de turnos) ──────────────
  const promediosSemana = ORDEN_SEMANA.map((w) => ({
    w,
    promedio: round1(seasonality[w] * mediaGlobal),
  }));
  const maxPromedio = Math.max(...promediosSemana.map((d) => d.promedio));
  const demandaPorDiaSemana = promediosSemana.map(({ w, promedio }) => ({
    dia: NOMBRES_DIA[w],
    promedio,
    esPico: promedio === maxPromedio && maxPromedio > 0,
  }));

  const picoW = ORDEN_SEMANA.reduce(
    (best, w) => (seasonality[w] > seasonality[best] ? w : best),
    ORDEN_SEMANA[0],
  );
  const diaPico =
    seasonality[picoW] > 1
      ? {
          nombre: NOMBRES_DIA[picoW],
          pctSobrePromedio: (seasonality[picoW] - 1) * 100,
        }
      : null;

  // ── ANS proyectado (regresión sobre el promedio diario de atención) ─────
  const desdeAns = addDays(maxFecha, -(VENTANA_ANS_DIAS - 1));
  const ansPorDia = avgByDay(
    tickets.filter((t) => t.fechaDia >= desdeAns),
    (t) => t.tiempoEjecucion,
  );
  const puntosAns = [...ansPorDia.entries()]
    .map(([fecha, valor]) => ({ t: enumerateIndex(desdeAns, fecha), valor }))
    .sort((p, q) => p.t - q.t);

  let ansActualMin: number | null = null;
  let ansProyectadoMin: number | null = null;
  if (puntosAns.length > 0) {
    ansActualMin = round1(mean(puntosAns.map((p) => p.valor)));
    if (puntosAns.length >= MIN_PUNTOS_ANS) {
      const reg = leastSquaresXY(
        puntosAns.map((p) => p.t),
        puntosAns.map((p) => p.valor),
      );
      ansProyectadoMin = round1(
        Math.max(0, reg.a + reg.b * (VENTANA_ANS_DIAS - 1 + FORECAST_HORIZON_DIAS)),
      );
    }
  }

  // ── Carga por asesor ────────────────────────────────────────────────────
  const desdeCarga = addDays(maxFecha, -(VENTANA_CARGA_DIAS - 1));
  const asesoresRecientes = new Set<string>();
  let ticketsRecientes = 0;
  for (const ticket of tickets) {
    if (ticket.fechaDia < desdeCarga) continue;
    ticketsRecientes += 1;
    if (ticket.asesorId) asesoresRecientes.add(ticket.asesorId);
  }
  const asesoresActivos = asesoresRecientes.size;
  const cargaActualDia = asesoresActivos
    ? round1(ticketsRecientes / VENTANA_CARGA_DIAS / asesoresActivos)
    : null;
  const cargaProyectadaDia = asesoresActivos
    ? round1(totales.base / FORECAST_HORIZON_DIAS / asesoresActivos)
    : null;

  const data: ForecastData = {
    insuficiente: false,
    history: serieCompleta.slice(-FORECAST_HISTORIA_VISIBLE_DIAS),
    forecast,
    totales,
    demandaPorDiaSemana,
    tendenciaSemanalPct,
    ansActualMin,
    ansProyectadoMin,
    asesoresActivos,
    cargaActualDia,
    cargaProyectadaDia,
    diaPico,
    insights: [],
  };
  data.insights = buildInsights(data, rules);
  return data;
}

// ── Narrativa gerencial ────────────────────────────────────────────────────

function buildInsights(data: ForecastData, rules: BusinessRules): string[] {
  const frases: string[] = [];
  const { totales, tendenciaSemanalPct } = data;

  const direccion =
    Math.abs(tendenciaSemanalPct) < 2
      ? "se mantiene estable"
      : tendenciaSemanalPct > 0
        ? `crece ~${formatDecimal(tendenciaSemanalPct)}% por semana`
        : `decrece ~${formatDecimal(Math.abs(tendenciaSemanalPct))}% por semana`;
  frases.push(
    `La demanda ${direccion}: se proyectan ~${formatEntero(totales.base)} tickets en los próximos 14 días (entre ${formatEntero(totales.optimista)} y ${formatEntero(totales.pesimista)}).`,
  );

  if (data.diaPico && data.diaPico.pctSobrePromedio >= 5) {
    frases.push(
      `Los días ${data.diaPico.nombre.toLowerCase()} concentran ~${formatDecimal(data.diaPico.pctSobrePromedio)}% más demanda que el promedio: son clave para dimensionar turnos.`,
    );
  }

  if (data.ansProyectadoMin !== null && data.ansActualMin !== null) {
    const objetivo = rules.ansObjetivoMin;
    const estadoObjetivo =
      data.ansProyectadoMin <= objetivo
        ? `dentro del objetivo de ${objetivo} min`
        : `por encima del objetivo de ${objetivo} min`;
    frases.push(
      `El tiempo de atención proyectado a 14 días es ${formatMinutos(data.ansProyectadoMin)} (hoy ${formatMinutos(data.ansActualMin)}), ${estadoObjetivo}.`,
    );
  }

  if (data.cargaProyectadaDia !== null && data.cargaActualDia !== null) {
    const delta = data.cargaProyectadaDia - data.cargaActualDia;
    const matiz =
      Math.abs(delta) < 0.5
        ? "una carga similar a la actual"
        : delta > 0
          ? "mayor presión sobre la dotación actual"
          : "holgura frente a la dotación actual";
    frases.push(
      `Con la dotación actual de ${formatEntero(data.asesoresActivos)} asesores, cada uno atendería ~${formatDecimal(data.cargaProyectadaDia)} tickets/día (hoy ~${formatDecimal(data.cargaActualDia)}): ${matiz}.`,
    );
  }

  return frases;
}

// ── Utilidades numéricas ───────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Mínimos cuadrados con x = 0..n-1. */
function leastSquares(values: number[]): { a: number; b: number } {
  return leastSquaresXY(
    values.map((_, i) => i),
    values,
  );
}

function leastSquaresXY(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length;
  if (n === 0) return { a: 0, b: 0 };
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  return { a: my - b * mx, b };
}

function enumerateIndex(desde: string, fecha: string): number {
  // días de distancia (fechas ISO comparables): reutiliza la aritmética de dates.ts
  return Math.round(
    (Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      86_400_000,
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
