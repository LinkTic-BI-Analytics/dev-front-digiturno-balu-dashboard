"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  buildLineOptions,
  ensureChartsRegistered,
  readChartTheme,
  withAlpha,
} from "@/lib/charts";
import { formatDecimal, formatFechaCorta } from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";
import { useTheme } from "@/providers/ThemeProvider";

ensureChartsRegistered();

interface ForecastChartProps {
  data: ForecastData;
}

/**
 * Historia reciente (línea sólida) + 3 escenarios a 14 días (punteados) con
 * banda de incertidumbre ±1σ entre optimista y pesimista.
 */
export function ForecastChart({ data }: ForecastChartProps) {
  const { theme } = useTheme();

  const { chartData, options } = useMemo(() => {
    void theme; // recalcula colores al alternar claro/oscuro
    const chartTheme = readChartTheme();

    const histFechas = data.history.map((p) => p.fecha);
    const fcFechas = data.forecast.map((p) => p.fecha);
    const fechas = [...histFechas, ...fcFechas];
    const n = histFechas.length;
    const anchor = data.history[n - 1]?.valor ?? 0;

    // Las proyecciones nacen ancladas al último punto real.
    const proyectada = (selector: (p: ForecastData["forecast"][number]) => number) => [
      ...new Array<number | null>(Math.max(n - 1, 0)).fill(null),
      anchor,
      ...data.forecast.map(selector),
    ];

    const base = buildLineOptions({
      detail: true,
      unidad: "numero",
      theme: chartTheme,
      fechas,
    });

    return {
      chartData: {
        labels: fechas.map(formatFechaCorta),
        datasets: [
          {
            label: "Histórico",
            data: [...data.history.map((p) => p.valor), ...new Array<number | null>(fcFechas.length).fill(null)],
            borderColor: chartTheme.serie,
            backgroundColor: chartTheme.serieFill,
            fill: true,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: chartTheme.serie,
            pointHoverBorderColor: chartTheme.surface,
            pointHoverBorderWidth: 2,
          },
          {
            label: "Optimista (menor carga)",
            data: proyectada((p) => p.optimista),
            borderColor: chartTheme.success,
            borderWidth: 1.5,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: "Pesimista (mayor carga)",
            data: proyectada((p) => p.pesimista),
            borderColor: chartTheme.danger,
            backgroundColor: withAlpha(chartTheme.serie, 0.08),
            borderWidth: 1.5,
            borderDash: [5, 5],
            fill: "-1", // banda de incertidumbre hasta la línea optimista
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: "Escenario base",
            data: proyectada((p) => p.base),
            borderColor: chartTheme.serie,
            borderWidth: 2,
            borderDash: [7, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: chartTheme.serie,
            pointHoverBorderColor: chartTheme.surface,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        ...base,
        plugins: {
          ...base.plugins,
          legend: {
            display: true,
            position: "bottom" as const,
            labels: {
              color: chartTheme.inkSoft,
              usePointStyle: true,
              pointStyle: "line" as const,
              boxWidth: 24,
              font: { size: 11 },
            },
          },
          tooltip: {
            ...base.plugins?.tooltip,
            callbacks: {
              ...base.plugins?.tooltip?.callbacks,
              label: (item: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                `${item.dataset.label}: ${formatDecimal(item.parsed.y ?? 0)}`,
            },
          },
        },
      },
    };
  }, [data, theme]);

  return (
    <div className="h-72 w-full sm:h-80">
      <Line
        data={chartData}
        options={options}
        aria-label="Proyección de demanda a 14 días"
      />
    </div>
  );
}
