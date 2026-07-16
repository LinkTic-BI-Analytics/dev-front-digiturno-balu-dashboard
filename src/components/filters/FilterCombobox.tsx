"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { XIcon } from "@/components/ui/icons";
import { normalizeText } from "@/lib/metrics/filter";

export interface FilterComboOption {
  id: string;
  nombre: string;
  /** Línea secundaria opcional (p. ej. el departamento de una sede). */
  detalle?: string;
}

interface FilterComboboxProps {
  options: FilterComboOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** id del listbox (único por instancia, para aria-controls). */
  listboxId: string;
  ariaLabel: string;
  placeholder: string;
  clearLabel: string;
}

const MAX_VISIBLE = 60;

/**
 * Combobox accesible con búsqueda por subcadena (en cualquier parte del
 * nombre, ignorando tildes y mayúsculas). Seleccionar una opción filtra todo
 * el dashboard.
 */
export function FilterCombobox({
  options,
  value,
  onChange,
  Icon,
  listboxId,
  ariaLabel,
  placeholder,
  clearLabel,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = normalizeText(query.trim());
    const matches = needle
      ? options.filter((o) => normalizeText(o.nombre).includes(needle))
      : options;
    return matches.slice(0, MAX_VISIBLE);
  }, [options, query]);

  // Cierre al hacer clic fuera del componente.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const select = (option: FilterComboOption) => {
    onChange(option.id);
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
      scrollHighlightedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
      scrollHighlightedIntoView();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) select(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const scrollHighlightedIntoView = () => {
    requestAnimationFrame(() => {
      const item = listRef.current?.querySelector<HTMLElement>(
        '[data-highlighted="true"]',
      );
      item?.scrollIntoView({ block: "nearest" });
    });
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          placeholder={selected ? selected.nombre : placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`h-9 w-full rounded-control border border-stroke bg-surface-2 pr-9 pl-9 text-sm transition-colors outline-none placeholder:font-medium focus:border-brand focus:ring-2 focus:ring-brand/15 ${
            selected ? "placeholder:text-ink" : "placeholder:text-ink-mute"
          } text-ink`}
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={clear}
            aria-label={clearLabel}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-mute transition-colors hover:bg-surface hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full min-w-64 overflow-y-auto rounded-card border border-stroke bg-surface p-1.5 shadow-pop"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-ink-mute">
              Sin coincidencias para “{query}”
            </li>
          )}
          {filtered.map((option, index) => {
            const isSelected = option.id === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={option.id}
                role="option"
                aria-selected={isSelected}
                data-highlighted={isHighlighted}
                onPointerEnter={() => setHighlighted(index)}
                onClick={() => select(option)}
                className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors ${
                  isHighlighted ? "bg-brand-soft text-ink" : "text-ink-soft"
                } ${isSelected ? "font-semibold text-brand-strong dark:text-brand" : ""}`}
              >
                {option.nombre}
                {option.detalle && (
                  <span className="mt-0.5 block text-[11px] font-normal text-ink-mute">
                    {option.detalle}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
