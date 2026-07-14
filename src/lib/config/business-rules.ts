import { MESA_AYUDA_ID } from "./sucursales";

/**
 * ★ Reglas de negocio confirmadas (2026-07-14):
 * - Apoyo Operativo = tickets de la sucursal MESA AYUDA (match por id, el nombre podría cambiar).
 * - ANS = tiempo de atención (`tiempo_ejecucion`) con objetivo de ~15 minutos.
 * - Desistidos = solo `cancelado`; No asistidos = `no_asistio` (métrica propia).
 * - La vista trae los estados en minúscula; computeMetricas normaliza con uppercase.
 */
export interface BusinessRules {
  estadosTicket: {
    cerrados: string[];
    desistidos: string[];
    noAsistidos: string[];
    abiertos: string[];
  };
  /** sucursal_id que define un ticket de mesa de ayuda. */
  apoyoOperativoSucursalId: string;
  /** Objetivo de tiempo de atención en minutos (umbral de cumplimiento del ANS). */
  ansObjetivoMin: number;
}

export const RULES: BusinessRules = {
  estadosTicket: {
    cerrados: ["finalizado"],
    desistidos: ["cancelado"],
    noAsistidos: ["no_asistio"],
    abiertos: ["pendiente", "llamando", "atendiendo"],
  },
  apoyoOperativoSucursalId: MESA_AYUDA_ID,
  ansObjetivoMin: 15,
};
