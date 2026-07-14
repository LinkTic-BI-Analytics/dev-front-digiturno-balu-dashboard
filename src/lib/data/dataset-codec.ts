import { addDays, daysBetween } from "@/lib/dates";
import type { AtencionRow, Ticket } from "@/types/atenciones";
import { DATASET_SCHEMA_VERSION, type DatasetPayload } from "@/types/dataset";

/**
 * Codec isomórfico del dataset: el servidor empaqueta filas en columnas con
 * diccionarios (payload compacto que gzip reduce a ~1 MB) y el cliente las
 * decodifica a `Ticket[]`. Ambas funciones son puras.
 */

class Dictionary {
  private indexByKey = new Map<string, number>();
  readonly entries: [id: string, nombre: string][] = [];

  index(id: string | number | null, nombre: string | null): number {
    if (id === null || id === undefined) return -1;
    const key = String(id);
    const existing = this.indexByKey.get(key);
    if (existing !== undefined) return existing;
    const next = this.entries.length;
    this.indexByKey.set(key, next);
    this.entries.push([key, nombre ?? key]);
    return next;
  }
}

/** Minutos (float) → centésimas de minuto (int) para compactar el JSON. */
function packMinutos(minutos: number | null): number | null {
  return minutos === null || minutos === undefined
    ? null
    : Math.round(minutos * 100);
}

export function packDataset(rows: AtencionRow[]): DatasetPayload {
  // Dedupe por ticket_id (primera fila gana: los campos son de nivel ticket).
  const vistos = new Set<string>();
  const tickets: AtencionRow[] = [];
  let fechaBase = "";

  for (const row of rows) {
    if (row.ticket_id === null || row.ticket_id === undefined) continue;
    if (!row.fecha_dia) continue; // sin fecha no participa de ninguna métrica
    const id = String(row.ticket_id);
    if (vistos.has(id)) continue;
    vistos.add(id);
    tickets.push(row);
    if (!fechaBase || row.fecha_dia < fechaBase) fechaBase = row.fecha_dia;
  }

  const sucursales = new Dictionary();
  const asesores = new Dictionary();
  const estadosIndex = new Map<string, number>();
  const estados: string[] = [];

  const payload: DatasetPayload = {
    v: DATASET_SCHEMA_VERSION,
    fechaBase: fechaBase || "1970-01-01",
    sucursales: sucursales.entries,
    asesores: asesores.entries,
    estados,
    dia: [],
    suc: [],
    ase: [],
    est: [],
    esp: [],
    eje: [],
  };

  for (const row of tickets) {
    payload.dia.push(daysBetween(payload.fechaBase, row.fecha_dia as string));
    payload.suc.push(sucursales.index(row.sucursal_id, row.sucursal_nombre));
    payload.ase.push(asesores.index(row.asesor_id, row.asesor_nombre));

    if (row.ticket_estado === null || row.ticket_estado === undefined) {
      payload.est.push(-1);
    } else {
      let idx = estadosIndex.get(row.ticket_estado);
      if (idx === undefined) {
        idx = estados.length;
        estadosIndex.set(row.ticket_estado, idx);
        estados.push(row.ticket_estado);
      }
      payload.est.push(idx);
    }

    payload.esp.push(packMinutos(row.tiempo_espera));
    payload.eje.push(packMinutos(row.tiempo_ejecucion));
  }

  return payload;
}

export function decodeDataset(payload: DatasetPayload): Ticket[] {
  const total = payload.dia.length;
  const tickets: Ticket[] = new Array(total);

  // Cache fecha por offset: hay ~centenares de días distintos vs ~136k tickets.
  const fechaPorDia = new Map<number, string>();
  const fechaDe = (dia: number): string => {
    let fecha = fechaPorDia.get(dia);
    if (!fecha) {
      fecha = addDays(payload.fechaBase, dia);
      fechaPorDia.set(dia, fecha);
    }
    return fecha;
  };

  for (let i = 0; i < total; i++) {
    const suc = payload.suc[i] >= 0 ? payload.sucursales[payload.suc[i]] : null;
    const ase = payload.ase[i] >= 0 ? payload.asesores[payload.ase[i]] : null;
    const esp = payload.esp[i];
    const eje = payload.eje[i];

    tickets[i] = {
      fechaDia: fechaDe(payload.dia[i]),
      sucursalId: suc ? suc[0] : null,
      sucursalNombre: suc ? suc[1] : null,
      asesorId: ase ? ase[0] : null,
      asesorNombre: ase ? ase[1] : null,
      ticketEstado: payload.est[i] >= 0 ? payload.estados[payload.est[i]] : null,
      tiempoEspera: esp === null ? null : esp / 100,
      tiempoEjecucion: eje === null ? null : eje / 100,
    };
  }

  return tickets;
}
