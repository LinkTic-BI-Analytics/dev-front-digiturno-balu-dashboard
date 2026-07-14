import { CalendarIcon, GaugeIcon, UsersIcon } from "@/components/ui/icons";
import { formatDecimal, formatMinutos, formatPorcentaje } from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";
import { TrendDelta } from "@/components/tendencias/TrendDelta";

interface InsightsPanelProps {
  data: ForecastData;
}

/** KPIs proyectados + narrativa gerencial generada a partir del pronóstico. */
export function InsightsPanel({ data }: InsightsPanelProps) {
  const deltaAns =
    data.ansProyectadoMin !== null &&
    data.ansActualMin !== null &&
    data.ansActualMin > 0
      ? ((data.ansProyectadoMin - data.ansActualMin) / data.ansActualMin) * 100
      : null;

  const stats = [
    {
      etiqueta: "ANS proyectado (+14 días)",
      valor:
        data.ansProyectadoMin === null
          ? "—"
          : formatMinutos(data.ansProyectadoMin),
      detalle:
        data.ansActualMin === null
          ? undefined
          : `Hoy: ${formatMinutos(data.ansActualMin)}`,
      Icon: GaugeIcon,
      extra:
        deltaAns !== null ? <TrendDelta deltaPct={deltaAns} invert /> : null,
    },
    {
      etiqueta: "Carga proyectada por asesor",
      valor:
        data.cargaProyectadaDia === null
          ? "—"
          : `${formatDecimal(data.cargaProyectadaDia)} /día`,
      detalle:
        data.cargaActualDia === null
          ? undefined
          : `Hoy: ${formatDecimal(data.cargaActualDia)} /día · ${data.asesoresActivos} asesores`,
      Icon: UsersIcon,
      extra: null,
    },
    {
      etiqueta: "Día pico de demanda",
      valor: data.diaPico ? data.diaPico.nombre : "—",
      detalle: data.diaPico
        ? `+${formatPorcentaje(data.diaPico.pctSobrePromedio)} sobre el promedio`
        : "Demanda uniforme en la semana",
      Icon: CalendarIcon,
      extra: null,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.etiqueta}
            className="rounded-2xl border border-stroke bg-surface-2 p-4"
          >
            <dt className="flex items-center gap-2 text-[11px] leading-4 font-semibold text-ink-mute">
              <stat.Icon className="h-3.5 w-3.5 shrink-0 text-brand" />
              {stat.etiqueta}
            </dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-ink">
                {stat.valor}
              </span>
              {stat.extra}
            </dd>
            {stat.detalle && (
              <p className="mt-0.5 text-[11px] text-ink-mute">{stat.detalle}</p>
            )}
          </div>
        ))}
      </dl>

      <ul className="flex flex-1 flex-col gap-2.5">
        {data.insights.map((frase) => (
          <li
            key={frase}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              aria-hidden="true"
            />
            {frase}
          </li>
        ))}
      </ul>
    </div>
  );
}
