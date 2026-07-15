import { TrendDelta } from "@/components/tendencias/TrendDelta";
import {
  ArrowRightIcon,
  CalendarIcon,
  GaugeIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { FORECAST_HORIZON_DIAS_HABILES } from "@/lib/config/constants";
import { RULES } from "@/lib/config/business-rules";
import {
  formatDecimal,
  formatEntero,
  formatMinutos,
  formatPorcentaje,
} from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";
import type { ComponentType, ReactNode, SVGProps } from "react";

interface InsightsPanelProps {
  data: ForecastData;
}

function deltaPct(hoy: number | null, proyectado: number | null): number | null {
  if (hoy === null || proyectado === null || hoy <= 0) return null;
  return ((proyectado - hoy) / hoy) * 100;
}

interface TileComparativo {
  etiqueta: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  hoy: string;
  proyectado: string;
  delta: ReactNode;
  detalle: string;
}

/** Fila comparativa "Hoy → En 14 días hábiles" — el corazón de la lectura gerencial. */
function ComparativaTile({ tile }: { tile: TileComparativo }) {
  return (
    <div className="rounded-2xl border border-stroke bg-surface-2 p-4">
      <dt className="flex items-center gap-2 text-[11px] leading-4 font-semibold text-ink-mute">
        <tile.Icon className="h-3.5 w-3.5 shrink-0 text-brand" />
        {tile.etiqueta}
      </dt>
      <dd className="mt-2.5 flex items-end gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-ink-mute uppercase">
            Hoy
          </p>
          <p className="text-base leading-6 font-semibold text-ink-soft">
            {tile.hoy}
          </p>
        </div>
        <ArrowRightIcon className="mb-1 h-4 w-4 shrink-0 text-ink-mute" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-ink-mute uppercase">
            En {FORECAST_HORIZON_DIAS_HABILES} días hábiles
          </p>
          <p className="flex items-center gap-2 text-xl leading-6 font-bold tracking-tight text-ink">
            {tile.proyectado}
            {tile.delta}
          </p>
        </div>
      </dd>
      <p className="mt-1.5 text-[11px] text-ink-mute">{tile.detalle}</p>
    </div>
  );
}

/** KPIs comparativos hoy → proyección + narrativa gerencial del pronóstico. */
export function InsightsPanel({ data }: InsightsPanelProps) {
  const demandaProyectadaDia = data.totales.base / FORECAST_HORIZON_DIAS_HABILES;
  const deltaDemanda = deltaPct(data.demandaActualDia, demandaProyectadaDia);
  const deltaAns = deltaPct(data.ansActualMin, data.ansProyectadoMin);
  const deltaCarga = deltaPct(data.cargaActualDia, data.cargaProyectadaDia);

  const tiles: TileComparativo[] = [
    {
      etiqueta: "Demanda diaria",
      Icon: TicketIcon,
      hoy:
        data.demandaActualDia === null
          ? "—"
          : formatDecimal(data.demandaActualDia),
      proyectado: formatDecimal(demandaProyectadaDia),
      delta:
        deltaDemanda !== null ? <TrendDelta deltaPct={deltaDemanda} /> : null,
      detalle: "Tickets por día hábil",
    },
    {
      etiqueta: "Tiempo de atención (ANS)",
      Icon: GaugeIcon,
      hoy: data.ansActualMin === null ? "—" : formatMinutos(data.ansActualMin),
      proyectado:
        data.ansProyectadoMin === null
          ? "—"
          : formatMinutos(data.ansProyectadoMin),
      delta: deltaAns !== null ? <TrendDelta deltaPct={deltaAns} invert /> : null,
      detalle: `Objetivo ≤ ${RULES.ansObjetivoMin} min`,
    },
    {
      etiqueta: "Tickets por asesor al día",
      Icon: UsersIcon,
      hoy:
        data.cargaActualDia === null
          ? "—"
          : formatDecimal(data.cargaActualDia),
      proyectado:
        data.cargaProyectadaDia === null
          ? "—"
          : formatDecimal(data.cargaProyectadaDia),
      delta: deltaCarga !== null ? <TrendDelta deltaPct={deltaCarga} /> : null,
      detalle: `Con los ${formatEntero(data.asesoresActivos)} asesores actuales`,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <ComparativaTile key={tile.etiqueta} tile={tile} />
        ))}

        <div className="rounded-2xl border border-stroke bg-surface-2 p-4">
          <dt className="flex items-center gap-2 text-[11px] leading-4 font-semibold text-ink-mute">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
            Día pico de demanda
          </dt>
          <dd className="mt-2.5 text-xl leading-6 font-bold tracking-tight text-ink">
            {data.diaPico ? data.diaPico.nombre : "—"}
          </dd>
          <p className="mt-1.5 text-[11px] text-ink-mute">
            {data.diaPico
              ? `+${formatPorcentaje(data.diaPico.pctSobrePromedio)} sobre el promedio semanal`
              : "Demanda uniforme en la semana"}
          </p>
        </div>
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
