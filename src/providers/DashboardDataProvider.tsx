"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RULES } from "@/lib/config/business-rules";
import { SUCURSAL_BY_ID } from "@/lib/config/sucursales";
import {
  startDatasetStore,
  useDatasetStore,
  type DatasetSnapshot,
} from "@/lib/data/dataset-store";
import { defaultFilterRange } from "@/lib/dates";
import { computeMetricsResult } from "@/lib/metrics/compute";
import {
  distinctAsesores,
  filterByAsesor,
  filterByDepartamento,
  filterByPeriodo,
  filterBySucursal,
  type AsesorOption,
} from "@/lib/metrics/filter";
import { computeGeoStats, type GeoStats } from "@/lib/metrics/geo";
import type { Ticket } from "@/types/atenciones";
import type { FilterState } from "@/types/filters";
import type { MetricsResult } from "@/types/metrics";

/**
 * Pipeline cliente 100 % memoizado sobre el dataset cacheado:
 *
 *   tickets (store, referencia estable entre swaps)
 *    └─ periodTickets  (rango de fechas)
 *        └─ scopeTickets (asesor + sucursal)
 *            ├─ geoStats            ← SIN filtro de departamento: el mapa
 *            │                        conserva el contexto nacional
 *            └─ filteredTickets (departamento)
 *                └─ metrics
 */
interface DashboardContextValue {
  filter: FilterState;
  setFilter: (filter: FilterState) => void;
  selectDepartamento: (departamento: string | null) => void;
  /** Filtrar por sede: enfoca su departamento en el mapa; null → vista nacional. */
  selectSucursal: (sucursalId: string | null) => void;
  metrics: MetricsResult;
  geoStats: GeoStats;
  /** Conjunto final (periodo + asesor + sucursal + departamento): alimenta proyecciones. */
  filteredTickets: Ticket[];
  asesores: AsesorOption[];
  dataset: DatasetSnapshot;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const dataset = useDatasetStore();

  useEffect(() => {
    startDatasetStore();
  }, []);

  const [filter, setFilter] = useState<FilterState>(() => {
    const { desde, hasta } = defaultFilterRange();
    return {
      preset: "mes-actual",
      desde,
      hasta,
      asesorId: null,
      departamento: null,
      sucursalId: null,
    };
  });

  const selectDepartamento = useCallback(
    (departamento: string | null) => {
      setFilter((prev) => {
        // La sucursal solo sobrevive si pertenece al departamento enfocado
        // ("Volver a nacional", el chip y el dblclick en otro depto la limpian).
        const sucursalId =
          departamento !== null &&
          prev.sucursalId !== null &&
          SUCURSAL_BY_ID.get(prev.sucursalId)?.departamento === departamento
            ? prev.sucursalId
            : null;
        // Si el asesor activo no opera en el departamento enfocado, se limpia
        // para no dejar un filtro huérfano (combobox sin esa opción).
        const asesorId =
          departamento !== null &&
          prev.asesorId !== null &&
          !filterByDepartamento(dataset.tickets, departamento).some(
            (t) => t.asesorId === prev.asesorId,
          )
            ? null
            : prev.asesorId;
        return { ...prev, departamento, sucursalId, asesorId };
      });
    },
    [dataset.tickets],
  );

  const selectSucursal = useCallback(
    (sucursalId: string | null) => {
      setFilter((prev) => {
        if (sucursalId === null) {
          // Quitar la sucursal devuelve la vista nacional.
          return { ...prev, sucursalId: null, departamento: null };
        }
        const departamento =
          SUCURSAL_BY_ID.get(sucursalId)?.departamento ?? prev.departamento;
        // Asesor huérfano: sin tickets en la sede seleccionada.
        const asesorId =
          prev.asesorId !== null &&
          !dataset.tickets.some(
            (t) => t.sucursalId === sucursalId && t.asesorId === prev.asesorId,
          )
            ? null
            : prev.asesorId;
        return { ...prev, sucursalId, departamento, asesorId };
      });
    },
    [dataset.tickets],
  );

  // Opciones del combobox de asesores: acotadas a la sucursal o al departamento
  // enfocado (dataset completo, sin periodo, para que la lista sea estable).
  const asesores = useMemo(
    () =>
      distinctAsesores(
        filterBySucursal(
          filterByDepartamento(dataset.tickets, filter.departamento),
          filter.sucursalId,
        ),
      ),
    [dataset.tickets, filter.departamento, filter.sucursalId],
  );

  const periodTickets = useMemo(
    () => filterByPeriodo(dataset.tickets, filter.desde, filter.hasta),
    [dataset.tickets, filter.desde, filter.hasta],
  );

  const scopeTickets = useMemo(
    () =>
      filterBySucursal(
        filterByAsesor(periodTickets, filter.asesorId),
        filter.sucursalId,
      ),
    [periodTickets, filter.asesorId, filter.sucursalId],
  );

  const geoStats = useMemo(() => computeGeoStats(scopeTickets, RULES), [scopeTickets]);

  const filteredTickets = useMemo(
    () => filterByDepartamento(scopeTickets, filter.departamento),
    [scopeTickets, filter.departamento],
  );

  const metrics = useMemo(
    () =>
      computeMetricsResult(
        filteredTickets,
        { desde: filter.desde, hasta: filter.hasta },
        RULES,
      ),
    [filteredTickets, filter.desde, filter.hasta],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      filter,
      setFilter,
      selectDepartamento,
      selectSucursal,
      metrics,
      geoStats,
      filteredTickets,
      asesores,
      dataset,
    }),
    [
      filter,
      selectDepartamento,
      selectSucursal,
      metrics,
      geoStats,
      filteredTickets,
      asesores,
      dataset,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard debe usarse dentro de DashboardDataProvider");
  }
  return context;
}
