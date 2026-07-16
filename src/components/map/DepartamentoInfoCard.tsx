import { MapPinIcon } from "@/components/ui/icons";
import { formatDepartamento } from "@/lib/config/sucursales";
import { formatEntero, formatMinutos, formatPorcentaje } from "@/lib/format";
import type { DepartamentoStats } from "@/lib/metrics/geo";

interface DepartamentoInfoCardProps {
  /** Clave canónica del departamento enfocado. */
  departamento: string;
  stats: DepartamentoStats | undefined;
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-ink-soft">{etiqueta}</span>
      <span className="font-semibold text-ink tabular-nums">{valor}</span>
    </div>
  );
}

/**
 * Reemplaza al popup hover durante el drill-down: card fija con las cifras
 * del departamento enfocado bajo los filtros activos.
 */
export function DepartamentoInfoCard({
  departamento,
  stats,
}: DepartamentoInfoCardProps) {
  return (
    <div className="animate-scale-in w-full rounded-card border border-stroke bg-surface/95 p-4 shadow-pop backdrop-blur-md sm:w-64">
      <div className="flex items-center gap-2">
        <MapPinIcon className="h-4 w-4 shrink-0 text-brand" />
        <p className="truncate text-sm font-bold tracking-tight text-ink">
          {formatDepartamento(departamento)}
        </p>
      </div>

      {!stats || stats.tickets === 0 ? (
        <p className="mt-2 text-xs text-ink-mute">
          Sin tickets en el periodo filtrado.
        </p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <Fila etiqueta="Tickets" valor={formatEntero(stats.tickets)} />
          <Fila etiqueta="Sucursales" valor={formatEntero(stats.sucursales)} />
          <Fila etiqueta="Asesores" valor={formatEntero(stats.asesores)} />
          <Fila
            etiqueta="ANS · atención prom."
            valor={
              stats.ansPromedioMin === null
                ? "—"
                : formatMinutos(stats.ansPromedioMin)
            }
          />
          <Fila
            etiqueta="Cumplimiento"
            valor={
              stats.pctCumplimiento === null
                ? "—"
                : formatPorcentaje(stats.pctCumplimiento)
            }
          />
        </div>
      )}

      <p className="mt-2.5 border-t border-stroke pt-2 text-[11px] leading-4 text-ink-mute">
        Cifras del periodo y filtros activos
      </p>
    </div>
  );
}
