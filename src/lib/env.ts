/** Lectura centralizada de variables de entorno del servidor. */

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
