"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import { formatMinutos } from "@/lib/format";
import { ANS_HEAT_STOPS } from "./ControlMap";

interface MapLegendProps {
  ansMin: number | null;
  ansMax: number | null;
}

const GRADIENT = `linear-gradient(90deg, ${ANS_HEAT_STOPS.map(
  ([stop, color]) => `${color} ${stop * 100}%`,
).join(", ")})`;

function Swatch({ color, texto }: { color: string; texto: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-ink-mute">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {texto}
    </div>
  );
}

/** Leyenda del mapa de calor: escala real del ANS bajo los filtros activos. */
export function MapLegend({ ansMin, ansMax }: MapLegendProps) {
  const [abierta, setAbierta] = useState(true);

  if (ansMin === null || ansMax === null) return null;
  const ansMid = (ansMin + ansMax) / 2;

  return (
    <div className="w-full rounded-card border border-stroke bg-surface/95 px-4 py-3 shadow-card backdrop-blur-md sm:w-60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">
          ANS · Tiempo de atención
        </p>
        <button
          type="button"
          onClick={() => setAbierta((prev) => !prev)}
          aria-expanded={abierta}
          aria-label={abierta ? "Compactar leyenda" : "Expandir leyenda"}
          className="rounded-full p-0.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {abierta ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {abierta && (
        <>
          <div
            className="mt-2 h-2.5 rounded-full ring-1 ring-stroke/60"
            style={{ background: GRADIENT }}
            aria-hidden="true"
          />
          <div className="mt-1.5 grid grid-cols-3 text-[10px]">
            <div>
              <p className="text-ink-mute">Ágil</p>
              <p className="font-semibold text-ink-soft tabular-nums">
                {formatMinutos(ansMin)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-ink-mute">Medio</p>
              <p className="font-semibold text-ink-soft tabular-nums">
                {formatMinutos(ansMid)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-ink-mute">Lento</p>
              <p className="font-semibold text-ink-soft tabular-nums">
                {formatMinutos(ansMax)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-col gap-1 border-t border-stroke pt-2">
            <Swatch color="#a8a29e" texto="Sin sucursales activas" />
            <Swatch color="#d6d3d1" texto="Sin datos en el periodo" />
          </div>
        </>
      )}
    </div>
  );
}
