import { Pool } from "pg";

/**
 * Pool de Postgres SOLO para el servidor (Session Pooler de Supabase, rol de
 * solo lectura). La cadena de conexión no lleva prefijo NEXT_PUBLIC_ a
 * propósito: jamás debe llegar al bundle del navegador.
 *
 * Se cachea en globalThis para sobrevivir el hot-reload de desarrollo sin
 * fugar conexiones.
 */
const globalForDb = globalThis as unknown as { baluDbPool?: Pool };

export function getDbPool(): Pool {
  if (!globalForDb.baluDbPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("La base de datos no está configurada: define DATABASE_URL.");
    }
    globalForDb.baluDbPool = new Pool({
      connectionString,
      // El pooler de Supabase exige TLS; su certificado no está en el trust store de Node.
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return globalForDb.baluDbPool;
}
