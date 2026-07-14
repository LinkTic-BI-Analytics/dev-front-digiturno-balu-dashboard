import { SEDES_POR_DEPARTAMENTO } from "@/lib/config/sucursales";
import type { Ticket } from "@/types/atenciones";

/** Filtros puros del pipeline cliente: cada uno es un pase O(n) memoizable. */

export function filterByPeriodo(
  tickets: Ticket[],
  desde: string | null,
  hasta: string | null,
): Ticket[] {
  if (!desde && !hasta) return tickets;
  return tickets.filter(
    (t) => (!desde || t.fechaDia >= desde) && (!hasta || t.fechaDia <= hasta),
  );
}

export function filterByAsesor(
  tickets: Ticket[],
  asesorId: string | null,
): Ticket[] {
  if (!asesorId) return tickets;
  return tickets.filter((t) => t.asesorId === asesorId);
}

export function filterByDepartamento(
  tickets: Ticket[],
  departamento: string | null,
): Ticket[] {
  if (!departamento) return tickets;
  const sedes = SEDES_POR_DEPARTAMENTO.get(departamento);
  if (!sedes) return tickets;
  const ids = new Set(sedes.map((s) => s.id));
  return tickets.filter((t) => t.sucursalId !== null && ids.has(t.sucursalId));
}

export interface AsesorOption {
  id: string;
  nombre: string;
}

/** Distinct de asesores del dataset completo, ordenado alfabéticamente. */
export function distinctAsesores(tickets: Ticket[]): AsesorOption[] {
  const byId = new Map<string, string>();
  for (const ticket of tickets) {
    if (ticket.asesorId && !byId.has(ticket.asesorId)) {
      byId.set(ticket.asesorId, ticket.asesorNombre ?? ticket.asesorId);
    }
  }
  return [...byId.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Normaliza para búsqueda por subcadena sin distinguir tildes ni mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
