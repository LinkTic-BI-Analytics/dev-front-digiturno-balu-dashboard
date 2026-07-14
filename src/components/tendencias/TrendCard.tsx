"use client";

import { m } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import {
  formatDecimal,
  formatEntero,
  formatMinutos,
  formatPorcentaje,
} from "@/lib/format";
import type { TrendMetric } from "@/types/metrics";
import { TrendDelta } from "./TrendDelta";
import { TrendDetailChart } from "./TrendDetailChart";
import { TrendSparkline } from "./TrendSparkline";

interface TrendCardProps {
  titulo: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  metric: TrendMetric;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

function formatValor(metric: TrendMetric): string {
  if (metric.unidad === "porcentaje") return formatPorcentaje(metric.valor);
  if (metric.unidad === "minutos") return formatMinutos(metric.valor);
  return Number.isInteger(metric.valor)
    ? formatEntero(metric.valor)
    : formatDecimal(metric.valor);
}

/** Card interactiva de tendencia: clic para expandir/contraer con animación de layout (FLIP). */
export function TrendCard({
  titulo,
  Icon,
  metric,
  expanded,
  onToggle,
  className = "",
}: TrendCardProps) {
  return (
    <m.article
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`${titulo}: ${formatValor(metric)}. ${
        expanded ? "Contraer" : "Expandir"
      } detalle`}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`group flex cursor-pointer flex-col rounded-card border bg-surface p-5 shadow-card outline-none transition-[border-color,box-shadow] duration-200 select-none hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand ${
        expanded ? "border-brand/40" : "border-stroke hover:border-stroke-strong"
      } ${className}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <h3 className="line-clamp-2 text-xs leading-tight font-bold tracking-wide text-ink-soft uppercase">
            {titulo}
          </h3>
        </div>
        <TrendDelta
          deltaPct={metric.deltaPct}
          invert={metric.deltaInvertido}
          size={expanded ? "lg" : "sm"}
        />
      </header>

      <p
        className={`mt-3 font-bold tracking-tight text-ink ${
          expanded ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
        }`}
      >
        {formatValor(metric)}
      </p>

      <div
        className={
          expanded ? "mt-5 min-h-0 flex-1" : "mt-3 flex flex-1 flex-col justify-end"
        }
      >
        {expanded ? (
          <TrendDetailChart metric={metric} />
        ) : (
          <TrendSparkline metric={metric} />
        )}
      </div>

      {metric.subIndicadores.length > 0 && (
        <dl
          className={`mt-4 grid gap-3 border-t border-stroke pt-3.5 ${
            metric.subIndicadores.length === 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {metric.subIndicadores.map((sub) => (
            <div key={sub.etiqueta} className="min-w-0">
              <dt className="truncate text-[11px] leading-4 text-ink-mute" title={sub.etiqueta}>
                {sub.etiqueta}
              </dt>
              <dd
                className={`mt-0.5 font-semibold wrap-break-word text-ink ${
                  expanded ? "text-base" : "text-sm"
                }`}
              >
                {sub.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </m.article>
  );
}
