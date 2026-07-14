export type PeriodPreset =
  | "mes-actual"
  | "mes-anterior"
  | "ultima-semana"
  | "todo"
  | "personalizado";

export interface FilterState {
  preset: PeriodPreset;
  /** YYYY-MM-DD inclusivo; null en modo "todo". Los presets se materializan aquí. */
  desde: string | null;
  hasta: string | null;
  /** Filtro por asesor (distinct asesor_id del dataset). */
  asesorId: string | null;
  /** Filtro geográfico (clave canónica de departamento, ej. "ANTIOQUIA"). */
  departamento: string | null;
}
