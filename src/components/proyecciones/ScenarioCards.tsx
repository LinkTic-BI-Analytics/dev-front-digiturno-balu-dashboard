import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { FORECAST_HORIZON_DIAS_HABILES } from "@/lib/config/constants";
import { formatDecimal, formatEntero, formatPorcentaje } from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";

interface ScenarioCardsProps {
  data: ForecastData;
}

/** Compara el promedio diario del escenario contra la demanda actual. */
function comparativaVsHoy(
  total: number,
  demandaActualDia: number | null,
): string | null {
  if (demandaActualDia === null || demandaActualDia <= 0) return null;
  const pct = (total / FORECAST_HORIZON_DIAS_HABILES / demandaActualDia - 1) * 100;
  if (Math.abs(pct) < 1) return "similar a hoy";
  const signo = pct > 0 ? "+" : "−";
  return `${signo}${formatPorcentaje(Math.abs(pct))} vs hoy`;
}

/** 3 escenarios de demanda: mínimo, base y máximo esperados a 14 días hábiles. */
export function ScenarioCards({ data }: ScenarioCardsProps) {
  const escenarios = [
    {
      id: "minimo",
      titulo: "Mínimo esperado",
      subtitulo: "Si la demanda baja",
      total: data.totales.minimo,
      Icon: TrendDownIcon,
      chip: "bg-success-soft text-success-strong",
      borde: "border-success/25",
    },
    {
      id: "base",
      titulo: "Escenario base",
      subtitulo: "Comportamiento esperado",
      total: data.totales.base,
      Icon: MinusIcon,
      chip: "bg-brand-soft text-brand",
      borde: "border-stroke",
    },
    {
      id: "maximo",
      titulo: "Máximo esperado",
      subtitulo: "Si la demanda sube",
      total: data.totales.maximo,
      Icon: TrendUpIcon,
      chip: "bg-danger-soft text-danger-strong",
      borde: "border-danger/25",
    },
  ] as const;

  return (
    <div className="flex h-full flex-col gap-4">
      {escenarios.map((esc) => {
        const comparativa = comparativaVsHoy(esc.total, data.demandaActualDia);
        return (
          <article
            key={esc.id}
            className={`card-lift flex flex-1 items-center gap-4 rounded-card border bg-surface p-5 shadow-card ${esc.borde}`}
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
                  tickets · {FORECAST_HORIZON_DIAS_HABILES} días hábiles
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-mute">
                {esc.subtitulo} · ~
                {formatDecimal(esc.total / FORECAST_HORIZON_DIAS_HABILES)} por día
                hábil
                {comparativa ? ` · ${comparativa}` : ""}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
