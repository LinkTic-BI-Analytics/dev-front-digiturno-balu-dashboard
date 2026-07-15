"use client";

import { LayoutGroup } from "motion/react";
import { useState, type ComponentType, type SVGProps } from "react";
import {
  GaugeIcon,
  HeadsetIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { RULES } from "@/lib/config/business-rules";
import { useDashboard } from "@/providers/DashboardDataProvider";
import type { TendenciasResult } from "@/types/metrics";
import { TrendCard } from "./TrendCard";

type TrendKey = keyof TendenciasResult;

interface CardDef {
  id: TrendKey;
  titulo: string;
  leyenda: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const CARD_DEFS: CardDef[] = [
  {
    id: "tickets",
    titulo: "Tickets",
    leyenda: "Tickets registrados en el periodo",
    Icon: TicketIcon,
  },
  {
    id: "apoyoOperativo",
    titulo: "Apoyo Operativo",
    leyenda: "Tickets atendidos por la Mesa de Ayuda",
    Icon: HeadsetIcon,
  },
  {
    id: "asesores",
    titulo: "Asesores",
    leyenda: "Tickets promedio por asesor",
    Icon: UsersIcon,
  },
  {
    id: "ans",
    titulo: "ANS · Tiempo de atención",
    leyenda: `Promedio de atención · objetivo ≤ ${RULES.ansObjetivoMin} min`,
    Icon: GaugeIcon,
  },
];

export function TendenciasSection() {
  const { metrics, dataset } = useDashboard();
  const [expandedId, setExpandedId] = useState<TrendKey | null>(null);

  // La card expandida pasa de primera en el DOM: ocupa ⅔ a la izquierda y
  // las otras tres se apilan en la columna derecha.
  const ordered = expandedId
    ? [
        ...CARD_DEFS.filter((def) => def.id === expandedId),
        ...CARD_DEFS.filter((def) => def.id !== expandedId),
      ]
    : CARD_DEFS;

  return (
    <section aria-labelledby="tendencias-titulo">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <SectionTitle
          id="tendencias-titulo"
          titulo="Tendencias"
          subtitulo="Variación entre el primer y el último día hábil del periodo filtrado"
        />
        {expandedId && (
          <button
            type="button"
            onClick={() => setExpandedId(null)}
            className="text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
          >
            Restablecer vista
          </button>
        )}
      </header>

      <LayoutGroup>
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity duration-300 ${
            dataset.refreshing ? "opacity-75" : "opacity-100"
          } ${
            expandedId
              ? "sm:grid-cols-2 xl:auto-rows-fr xl:grid-cols-3"
              : "sm:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {ordered.map((def) => {
            const expanded = def.id === expandedId;
            return (
              <TrendCard
                key={def.id}
                titulo={def.titulo}
                leyenda={def.leyenda}
                Icon={def.Icon}
                metric={metrics.tendencias[def.id]}
                expanded={expanded}
                onToggle={() =>
                  setExpandedId((prev) => (prev === def.id ? null : def.id))
                }
                className={
                  expanded ? "sm:col-span-2 xl:col-span-2 xl:row-span-3" : ""
                }
              />
            );
          })}
        </div>
      </LayoutGroup>
    </section>
  );
}
