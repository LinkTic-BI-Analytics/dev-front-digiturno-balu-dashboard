import { MESA_AYUDA_ID, SUCURSALES } from "@/lib/config/sucursales";
import { addDays, enumerateDays, todayInBogota } from "@/lib/dates";
import type { AtencionRow } from "@/types/atenciones";

/**
 * Generador determinista de datos simulados (DEMO_MODE=true, sin DATABASE_URL):
 * permite ver el dashboard "vivo" sin base de datos. Usa las sedes REALES de
 * sucursales.ts (ids/nombres) y los estados reales de la vista, de modo que
 * el mapa, el apoyo operativo y las reglas de negocio funcionan igual que en
 * producción. La semilla por día hace los datos estables entre refetches.
 */

const DIAS_HISTORIA_DEMO = 120;

/** Peso de demanda por sede (aproxima la distribución real). */
const PESOS: Record<string, number> = {
  CÚCUTA: 12,
  BUCARAMANGA: 8,
  APARTADÓ: 8,
  "CALLE 128": 8,
  IBAGUÉ: 6,
  TUNJA: 6,
  "MESA AYUDA": 6,
  CALI: 5,
  MEDELLÍN: 4,
  VILLAVICENCIO: 4,
  POPAYÁN: 4,
  PEREIRA: 3,
  PASTO: 3,
  YOPAL: 3,
  BARRANQUILLA: 3,
};
const PESO_DEFAULT = 2;
const TOTAL_PESO = SUCURSALES.reduce(
  (sum, s) => sum + (PESOS[s.nombre] ?? PESO_DEFAULT),
  0,
);

const NOMBRES_ASESORES = [
  "LAURA GOMEZ RIOS",
  "CARLOS RODRIGUEZ PENA",
  "MARIA FERNANDA LOPEZ",
  "ANDRES TORRES CASTRO",
  "PAULA MARTINEZ DUQUE",
  "JUAN PABLO HERRERA",
  "DIANA CAROLINA RUIZ",
  "SANTIAGO MORENO VEGA",
  "VALENTINA OSPINA CRUZ",
  "FELIPE CARDENAS MEJIA",
  "CAMILA SANCHEZ PARDO",
  "DAVID RAMIREZ SOTO",
  "NATALIA QUINTERO MORA",
  "SEBASTIAN VARGAS LEON",
  "ANGELA PATINO SIERRA",
  "MIGUEL ANGEL SUAREZ",
  "CATALINA REYES BRAVO",
  "OSCAR JAVIER MOLINA",
  "JULIANA CASTRO NIETO",
  "RICARDO ACOSTA GIL",
];

export function generateDemoRows(): AtencionRow[] {
  const hasta = todayInBogota();
  const desde = addDays(hasta, -(DIAS_HISTORIA_DEMO - 1));

  const rows: AtencionRow[] = [];
  for (const fecha of enumerateDays(desde, hasta)) {
    generateDayRows(fecha, rows);
  }
  return rows;
}

function generateDayRows(fecha: string, rows: AtencionRow[]): void {
  const rand = mulberry32(hashString(`balu-demo-${fecha}`));
  const weekday = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const base = weekday === 0 ? 40 : weekday === 6 ? 120 : 420;
  const totalDia = Math.round(base * (0.8 + rand() * 0.5));

  for (let i = 0; i < totalDia; i++) {
    const sucursal = pickSucursal(rand);
    const esMesaAyuda = sucursal.id === MESA_AYUDA_ID;
    const asesoresSede = esMesaAyuda ? 5 : 3 + (hashString(sucursal.id) % 5);
    const asesorIndex = Math.floor(rand() * asesoresSede);
    const asesorId = `${sucursal.id}-a${asesorIndex}`;

    const { estado, tiempoEspera, tiempoEjecucion } = rollAtencion(rand);

    const baseRow: AtencionRow = {
      ticket_id: `demo-${fecha}-${i}`,
      fecha_dia: fecha,
      sucursal_id: sucursal.id,
      sucursal_nombre: sucursal.nombre,
      asesor_id: estado === "pendiente" ? null : asesorId,
      asesor_nombre:
        estado === "pendiente"
          ? null
          : NOMBRES_ASESORES[hashString(asesorId) % NOMBRES_ASESORES.length],
      ticket_estado: estado,
      tiempo_espera: tiempoEspera,
      tiempo_ejecucion: tiempoEjecucion,
    };
    rows.push(baseRow);

    // ~25% con fila duplicada: ejercita el dedupe del packer como la vista real.
    if (rand() < 0.25) rows.push({ ...baseRow });
  }
}

function rollAtencion(rand: () => number): {
  estado: string;
  tiempoEspera: number | null;
  tiempoEjecucion: number | null;
} {
  const roll = rand();
  const espera = round2(2 + rand() * rand() * 30);
  // Ejecución sesgada alrededor del objetivo ANS (~15 min).
  const ejecucion = round2(4 + rand() * rand() * 34);

  if (roll < 0.9) {
    return { estado: "finalizado", tiempoEspera: espera, tiempoEjecucion: ejecucion };
  }
  if (roll < 0.96) {
    return { estado: "no_asistio", tiempoEspera: espera, tiempoEjecucion: null };
  }
  if (roll < 0.98) {
    return { estado: "cancelado", tiempoEspera: espera, tiempoEjecucion: null };
  }
  if (roll < 0.995) {
    return { estado: "atendiendo", tiempoEspera: espera, tiempoEjecucion: null };
  }
  return { estado: "pendiente", tiempoEspera: null, tiempoEjecucion: null };
}

function pickSucursal(rand: () => number) {
  let objetivo = rand() * TOTAL_PESO;
  for (const sucursal of SUCURSALES) {
    objetivo -= PESOS[sucursal.nombre] ?? PESO_DEFAULT;
    if (objetivo <= 0) return sucursal;
  }
  return SUCURSALES[SUCURSALES.length - 1];
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
