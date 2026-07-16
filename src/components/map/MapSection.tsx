"use client";

import dynamic from "next/dynamic";
import { MapPinIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { formatDepartamento } from "@/lib/config/sucursales";
import { useDashboard } from "@/providers/DashboardDataProvider";
import { DepartamentoInfoCard } from "./DepartamentoInfoCard";
import { MapLegend } from "./MapLegend";

// mapbox-gl pesa ~230 KB gz: se carga solo en cliente y solo en esta vista.
const ControlMap = dynamic(
  () => import("./ControlMap").then((mod) => mod.ControlMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-card border border-stroke bg-surface-2">
        <div className="flex flex-col items-center gap-3 text-ink-mute">
          <MapPinIcon className="h-8 w-8 animate-pulse" />
          <p className="text-sm font-medium">Cargando mapa…</p>
        </div>
      </div>
    ),
  },
);

export function MapSection() {
  const { filter, selectDepartamento, geoStats } = useDashboard();

  return (
    <section aria-labelledby="mapa-titulo" className="flex flex-col">
      <header className="mb-4">
        <SectionTitle
          id="mapa-titulo"
          titulo="Mapa de Control"
          subtitulo={
            filter.departamento
              ? `Enfocado en ${formatDepartamento(filter.departamento)} — todo el tablero está filtrado por este departamento`
              : "Mapa de calor por ANS (tiempo de atención) · doble clic en un departamento para enfocarlo"
          }
        />
      </header>

      <div className="relative flex min-h-[420px] flex-1 flex-col xl:min-h-[560px]">
        <div className="relative min-h-[420px] flex-1">
          <ControlMap
            geoStats={geoStats}
            selectedDepartamento={filter.departamento}
            onSelectDepartamento={selectDepartamento}
          />

          {filter.departamento && (
            <button
              type="button"
              onClick={() => selectDepartamento(null)}
              className="animate-scale-in absolute top-3 right-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full border border-stroke bg-surface px-4 font-button text-xs font-semibold text-ink shadow-card transition-all duration-200 hover:border-brand hover:text-brand active:scale-95"
            >
              ← Volver a nacional
            </button>
          )}
        </div>

        {/* En móvil las cards van DEBAJO del mapa (no tapan la visual);
            en ≥sm flotan como overlays en la franja inferior. */}
        <div className="mt-3 flex flex-col gap-3 sm:pointer-events-none sm:absolute sm:inset-x-3 sm:bottom-8 sm:z-10 sm:mt-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:pointer-events-auto">
            <MapLegend ansMin={geoStats.ansMin} ansMax={geoStats.ansMax} />
          </div>
          {filter.departamento && (
            <div className="sm:pointer-events-auto sm:ml-auto">
              <DepartamentoInfoCard
                departamento={filter.departamento}
                stats={geoStats.porDepartamento.get(filter.departamento)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
