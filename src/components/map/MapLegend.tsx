import { formatMinutos } from "@/lib/format";
import { ANS_HEAT_STOPS } from "./ControlMap";

interface MapLegendProps {
  ansMin: number | null;
  ansMax: number | null;
}

const GRADIENT = `linear-gradient(90deg, ${ANS_HEAT_STOPS.map(
  ([stop, color]) => `${color} ${stop * 100}%`,
).join(", ")})`;

/** Leyenda del mapa de calor: escala real del ANS del periodo filtrado. */
export function MapLegend({ ansMin, ansMax }: MapLegendProps) {
  if (ansMin === null || ansMax === null) return null;

  return (
    <div className="pointer-events-none absolute bottom-8 left-3 z-10 rounded-xl border border-stroke bg-surface/90 px-3.5 py-2.5 shadow-card backdrop-blur-sm">
      <p className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">
        ANS · Tiempo de atención
      </p>
      <div
        className="mt-1.5 h-2 w-44 rounded-full"
        style={{ background: GRADIENT }}
        aria-hidden="true"
      />
      <div className="mt-1 flex justify-between text-[10px] font-medium text-ink-mute">
        <span>Más ágil · {formatMinutos(ansMin)}</span>
        <span>Más lento · {formatMinutos(ansMax)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-mute">
        <span className="h-2.5 w-2.5 rounded-sm bg-[#a8a29e]" aria-hidden="true" />
        Sin sucursales activas
      </div>
    </div>
  );
}
