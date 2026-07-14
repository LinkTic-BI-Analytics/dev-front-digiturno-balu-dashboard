import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { formatPorcentaje } from "@/lib/format";

interface TrendDeltaProps {
  deltaPct: number | null;
  /** true = subir es malo (métricas de tiempo): ↑ rojo / ↓ verde. */
  invert?: boolean;
  /** Tamaño mayor cuando la card está expandida. */
  size?: "sm" | "lg";
}

/** Indicador de tendencia entre el primer y el último día del periodo. */
export function TrendDelta({ deltaPct, invert = false, size = "sm" }: TrendDeltaProps) {
  const sizeClass = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  const iconClass = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (deltaPct === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-surface-2 font-semibold text-ink-mute ${sizeClass}`}
        title="Tendencia no calculable para el periodo"
      >
        <MinusIcon className={iconClass} />—
      </span>
    );
  }

  const subio = deltaPct >= 0;
  const esBueno = invert ? !subio : subio;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClass} ${
        esBueno
          ? "bg-success-soft text-success-strong"
          : "bg-danger-soft text-danger-strong"
      }`}
      title="Variación entre el primer y el último día del periodo"
    >
      {subio ? (
        <TrendUpIcon className={iconClass} />
      ) : (
        <TrendDownIcon className={iconClass} />
      )}
      {subio ? "+" : "−"}
      {formatPorcentaje(Math.abs(deltaPct))}
    </span>
  );
}
