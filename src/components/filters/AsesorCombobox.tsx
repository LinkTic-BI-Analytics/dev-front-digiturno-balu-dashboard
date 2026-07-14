"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UsersIcon, XIcon } from "@/components/ui/icons";
import { normalizeText, type AsesorOption } from "@/lib/metrics/filter";

interface AsesorComboboxProps {
  asesores: AsesorOption[];
  value: string | null;
  onChange: (asesorId: string | null) => void;
}

const MAX_VISIBLE = 60;

/**
 * Combobox accesible con búsqueda por subcadena (en cualquier parte del
 * nombre, ignorando tildes y mayúsculas). Seleccionar un asesor filtra todo
 * el dashboard.
 */
export function AsesorCombobox({ asesores, value, onChange }: AsesorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => asesores.find((a) => a.id === value) ?? null,
    [asesores, value],
  );

  const filtered = useMemo(() => {
    const needle = normalizeText(query.trim());
    const matches = needle
      ? asesores.filter((a) => normalizeText(a.nombre).includes(needle))
      : asesores;
    return matches.slice(0, MAX_VISIBLE);
  }, [asesores, query]);

  // Cierre al hacer clic fuera del componente.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const select = (asesor: AsesorOption) => {
    onChange(asesor.id);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
      scrollHighlightedIntoView(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
      scrollHighlightedIntoView(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) select(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const scrollHighlightedIntoView = (direction: 1 | -1) => {
    requestAnimationFrame(() => {
      const list = listRef.current;
      const item = list?.querySelector<HTMLElement>('[data-highlighted="true"]');
      item?.scrollIntoView({ block: direction === 1 ? "nearest" : "nearest" });
    });
  };

  return (
    <div ref={rootRef} className="relative w-full sm:w-72">
      <div className="relative">
        <UsersIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="asesor-listbox"
          aria-label="Filtrar por asesor"
          placeholder={selected ? selected.nombre : "Todos los asesores"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`h-9 w-full rounded-full border border-stroke bg-surface-2 pr-9 pl-9 text-sm transition-colors outline-none placeholder:font-medium focus:border-brand focus:ring-2 focus:ring-brand/15 ${
            selected ? "placeholder:text-ink" : "placeholder:text-ink-mute"
          } text-ink`}
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Quitar filtro de asesor"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-mute transition-colors hover:bg-surface hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="asesor-listbox"
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full min-w-64 overflow-y-auto rounded-2xl border border-stroke bg-surface p-1.5 shadow-pop"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-ink-mute">
              Sin coincidencias para “{query}”
            </li>
          )}
          {filtered.map((asesor, index) => {
            const isSelected = asesor.id === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={asesor.id}
                role="option"
                aria-selected={isSelected}
                data-highlighted={isHighlighted}
                onPointerEnter={() => setHighlighted(index)}
                onClick={() => select(asesor)}
                className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors ${
                  isHighlighted ? "bg-brand-soft text-ink" : "text-ink-soft"
                } ${isSelected ? "font-semibold text-brand-strong dark:text-brand" : ""}`}
              >
                {asesor.nombre}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
