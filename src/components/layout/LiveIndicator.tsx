"use client";

import { useDatasetStore } from "@/lib/data/dataset-store";

interface IndicatorConfig {
  etiqueta: string;
  dotClass: string;
  ping: boolean;
}

function resolveConfig(snapshot: {
  hydrated: boolean;
  refreshing: boolean;
  degraded: boolean;
  source: string | null;
}): IndicatorConfig {
  if (snapshot.degraded) {
    return {
      etiqueta: "Sin conexión — reintentando",
      dotClass: "bg-danger",
      ping: false,
    };
  }
  if (snapshot.refreshing) {
    return { etiqueta: "Actualizando datos…", dotClass: "bg-brand", ping: true };
  }
  if (snapshot.source === "postgres") {
    return { etiqueta: "Datos en vivo", dotClass: "bg-success", ping: true };
  }
  if (snapshot.source === "demo") {
    return { etiqueta: "Datos demo", dotClass: "bg-brand", ping: true };
  }
  if (snapshot.source === "sin-configurar") {
    return {
      etiqueta: "Sin conexión de datos",
      dotClass: "bg-ink-mute",
      ping: false,
    };
  }
  return { etiqueta: "Conectando…", dotClass: "bg-ink-mute", ping: true };
}

export function LiveIndicator() {
  const snapshot = useDatasetStore();
  const { etiqueta, dotClass, ping } = resolveConfig(snapshot);

  return (
    <div
      role="status"
      className="inline-flex items-center gap-2.5 rounded-full border border-stroke bg-surface-2 py-1.5 pr-4 pl-3"
    >
      <span className="relative flex h-2.5 w-2.5">
        {ping && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${dotClass} animate-live-ping`}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`}
        />
      </span>
      <span className="text-xs font-semibold whitespace-nowrap text-ink-soft">
        {etiqueta}
      </span>
    </div>
  );
}
