"use client";

import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { formatDepartamento } from "@/lib/config/sucursales";
import { formatEntero } from "@/lib/format";
import { useDashboard } from "@/providers/DashboardDataProvider";
import { TicketsTable } from "./TicketsTable";

/**
 * Trazabilidad ticket a ticket del alcance filtrado. Solo se muestra con un
 * departamento enfocado o un asesor seleccionado (drill-down): del panorama
 * general al detalle.
 */
export function TicketsSection() {
  const { filteredTickets, filter, asesores, dataset } = useDashboard();

  const partes: string[] = [];
  if (filter.departamento) partes.push(formatDepartamento(filter.departamento));
  if (filter.asesorId) {
    const asesor = asesores.find((a) => a.id === filter.asesorId);
    if (asesor) partes.push(asesor.nombre);
  }
  partes.push(`${formatEntero(filteredTickets.length)} tickets en el periodo`);

  return (
    <section aria-labelledby="tickets-titulo">
      <header className="mb-4">
        <SectionTitle
          id="tickets-titulo"
          titulo="Detalle de tickets"
          subtitulo={partes.join(" · ")}
        />
      </header>

      <div
        className={`transition-opacity duration-300 ${
          dataset.refreshing ? "opacity-75" : "opacity-100"
        }`}
      >
        {filteredTickets.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-ink-mute">
            Sin tickets para los filtros seleccionados.
          </Card>
        ) : (
          <TicketsTable tickets={filteredTickets} />
        )}
      </div>
    </section>
  );
}
