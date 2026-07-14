export interface DailyPoint {
  /** YYYY-MM-DD */
  fecha: string;
  valor: number;
}

export interface SubIndicador {
  etiqueta: string;
  valor: string;
}

export interface TrendMetric {
  /** Valor agregado del periodo (total, porcentaje o minutos según `unidad`). */
  valor: number;
  unidad: "numero" | "porcentaje" | "minutos";
  /** Serie diaria del periodo con días vacíos rellenados en 0. */
  serie: DailyPoint[];
  /** Variación % entre el primer y el último día del periodo; null = no calculable. */
  deltaPct: number | null;
  /** true = subir es malo (p. ej. ANS en minutos): ↑ rojo / ↓ verde. */
  deltaInvertido?: boolean;
  subIndicadores: SubIndicador[];
}

export interface MetricasOperacion {
  cerrados: number;
  desistidos: number;
  noAsistidos: number;
  abiertos: number;
  horasOperacion: number;
}

export interface TendenciasResult {
  tickets: TrendMetric;
  apoyoOperativo: TrendMetric;
  asesores: TrendMetric;
  ans: TrendMetric;
}

export interface MetricsResult {
  tendencias: TendenciasResult;
  metricas: MetricasOperacion;
  totalTickets: number;
}

export type DataSource = "postgres" | "demo" | "sin-configurar";
