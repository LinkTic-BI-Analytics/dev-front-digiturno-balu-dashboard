"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  buildLineOptions,
  ensureChartsRegistered,
  readChartTheme,
  withAlpha,
} from "@/lib/charts";
import { formatFechaCorta } from "@/lib/format";
import { useTheme } from "@/providers/ThemeProvider";
import type { TrendMetric } from "@/types/metrics";

ensureChartsRegistered();

interface TrendDetailChartProps {
  metric: TrendMetric;
}

/** Gráfica detallada de la card expandida: ejes visibles, grid hairline y crosshair. */
export function TrendDetailChart({ metric }: TrendDetailChartProps) {
  const { theme } = useTheme();

  const { data, options } = useMemo(() => {
    // Los colores viven en CSS vars que cambian con la clase .dark del <html>:
    // `theme` fuerza el recálculo al alternar claro/oscuro.
    void theme;
    const chartTheme = readChartTheme();
    const fechas = metric.serie.map((p) => p.fecha);
    const puntos = metric.serie.length;
    return {
      data: {
        labels: fechas.map(formatFechaCorta),
        datasets: [
          {
            data: metric.serie.map((p) => p.valor),
            borderColor: chartTheme.serie,
            backgroundColor: withAlpha(chartTheme.serie, 0.1),
            fill: true,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: puntos <= 45 ? 3 : 0,
            pointBackgroundColor: chartTheme.serie,
            pointBorderColor: chartTheme.surface,
            pointBorderWidth: 2,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: chartTheme.serie,
            pointHoverBorderColor: chartTheme.surface,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: buildLineOptions({
        detail: true,
        unidad: metric.unidad,
        theme: chartTheme,
        fechas,
      }),
    };
  }, [metric, theme]);

  return (
    <div className="h-full min-h-[220px] w-full">
      <Line
        data={data}
        options={options}
        aria-label="Detalle de la tendencia del periodo"
      />
    </div>
  );
}
