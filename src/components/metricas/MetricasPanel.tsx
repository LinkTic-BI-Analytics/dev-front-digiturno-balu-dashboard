"use client";

import {
  CheckCircleIcon,
  InboxIcon,
  TimerIcon,
  UserXIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { formatEntero, formatHoras } from "@/lib/format";
import { useDashboard } from "@/providers/DashboardDataProvider";
import { MetricCard } from "./MetricCard";

export function MetricasPanel() {
  const { metrics, dataset } = useDashboard();
  const { metricas } = metrics;

  const items = [
    {
      titulo: "Tickets cerrados",
      valor: formatEntero(metricas.cerrados),
      Icon: CheckCircleIcon,
      tone: "success",
    },
    {
      titulo: "Tickets desistidos",
      valor: formatEntero(metricas.desistidos),
      detalle: "Cancelados por el usuario",
      Icon: XCircleIcon,
      tone: "danger",
    },
    {
      titulo: "Tickets no asistidos",
      valor: formatEntero(metricas.noAsistidos),
      detalle: "El usuario no se presentó",
      Icon: UserXIcon,
      tone: "warning",
    },
    {
      titulo: "Tickets abiertos",
      valor: formatEntero(metricas.abiertos),
      Icon: InboxIcon,
      tone: "info",
    },
    {
      titulo: "Tiempo total en atención",
      valor: formatHoras(metricas.horasOperacion),
      detalle: "Horas de operación del periodo",
      Icon: TimerIcon,
      tone: "brand",
    },
  ] as const;

  return (
    <section aria-labelledby="metricas-titulo" className="flex flex-col">
      <header className="mb-4">
        <h2
          id="metricas-titulo"
          className="text-lg font-bold tracking-tight text-ink"
        >
          Métricas
        </h2>
        <p className="mt-0.5 text-sm text-ink-mute">
          Resumen operativo del periodo
        </p>
      </header>
      <div
        className={`grid flex-1 grid-cols-1 gap-4 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-1 ${
          dataset.refreshing ? "opacity-75" : "opacity-100"
        }`}
      >
        {items.map((item) => (
          <MetricCard key={item.titulo} {...item} />
        ))}
      </div>
    </section>
  );
}
