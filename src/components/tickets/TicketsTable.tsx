"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/ui/icons";
import { RULES } from "@/lib/config/business-rules";
import { formatFechaCorta, formatHora, formatMinutos } from "@/lib/format";
import type { Ticket } from "@/types/atenciones";
import { EstadoBadge } from "./EstadoBadge";
import { TablePagination } from "./TablePagination";

const PAGE_SIZE = 10;

type SortCol =
  | "turno"
  | "fecha"
  | "sucursal"
  | "asesor"
  | "tramite"
  | "estado"
  | "espera"
  | "atencion";

interface SortState {
  col: SortCol;
  dir: "asc" | "desc";
}

const COLUMNS: { id: SortCol; label: string; numeric?: boolean }[] = [
  { id: "turno", label: "Turno" },
  { id: "fecha", label: "Fecha" },
  { id: "sucursal", label: "Sucursal" },
  { id: "asesor", label: "Asesor" },
  { id: "tramite", label: "Trámite" },
  { id: "estado", label: "Estado" },
  { id: "espera", label: "Espera", numeric: true },
  { id: "atencion", label: "Atención", numeric: true },
];

/** Valor de ordenamiento por columna (null = siempre al final). */
function keyDe(ticket: Ticket, col: SortCol): string | number | null {
  switch (col) {
    case "turno":
      return ticket.turno;
    case "fecha":
      return null; // la fecha usa comparador compuesto propio
    case "sucursal":
      return ticket.sucursalNombre;
    case "asesor":
      return ticket.asesorNombre;
    case "tramite":
      return ticket.tramite;
    case "estado":
      return ticket.ticketEstado;
    case "espera":
      return ticket.tiempoEspera;
    case "atencion":
      return ticket.tiempoEjecucion;
  }
}

function compareFecha(a: Ticket, b: Ticket): number {
  return (
    a.fechaDia.localeCompare(b.fechaDia) ||
    (a.inicioMin ?? -1) - (b.inicioMin ?? -1)
  );
}

function sortTickets(tickets: Ticket[], sort: SortState): Ticket[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  // Copia obligatoria: el array de entrada alimenta métricas y proyecciones.
  return [...tickets].sort((a, b) => {
    if (sort.col === "fecha") return compareFecha(a, b) * factor;
    const ka = keyDe(a, sort.col);
    const kb = keyDe(b, sort.col);
    if (ka === null && kb === null) return compareFecha(a, b);
    if (ka === null) return 1; // nulls al final en ambas direcciones
    if (kb === null) return -1;
    const cmp =
      typeof ka === "string"
        ? ka.localeCompare(kb as string, "es")
        : ka - (kb as number);
    return (cmp || compareFecha(a, b)) * factor;
  });
}

/** Tabla de trazabilidad: ordenable por columna, paginada de a 10. */
export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  const [sort, setSort] = useState<SortState>({ col: "fecha", dir: "desc" });
  const [page, setPage] = useState(1);

  // Al cambiar el conjunto filtrado se vuelve a la primera página (ajuste de
  // estado durante render: patrón recomendado, sin efectos).
  const [prevTickets, setPrevTickets] = useState(tickets);
  if (prevTickets !== tickets) {
    setPrevTickets(tickets);
    setPage(1);
  }

  const sorted = useMemo(() => sortTickets(tickets, sort), [tickets, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibles = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "fecha" ? "desc" : "asc" },
    );
    setPage(1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const activa = sort.col === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={
                      activa
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className="border-b border-stroke px-3 py-1 first:pl-4 last:pr-4"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      aria-label={`Ordenar por ${col.label}`}
                      className={`group flex w-full items-center gap-1 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors ${
                        col.numeric ? "justify-end" : ""
                      } ${activa ? "text-ink" : "text-ink-soft hover:text-ink"}`}
                    >
                      {col.label}
                      {activa ? (
                        sort.dir === "asc" ? (
                          <ChevronUpIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
                        )
                      ) : (
                        <ArrowsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-ink-mute opacity-0 transition-opacity group-hover:opacity-70" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.map((ticket, index) => {
              const cumpleAns =
                ticket.tiempoEjecucion !== null
                  ? ticket.tiempoEjecucion <= RULES.ansObjetivoMin
                  : null;
              return (
                <tr
                  key={`${ticket.turno ?? "t"}-${ticket.fechaDia}-${index}`}
                  className="border-b border-stroke/60 transition-colors last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-3 py-2.5 pl-4 font-medium whitespace-nowrap text-ink">
                    {ticket.turno ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-soft">
                    {formatFechaCorta(ticket.fechaDia)}
                    {ticket.inicioMin !== null && (
                      <span className="text-ink-mute">
                        {" "}
                        · {formatHora(ticket.inicioMin)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-soft">
                    {ticket.sucursalNombre ?? "—"}
                  </td>
                  <td
                    className="max-w-56 truncate px-3 py-2.5 text-ink-soft"
                    title={ticket.asesorNombre ?? undefined}
                  >
                    {ticket.asesorNombre ?? "—"}
                  </td>
                  <td
                    className="max-w-64 truncate px-3 py-2.5 text-ink-soft"
                    title={ticket.tramite ?? undefined}
                  >
                    {ticket.tramite ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <EstadoBadge estado={ticket.ticketEstado} />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-soft tabular-nums">
                    {ticket.tiempoEspera !== null
                      ? formatMinutos(ticket.tiempoEspera)
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 pr-4 text-right whitespace-nowrap text-ink tabular-nums">
                    {ticket.tiempoEjecucion !== null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          title={
                            cumpleAns
                              ? `Cumple ANS (≤ ${RULES.ansObjetivoMin} min)`
                              : `No cumple ANS (> ${RULES.ansObjetivoMin} min)`
                          }
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            cumpleAns ? "bg-success" : "bg-danger"
                          }`}
                        />
                        <span className="sr-only">
                          {cumpleAns ? "Cumple ANS:" : "No cumple ANS:"}
                        </span>
                        {formatMinutos(ticket.tiempoEjecucion)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        total={sorted.length}
        page={safePage}
        pageCount={pageCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </Card>
  );
}
