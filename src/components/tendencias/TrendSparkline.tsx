"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  buildLineOptions,
  ensureChartsRegistered,
  readChartTheme,
  verticalAreaFill,
} from "@/lib/charts";
import { formatFechaCorta } from "@/lib/format";
import { useTheme } from "@/providers/ThemeProvider";
import type { TrendMetric } from "@/types/metrics";

ensureChartsRegistered();

interface TrendSparklineProps {
  metric: TrendMetric;
}

/** Sparkline compacto: línea 2px + área en degradado vertical, sin ejes ni leyenda. */
export function TrendSparkline({ metric }: TrendSparklineProps) {
  const { theme } = useTheme();

  const { data, options } = useMemo(() => {
    // Los colores viven en CSS vars que cambian con la clase .dark del <html>:
    // `theme` fuerza el recálculo al alternar claro/oscuro.
    void theme;
    const chartTheme = readChartTheme();
    const fechas = metric.serie.map((p) => p.fecha);
    return {
      data: {
        labels: fechas.map(formatFechaCorta),
        datasets: [
          {
            data: metric.serie.map((p) => p.valor),
            borderColor: chartTheme.serie,
            backgroundColor: verticalAreaFill(chartTheme.serie),
            fill: true,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: chartTheme.serie,
            pointHoverBorderColor: chartTheme.surface,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: buildLineOptions({
        detail: false,
        unidad: metric.unidad,
        theme: chartTheme,
        fechas,
      }),
    };
  }, [metric, theme]);

  return (
    <div className="h-16 w-full">
      <Line data={data} options={options} aria-label="Tendencia del periodo" />
    </div>
  );
}
