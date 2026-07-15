"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { GaugeIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { RULES } from "@/lib/config/business-rules";
import { computeForecast } from "@/lib/metrics/forecast";
import { useDashboard } from "@/providers/DashboardDataProvider";
import { ForecastChart } from "./ForecastChart";
import { InsightsPanel } from "./InsightsPanel";
import { ScenarioCards } from "./ScenarioCards";
import { WeekdayDemandChart } from "./WeekdayDemandChart";

/** Proyecciones a 14 días sobre el conjunto filtrado (periodo + asesor + departamento). */
export function ProyeccionesSection() {
  const { filteredTickets, dataset } = useDashboard();

  const forecast = useMemo(
    () => computeForecast(filteredTickets, RULES),
    [filteredTickets],
  );

  return (
    <section aria-labelledby="proyecciones-titulo">
      <header className="mb-4">
        <SectionTitle
          id="proyecciones-titulo"
          titulo="Proyecciones"
          subtitulo="Escenarios a 14 días hábiles según la tendencia y la estacionalidad de lunes a viernes del panorama filtrado"
        />
      </header>

      {forecast.insuficiente ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <GaugeIcon className="h-6 w-6 text-ink-mute" />
          </span>
          <p className="text-sm font-semibold text-ink">
            Datos insuficientes para proyectar
          </p>
          <p className="max-w-md text-sm text-ink-mute">{forecast.motivo}</p>
        </Card>
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity duration-300 xl:grid-cols-3 ${
            dataset.refreshing ? "opacity-75" : "opacity-100"
          }`}
        >
          <Card className="card-lift p-5 xl:col-span-2">
            <h3 className="text-xs font-bold tracking-wide text-ink-soft uppercase">
              Demanda proyectada · próximos 14 días hábiles
            </h3>
            <div className="mt-4">
              <ForecastChart data={forecast} />
            </div>
          </Card>

          <ScenarioCards data={forecast} />

          <Card className="card-lift p-5">
            <h3 className="text-xs font-bold tracking-wide text-ink-soft uppercase">
              Demanda por día de la semana
            </h3>
            <div className="mt-4">
              <WeekdayDemandChart data={forecast} />
            </div>
          </Card>

          <Card className="card-lift p-5 xl:col-span-2">
            <h3 className="text-xs font-bold tracking-wide text-ink-soft uppercase">
              Lectura gerencial
            </h3>
            <div className="mt-4">
              <InsightsPanel data={forecast} />
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
