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
      dotClass: "bg-danger shadow-[0_0_8px_1px] shadow-danger/50",
      ping: false,
    };
  }
  if (snapshot.refreshing) {
    return {
      etiqueta: "Actualizando datos…",
      dotClass: "bg-brand shadow-[0_0_8px_1px] shadow-brand/50",
      ping: true,
    };
  }
  if (snapshot.source === "postgres") {
    return {
      etiqueta: "Datos en vivo",
      dotClass: "bg-success shadow-[0_0_8px_1px] shadow-success/50",
      ping: true,
    };
  }
  if (snapshot.source === "demo") {
    return {
      etiqueta: "Datos demo",
      dotClass: "bg-brand shadow-[0_0_8px_1px] shadow-brand/50",
      ping: true,
    };
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

export function LiveIndicator({ compact = false }: { compact?: boolean }) {
  const snapshot = useDatasetStore();
  const { etiqueta, dotClass, ping } = resolveConfig(snapshot);

  const dot = (
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
  );

  if (compact) {
    // Variante móvil: solo el punto de estado (la etiqueta va en aria/title).
    return (
      <span
        role="status"
        aria-label={etiqueta}
        title={etiqueta}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-surface-2"
      >
        {dot}
      </span>
    );
  }

  return (
    <div
      role="status"
      className="inline-flex items-center gap-2.5 rounded-full border border-stroke bg-surface-2 py-1.5 pr-4 pl-3"
    >
      {dot}
      <span className="text-xs font-semibold whitespace-nowrap text-ink-soft">
        {etiqueta}
      </span>
    </div>
  );
}
