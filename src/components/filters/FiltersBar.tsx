"use client";

import { Card } from "@/components/ui/Card";
import { CalendarIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { formatDepartamento } from "@/lib/config/sucursales";
import {
  defaultFilterRange,
  lastNDaysRange,
  previousMonthRange,
  todayInBogota,
} from "@/lib/dates";
import { countDiasHabiles } from "@/lib/festivos";
import { formatEntero, formatFechaLarga } from "@/lib/format";
import { useDashboard } from "@/providers/DashboardDataProvider";
import type { PeriodPreset } from "@/types/filters";
import { AsesorCombobox } from "./AsesorCombobox";

const inputClass =
  "h-9 rounded-control border border-stroke bg-surface-2 px-3 text-sm text-ink outline-none transition-colors " +
  "focus:border-brand focus:ring-2 focus:ring-brand/15 [color-scheme:light] dark:[color-scheme:dark]";

const groupLabelClass =
  "mb-1.5 block text-[11px] font-semibold tracking-wide text-ink-mute uppercase";

const PRESETS: { id: PeriodPreset; label: string; title: string }[] = [
  { id: "ultima-semana", label: "Última semana", title: "Últimos 7 días corridos" },
  { id: "mes-actual", label: "Mes actual", title: "Del 1.º del mes a hoy" },
  { id: "mes-anterior", label: "Mes anterior", title: "Mes calendario anterior completo" },
  { id: "todo", label: "Todo", title: "Todo el histórico disponible" },
];

export function FiltersBar() {
  const { filter, setFilter, selectDepartamento, asesores } = useDashboard();
  const hoy = todayInBogota();

  const applyPreset = (preset: PeriodPreset) => {
    const rango =
      preset === "ultima-semana"
        ? lastNDaysRange(7)
        : preset === "mes-anterior"
          ? previousMonthRange()
          : preset === "mes-actual"
            ? defaultFilterRange()
            : { desde: null, hasta: null };
    setFilter({ ...filter, preset, ...rango });
  };

  const applyDesde = (value: string) => {
    if (!value) return;
    const hasta = filter.hasta && filter.hasta >= value ? filter.hasta : hoy;
    setFilter({
      ...filter,
      preset: "personalizado",
      desde: value,
      hasta: hasta >= value ? hasta : value,
    });
  };

  const applyHasta = (value: string) => {
    if (!value) return;
    const desde = filter.desde && filter.desde <= value ? filter.desde : value;
    setFilter({ ...filter, preset: "personalizado", desde, hasta: value });
  };

  const hayFiltros = filter.departamento !== null || filter.asesorId !== null;

  const resumenPeriodo =
    filter.preset === "todo"
      ? "Mostrando todo el histórico disponible"
      : filter.desde && filter.hasta
        ? `${formatFechaLarga(filter.desde)} — ${formatFechaLarga(filter.hasta)} · ${formatEntero(
            countDiasHabiles(filter.desde, filter.hasta),
          )} días hábiles`
        : "";

  return (
    <section aria-label="Filtros del tablero">
      <Card className="flex w-full flex-col gap-4 px-5 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(18rem,22rem)] lg:items-end">
          <div>
            <span className={groupLabelClass}>Periodo</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-mute">Desde</span>
                <input
                  type="date"
                  value={filter.desde ?? ""}
                  max={hoy}
                  onChange={(e) => applyDesde(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-mute">Hasta</span>
                <input
                  type="date"
                  value={filter.hasta ?? ""}
                  max={hoy}
                  onChange={(e) => applyHasta(e.target.value)}
                  className={inputClass}
                />
              </label>

              <div
                role="group"
                aria-label="Periodos predefinidos"
                className="inline-flex flex-wrap rounded-control border border-stroke bg-surface-2 p-0.5"
              >
                {PRESETS.map((preset) => {
                  const activo = filter.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.title}
                      onClick={() => applyPreset(preset.id)}
                      aria-pressed={activo}
                      className={`h-8 rounded-md px-3 font-button text-xs font-semibold transition-colors duration-200 ${
                        activo
                          ? "bg-linear-to-b from-brand to-brand-strong text-brand-contrast shadow-card"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <span className={groupLabelClass}>Asesor</span>
            <AsesorCombobox
              asesores={asesores}
              value={filter.asesorId}
              onChange={(asesorId) => setFilter({ ...filter, asesorId })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-stroke pt-3">
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
            {resumenPeriodo}
          </p>

          {hayFiltros && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-mute">Filtros:</span>
              {filter.departamento && (
                <button
                  type="button"
                  onClick={() => selectDepartamento(null)}
                  title="Quitar filtro de departamento"
                  className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-brand-soft-2 px-3 text-xs font-semibold text-brand-strong transition-all duration-200 hover:opacity-85 active:scale-95 dark:text-brand"
                >
                  <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {formatDepartamento(filter.departamento)}
                  </span>
                  <XIcon className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setFilter({ ...filter, departamento: null, asesorId: null })
                }
                className="text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
