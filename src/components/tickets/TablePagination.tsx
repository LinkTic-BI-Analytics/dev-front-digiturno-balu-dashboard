"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatEntero } from "@/lib/format";

interface TablePaginationProps {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const buttonClass =
  "inline-flex h-8 items-center gap-1 rounded-control border border-stroke px-2.5 font-button text-xs " +
  "font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink " +
  "disabled:pointer-events-none disabled:opacity-40";

/** Pie de tabla: rango visible + navegación Anterior/Siguiente. */
export function TablePagination({
  total,
  page,
  pageCount,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  const inicio = (page - 1) * pageSize + 1;
  const fin = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación de tickets"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-stroke px-4 py-3"
    >
      <p className="text-xs text-ink-mute" aria-live="polite">
        Mostrando{" "}
        <span className="font-semibold text-ink-soft">
          {formatEntero(inicio)}–{formatEntero(fin)}
        </span>{" "}
        de <span className="font-semibold text-ink-soft">{formatEntero(total)}</span>{" "}
        tickets
      </p>

      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-mute">
          Página {formatEntero(page)} de {formatEntero(pageCount)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={buttonClass}
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className={buttonClass}
          >
            Siguiente
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
