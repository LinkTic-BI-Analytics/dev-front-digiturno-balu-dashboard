/** Formateo centralizado en es-CO (punto de miles, coma decimal). */

const entero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEntero(value: number): string {
  return entero.format(value);
}

export function formatDecimal(value: number): string {
  return unDecimal.format(value);
}

export function formatPorcentaje(value: number): string {
  return `${unDecimal.format(value)}%`;
}

export function formatMinutos(minutos: number): string {
  return `${unDecimal.format(minutos)} min`;
}

export function formatHoras(horas: number): string {
  return `${entero.format(Math.round(horas))} h`;
}

/** "2026-07-05" → "5 jul" (interpretando la fecha como día calendario, sin corrimiento por TZ). */
export function formatFechaCorta(fechaIso: string): string {
  const date = new Date(`${fechaIso}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** "2026-07-05" → "5 de julio de 2026". */
export function formatFechaLarga(fechaIso: string): string {
  const date = new Date(`${fechaIso}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
