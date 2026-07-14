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
 *        └─ scopeTickets (asesor)
 *            ├─ geoStats            ← SIN filtro de departamento: el mapa
 *            │                        conserva el contexto nacional
 *            └─ filteredTickets (departamento)
 *                └─ metrics
 */
interface DashboardContextValue {
  filter: FilterState;
  setFilter: (filter: FilterState) => void;
  selectDepartamento: (departamento: string | null) => void;
  metrics: MetricsResult;
  geoStats: GeoStats;
  /** Conjunto final (periodo + asesor + departamento): alimenta proyecciones. */
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
    return { preset: "mes-actual", desde, hasta, asesorId: null, departamento: null };
  });

  const selectDepartamento = useCallback((departamento: string | null) => {
    setFilter((prev) => ({ ...prev, departamento }));
  }, []);

  const asesores = useMemo(
    () => distinctAsesores(dataset.tickets),
    [dataset.tickets],
  );

  const periodTickets = useMemo(
    () => filterByPeriodo(dataset.tickets, filter.desde, filter.hasta),
    [dataset.tickets, filter.desde, filter.hasta],
  );

  const scopeTickets = useMemo(
    () => filterByAsesor(periodTickets, filter.asesorId),
    [periodTickets, filter.asesorId],
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
      metrics,
      geoStats,
      filteredTickets,
      asesores,
      dataset,
    }),
    [filter, selectDepartamento, metrics, geoStats, filteredTickets, asesores, dataset],
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
