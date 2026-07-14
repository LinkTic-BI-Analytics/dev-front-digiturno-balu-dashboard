"use client";

import { useSyncExternalStore } from "react";
import { REFRESH_INTERVAL_MS } from "@/lib/config/constants";
import type { Ticket } from "@/types/atenciones";
import { DATASET_SCHEMA_VERSION, type DatasetApiResponse } from "@/types/dataset";
import type { DataSource } from "@/types/metrics";
import { decodeDataset } from "./dataset-codec";
import { clearCachedDataset, readCachedDataset, writeCachedDataset } from "./idb";

/**
 * Caché del dataset en el cliente (store de módulo + useSyncExternalStore):
 *
 * - Arranque: hidrata desde IndexedDB si hay caché (dashboard instantáneo tras
 *   F5) y revalida en background; sin caché muestra el LoadingGate hasta el
 *   primer fetch.
 * - Ciclo cada 3 min: health-ping barato → fetch del dataset → decodificación
 *   FUERA de React → swap atómico de la referencia `tickets` (doble búfer: la
 *   UI nunca ve estados intermedios) → persistencia en IDB.
 * - Fallos (502/red): los datos actuales quedan intactos, `degraded=true`
 *   ("Sin conexión — reintentando") y se reintenta al siguiente ciclo.
 */

export interface DatasetSnapshot {
  tickets: Ticket[];
  source: DataSource | null;
  generatedAt: string | null;
  /** true cuando hay datos utilizables (de red o de caché IDB). */
  hydrated: boolean;
  /** Refresco en curso (inicial o de fondo). */
  refreshing: boolean;
  /** Último ciclo falló: datos visibles pero potencialmente desactualizados. */
  degraded: boolean;
  lastSyncAt: number | null;
}

const INITIAL_SNAPSHOT: DatasetSnapshot = {
  tickets: [],
  source: null,
  generatedAt: null,
  hydrated: false,
  refreshing: false,
  degraded: false,
  lastSyncAt: null,
};

let snapshot: DatasetSnapshot = INITIAL_SNAPSHOT;
const listeners = new Set<() => void>();

let started = false;
let fetching = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function emit(partial: Partial<DatasetSnapshot>): void {
  snapshot = { ...snapshot, ...partial };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DatasetSnapshot {
  return snapshot;
}

function getServerSnapshot(): DatasetSnapshot {
  return INITIAL_SNAPSHOT;
}

function redirectToLogin(): void {
  window.location.href = "/";
}

async function bootstrap(): Promise<void> {
  const cached = await readCachedDataset();
  if (cached && cached.payload.v === DATASET_SCHEMA_VERSION) {
    emit({
      tickets: decodeDataset(cached.payload),
      source: cached.source,
      generatedAt: cached.generatedAt,
      hydrated: true,
      lastSyncAt: cached.savedAt,
    });
  }
  await refresh();
}

async function refresh(): Promise<void> {
  if (fetching) return;
  fetching = true;
  emit({ refreshing: true });

  try {
    // Con datos en pantalla, un ping barato evita descargar ~1 MB con la BD caída.
    if (snapshot.hydrated) {
      const health = await fetch("/api/health", { cache: "no-store" });
      if (health.status === 401) {
        redirectToLogin();
        return;
      }
      if (!health.ok) throw new Error(`health HTTP ${health.status}`);
    }

    const response = await fetch("/api/dataset", { cache: "no-store" });
    if (response.status === 401) {
      redirectToLogin();
      return;
    }
    if (!response.ok) throw new Error(`dataset HTTP ${response.status}`);

    const body = (await response.json()) as DatasetApiResponse;
    const tickets = decodeDataset(body.payload);

    emit({
      tickets,
      source: body.source,
      generatedAt: body.generatedAt,
      hydrated: true,
      degraded: false,
      lastSyncAt: Date.now(),
    });

    void writeCachedDataset({
      payload: body.payload,
      source: body.source,
      generatedAt: body.generatedAt,
      savedAt: Date.now(),
    });
  } catch (error) {
    console.error("[dataset-store]", error);
    emit({ degraded: true });
  } finally {
    fetching = false;
    emit({ refreshing: false });
  }
}

function onTick(): void {
  if (document.visibilityState === "visible") void refresh();
}

function onVisibilityChange(): void {
  if (document.visibilityState !== "visible") return;
  const stale =
    snapshot.lastSyncAt === null ||
    Date.now() - snapshot.lastSyncAt > REFRESH_INTERVAL_MS;
  if (stale) void refresh();
}

/** Idempotente: lo dispara el shell del dashboard al montar. */
export function startDatasetStore(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  void bootstrap();
  intervalId = setInterval(onTick, REFRESH_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

/** Reintento manual (botón del LoadingGate en estado de error). */
export function retryDatasetLoad(): void {
  void refresh();
}

/** Limpieza al cerrar sesión: sin datos residuales en el equipo. */
export async function disposeDatasetCache(): Promise<void> {
  await clearCachedDataset();
  if (intervalId) clearInterval(intervalId);
  snapshot = INITIAL_SNAPSHOT;
  started = false;
}

export function useDatasetStore(): DatasetSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
