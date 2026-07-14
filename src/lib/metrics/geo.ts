import type { BusinessRules } from "@/lib/config/business-rules";
import { SEDES_POR_DEPARTAMENTO, SUCURSAL_BY_ID } from "@/lib/config/sucursales";
import type { Ticket } from "@/types/atenciones";

/** Agregados geográficos para el Mapa de Control (choropleth + popups + sedes). */

export interface DepartamentoStats {
  departamento: string;
  tickets: number;
  sucursales: number;
  asesores: number;
  ansPromedioMin: number | null;
  pctCumplimiento: number | null;
}

export interface SucursalStats {
  sucursalId: string;
  tickets: number;
  ansPromedioMin: number | null;
}

export interface GeoStats {
  porDepartamento: ReadonlyMap<string, DepartamentoStats>;
  porSucursal: ReadonlyMap<string, SucursalStats>;
  /** Extremos del ANS entre departamentos con datos (escala del mapa de calor). */
  ansMin: number | null;
  ansMax: number | null;
}

interface SucursalAcc {
  tickets: number;
  sumEje: number;
  conEje: number;
}

interface DepartamentoAcc extends SucursalAcc {
  cumplen: number;
  asesores: Set<string>;
}

export function computeGeoStats(
  tickets: Ticket[],
  rules: BusinessRules,
): GeoStats {
  const porSucursalAcc = new Map<string, SucursalAcc>();
  const porDepartamentoAcc = new Map<string, DepartamentoAcc>();

  for (const ticket of tickets) {
    if (!ticket.sucursalId) continue;
    const sede = SUCURSAL_BY_ID.get(ticket.sucursalId);
    if (!sede) continue; // defensivo: sucursal desconocida no rompe el mapa

    let suc = porSucursalAcc.get(sede.id);
    if (!suc) {
      suc = { tickets: 0, sumEje: 0, conEje: 0 };
      porSucursalAcc.set(sede.id, suc);
    }
    let dep = porDepartamentoAcc.get(sede.departamento);
    if (!dep) {
      dep = { tickets: 0, sumEje: 0, conEje: 0, cumplen: 0, asesores: new Set() };
      porDepartamentoAcc.set(sede.departamento, dep);
    }

    suc.tickets += 1;
    dep.tickets += 1;
    if (ticket.asesorId) dep.asesores.add(ticket.asesorId);
    if (ticket.tiempoEjecucion !== null) {
      suc.sumEje += ticket.tiempoEjecucion;
      suc.conEje += 1;
      dep.sumEje += ticket.tiempoEjecucion;
      dep.conEje += 1;
      if (ticket.tiempoEjecucion <= rules.ansObjetivoMin) dep.cumplen += 1;
    }
  }

  const porSucursal = new Map<string, SucursalStats>();
  for (const [sucursalId, acc] of porSucursalAcc) {
    porSucursal.set(sucursalId, {
      sucursalId,
      tickets: acc.tickets,
      ansPromedioMin: acc.conEje ? acc.sumEje / acc.conEje : null,
    });
  }

  const porDepartamento = new Map<string, DepartamentoStats>();
  let ansMin: number | null = null;
  let ansMax: number | null = null;

  for (const [departamento, acc] of porDepartamentoAcc) {
    const ans = acc.conEje ? acc.sumEje / acc.conEje : null;
    if (ans !== null) {
      if (ansMin === null || ans < ansMin) ansMin = ans;
      if (ansMax === null || ans > ansMax) ansMax = ans;
    }
    porDepartamento.set(departamento, {
      departamento,
      tickets: acc.tickets,
      sucursales: SEDES_POR_DEPARTAMENTO.get(departamento)?.length ?? 0,
      asesores: acc.asesores.size,
      ansPromedioMin: ans,
      pctCumplimiento: acc.conEje ? (acc.cumplen / acc.conEje) * 100 : null,
    });
  }

  return { porDepartamento, porSucursal, ansMin, ansMax };
}
