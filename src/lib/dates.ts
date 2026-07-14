/** Utilidades de fechas calendario (YYYY-MM-DD) ancladas a la zona horaria de la operación. */

const OPERATION_TIMEZONE = "America/Bogota";

/** Fecha de hoy en Bogotá como YYYY-MM-DD (en-CA produce exactamente ese formato). */
export function todayInBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATION_TIMEZONE,
  }).format(new Date());
}

/** Rango por defecto del dashboard: primer día del mes actual → hoy. */
export function defaultFilterRange(): { desde: string; hasta: string } {
  const hoy = todayInBogota();
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
}

/** Mes calendario anterior completo (1.º → último día), en TZ de la operación. */
export function previousMonthRange(): { desde: string; hasta: string } {
  const hoy = todayInBogota();
  const primeroDeEsteMes = `${hoy.slice(0, 8)}01`;
  const hasta = addDays(primeroDeEsteMes, -1);
  return { desde: `${hasta.slice(0, 8)}01`, hasta };
}

/** Últimos N días corridos incluyendo hoy (p. ej. "última semana" = 7). */
export function lastNDaysRange(n: number): { desde: string; hasta: string } {
  const hasta = todayInBogota();
  return { desde: addDays(hasta, -(n - 1)), hasta };
}

/** Diferencia en días entre dos fechas (hasta − desde; mismo día = 0). */
export function daysBetween(desde: string, hasta: string): number {
  return Math.round((toUtcMs(hasta) - toUtcMs(desde)) / 86_400_000);
}

/** Día de la semana de una fecha calendario (0 = domingo … 6 = sábado). */
export function weekdayOf(fechaIso: string): number {
  return new Date(`${fechaIso}T12:00:00Z`).getUTCDay();
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtcMs(value));
}

export function addDays(fechaIso: string, days: number): string {
  const date = new Date(toUtcMs(fechaIso) + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** Días calendario inclusivos entre dos fechas (mismo día = 1). */
export function countDaysInclusive(desde: string, hasta: string): number {
  const diff = Math.round((toUtcMs(hasta) - toUtcMs(desde)) / 86_400_000);
  return Math.max(diff + 1, 0);
}

/** Enumera los días del rango inclusivo, en orden ascendente. */
export function enumerateDays(desde: string, hasta: string): string[] {
  const total = countDaysInclusive(desde, hasta);
  return Array.from({ length: total }, (_, i) => addDays(desde, i));
}

function toUtcMs(fechaIso: string): number {
  return new Date(`${fechaIso}T00:00:00Z`).getTime();
}
