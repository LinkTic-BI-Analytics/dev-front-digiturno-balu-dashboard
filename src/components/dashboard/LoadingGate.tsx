"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { retryDatasetLoad } from "@/lib/data/dataset-store";
import { ShieldAlertIcon } from "@/components/ui/icons";

const ETAPAS = [
  "Conectando con la operación…",
  "Descargando el histórico de tickets…",
  "Preparando el tablero gerencial…",
];

const ETAPA_INTERVAL_MS = 1800;

interface LoadingGateProps {
  /** true cuando el primer fetch falló y no hay caché: muestra reintento. */
  degraded: boolean;
}

/** Gate de carga inicial: solo se ve cuando aún no hay dataset (ni en IndexedDB). */
export function LoadingGate({ degraded }: LoadingGateProps) {
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setEtapa((prev) => Math.min(prev + 1, ETAPAS.length - 1)),
      ETAPA_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-canvas px-6">
      <div className="animate-fade-up flex flex-col items-center gap-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full border-2 border-stroke"
            aria-hidden="true"
          />
          <span
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand [animation-duration:1.4s]"
            aria-hidden="true"
          />
          <Image
            src="/graphic_identity/positiva_logo.svg"
            alt="Positiva"
            width={72}
            height={17}
            priority
            className="w-16 dark:brightness-0 dark:invert"
          />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight text-ink">
            Digiturno Balú
          </h1>
          <p className="mt-0.5 text-xs font-medium text-ink-mute">
            Tablero de Operación
          </p>
        </div>
      </div>

      {degraded ? (
        <div className="animate-fade-up flex flex-col items-center gap-4 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
            <ShieldAlertIcon className="h-5 w-5 text-danger" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            No fue posible conectar con la fuente de datos. Se reintentará
            automáticamente en unos minutos.
          </p>
          <button
            type="button"
            onClick={retryDatasetLoad}
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-6 font-button text-sm font-semibold text-brand-contrast transition-all duration-200 hover:bg-brand-strong active:scale-95"
          >
            Reintentar ahora
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-surface-2">
            <span className="animate-gate-shimmer absolute inset-y-0 w-1/3 rounded-full bg-brand" />
          </div>
          <p
            className="text-xs font-medium text-ink-mute"
            role="status"
            aria-live="polite"
          >
            {ETAPAS[etapa]}
          </p>
        </div>
      )}
    </div>
  );
}
