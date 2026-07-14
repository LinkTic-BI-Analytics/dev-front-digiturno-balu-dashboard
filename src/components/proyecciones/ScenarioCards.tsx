import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { formatDecimal, formatEntero } from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";
import { FORECAST_HORIZON_DIAS } from "@/lib/config/constants";

interface ScenarioCardsProps {
  data: ForecastData;
}

/** 3 escenarios con encuadre de capacidad: más demanda = mayor carga operativa. */
export function ScenarioCards({ data }: ScenarioCardsProps) {
  const escenarios = [
    {
      id: "optimista",
      titulo: "Escenario optimista",
      subtitulo: "Menor carga (−1σ)",
      total: data.totales.optimista,
      Icon: TrendDownIcon,
      chip: "bg-success-soft text-success-strong",
      borde: "border-success/25",
    },
    {
      id: "base",
      titulo: "Escenario base",
      subtitulo: "Tendencia + estacionalidad",
      total: data.totales.base,
      Icon: MinusIcon,
      chip: "bg-brand-soft text-brand",
      borde: "border-stroke",
    },
    {
      id: "pesimista",
      titulo: "Escenario pesimista",
      subtitulo: "Mayor carga (+1σ)",
      total: data.totales.pesimista,
      Icon: TrendUpIcon,
      chip: "bg-danger-soft text-danger-strong",
      borde: "border-danger/25",
    },
  ] as const;

  return (
    <div className="flex h-full flex-col gap-4">
      {escenarios.map((esc) => (
        <article
          key={esc.id}
          className={`flex flex-1 items-center gap-4 rounded-card border bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${esc.borde}`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${esc.chip}`}
          >
            <esc.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-soft">{esc.titulo}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink">
              {formatEntero(esc.total)}
              <span className="ml-1.5 text-xs font-semibold text-ink-mute">
                tickets / {FORECAST_HORIZON_DIAS} días
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink-mute">
              {esc.subtitulo} · ~
              {formatDecimal(esc.total / FORECAST_HORIZON_DIAS)} por día
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
