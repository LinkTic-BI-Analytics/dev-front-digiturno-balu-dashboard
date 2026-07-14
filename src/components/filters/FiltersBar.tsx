"use client";

import { CalendarIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { formatDepartamento } from "@/lib/config/sucursales";
import {
  defaultFilterRange,
  lastNDaysRange,
  previousMonthRange,
  todayInBogota,
} from "@/lib/dates";
import { formatFechaLarga } from "@/lib/format";
import { useDashboard } from "@/providers/DashboardDataProvider";
import type { PeriodPreset } from "@/types/filters";
import { AsesorCombobox } from "./AsesorCombobox";

const inputClass =
  "h-9 rounded-full border border-stroke bg-surface-2 px-3.5 text-sm text-ink outline-none transition-colors " +
  "focus:border-brand focus:ring-2 focus:ring-brand/15 [color-scheme:light] dark:[color-scheme:dark]";

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

  return (
    <section aria-label="Filtros del tablero" className="flex flex-col items-center">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-3xl border border-stroke bg-surface px-5 py-3.5 shadow-card sm:rounded-full">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
          <CalendarIcon className="h-4 w-4 text-brand" />
          Periodo
        </span>

        <div className="flex flex-wrap items-center justify-center gap-2">
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
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PRESETS.map((preset) => {
            const activo = filter.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.title}
                onClick={() => applyPreset(preset.id)}
                aria-pressed={activo}
                className={`h-9 rounded-full px-4 font-button text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  activo
                    ? "bg-brand text-brand-contrast shadow-card"
                    : "border border-stroke text-ink-soft hover:bg-surface-2"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <span className="hidden h-6 w-px bg-stroke xl:block" aria-hidden="true" />

        <AsesorCombobox
          asesores={asesores}
          value={filter.asesorId}
          onChange={(asesorId) => setFilter({ ...filter, asesorId })}
        />

        {filter.departamento && (
          <button
            type="button"
            onClick={() => selectDepartamento(null)}
            title="Quitar filtro de departamento"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft-2 px-3.5 text-xs font-semibold text-brand-strong transition-all duration-200 hover:opacity-85 active:scale-95 dark:text-brand"
          >
            <MapPinIcon className="h-3.5 w-3.5" />
            {formatDepartamento(filter.departamento)}
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-2.5 text-xs text-ink-mute">
        {filter.preset === "todo"
          ? "Mostrando todo el histórico disponible"
          : filter.desde && filter.hasta
            ? `${formatFechaLarga(filter.desde)} — ${formatFechaLarga(filter.hasta)}`
            : ""}
      </p>
    </section>
  );
}
