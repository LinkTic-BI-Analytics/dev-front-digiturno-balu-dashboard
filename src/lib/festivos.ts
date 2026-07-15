import { addDays, weekdayOf } from "@/lib/dates";

/**
 * Calendario laboral colombiano, calculado (sin dependencias): los 18 festivos
 * anuales según la Ley 51 de 1983 (Ley Emiliani) + los móviles de Semana Santa.
 *
 * POLÍTICA DEL TABLERO: la operación no gestiona tickets los sábados, domingos
 * ni festivos (verificado en datos: ~0,05 % del volumen cae ahí). Esos días se
 * EXCLUYEN de los ejes de días (series, promedios "por día hábil", forecast),
 * pero los tickets que existan en ellos SIGUEN contando en totales, buckets de
 * estado, horas y la tabla de detalle.
 */

/** Festivos de traslado (Emiliani): se corren al lunes siguiente si no caen lunes. */
const EMILIANI_MES_DIA: [mes: number, dia: number][] = [
  [1, 6], // Reyes Magos
  [3, 19], // San José
  [6, 29], // San Pedro y San Pablo
  [8, 15], // Asunción de la Virgen
  [10, 12], // Día de la Raza
  [11, 1], // Todos los Santos
  [11, 11], // Independencia de Cartagena
];

/** Festivos fijos (no se trasladan). */
const FIJOS_MES_DIA: [mes: number, dia: number][] = [
  [1, 1], // Año Nuevo
  [5, 1], // Día del Trabajo
  [7, 20], // Independencia
  [8, 7], // Batalla de Boyacá
  [12, 8], // Inmaculada Concepción
  [12, 25], // Navidad
];

const cachePorAno = new Map<number, ReadonlySet<string>>();

/** Domingo de Pascua (computus de Meeus/Jones/Butcher, calendario gregoriano). */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

function iso(year: number, mes: number, dia: number): string {
  return `${year}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Ley Emiliani: si la fecha no cae lunes, se celebra el lunes siguiente. */
function trasladarALunes(fechaIso: string): string {
  const w = weekdayOf(fechaIso);
  return w === 1 ? fechaIso : addDays(fechaIso, (8 - w) % 7);
}

export function festivosDelAno(year: number): ReadonlySet<string> {
  let festivos = cachePorAno.get(year);
  if (festivos) return festivos;

  const set = new Set<string>();
  for (const [mes, dia] of FIJOS_MES_DIA) set.add(iso(year, mes, dia));
  for (const [mes, dia] of EMILIANI_MES_DIA) {
    set.add(trasladarALunes(iso(year, mes, dia)));
  }

  const pascua = easterSunday(year);
  set.add(addDays(pascua, -3)); // Jueves Santo
  set.add(addDays(pascua, -2)); // Viernes Santo
  set.add(trasladarALunes(addDays(pascua, 39))); // Ascensión del Señor
  set.add(trasladarALunes(addDays(pascua, 60))); // Corpus Christi
  set.add(trasladarALunes(addDays(pascua, 68))); // Sagrado Corazón

  festivos = set;
  cachePorAno.set(year, festivos);
  return festivos;
}

export function esFestivo(fechaIso: string): boolean {
  return festivosDelAno(Number(fechaIso.slice(0, 4))).has(fechaIso);
}

/** Lunes a viernes no festivo. */
export function esDiaHabil(fechaIso: string): boolean {
  const w = weekdayOf(fechaIso);
  return w >= 1 && w <= 5 && !esFestivo(fechaIso);
}

/** Días hábiles del rango inclusivo, ascendente. */
export function enumerateDiasHabiles(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let f = desde; f <= hasta; f = addDays(f, 1)) {
    if (esDiaHabil(f)) dias.push(f);
  }
  return dias;
}

export function countDiasHabiles(desde: string, hasta: string): number {
  let total = 0;
  for (let f = desde; f <= hasta; f = addDays(f, 1)) {
    if (esDiaHabil(f)) total += 1;
  }
  return total;
}

/** El n-ésimo día hábil DESPUÉS de la fecha dada (n ≥ 1). */
export function addDiasHabiles(fechaIso: string, n: number): string {
  let fecha = fechaIso;
  let restantes = n;
  while (restantes > 0) {
    fecha = addDays(fecha, 1);
    if (esDiaHabil(fecha)) restantes -= 1;
  }
  return fecha;
}

/** Los últimos n días hábiles hasta `hasta` inclusive (si es hábil), ascendente. */
export function lastNDiasHabiles(hasta: string, n: number): string[] {
  const dias: string[] = [];
  let fecha = hasta;
  while (dias.length < n) {
    if (esDiaHabil(fecha)) dias.push(fecha);
    fecha = addDays(fecha, -1);
  }
  return dias.reverse();
}
