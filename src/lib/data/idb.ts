import type { DatasetPayload } from "@/types/dataset";
import type { DataSource } from "@/types/metrics";

/**
 * Persistencia del dataset en IndexedDB (localStorage no alcanza: el payload
 * pesa ~3 MB). Toda la API es tolerante a fallos: en Safari privado o con IDB
 * bloqueada simplemente se opera en memoria.
 */

const DB_NAME = "balu-dashboard";
const DB_VERSION = 1;
const STORE_NAME = "dataset";
const KEY = "payload";

export interface CachedDataset {
  payload: DatasetPayload;
  source: DataSource;
  generatedAt: string;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function readCachedDataset(): Promise<CachedDataset | null> {
  try {
    const value = await withStore("readonly", (store) => store.get(KEY));
    return (value as CachedDataset | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function writeCachedDataset(entry: CachedDataset): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(entry, KEY));
  } catch {
    // Sin persistencia: el dashboard sigue funcionando en memoria.
  }
}

export async function clearCachedDataset(): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nada que limpiar.
  }
}
