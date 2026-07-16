"use client";

import type { ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { ensureChartsRegistered, readChartTheme, withAlpha } from "@/lib/charts";
import { formatDecimal } from "@/lib/format";
import type { ForecastData } from "@/lib/metrics/forecast";
import { useTheme } from "@/providers/ThemeProvider";

ensureChartsRegistered();

interface WeekdayDemandChartProps {
  data: ForecastData;
}

/** Demanda promedio por día de la semana: accionable para dimensionar turnos. */
export function WeekdayDemandChart({ data }: WeekdayDemandChartProps) {
  const { theme } = useTheme();

  const { chartData, options } = useMemo(() => {
    void theme;
    const chartTheme = readChartTheme();

    const barOptions: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartTheme.surface,
          titleColor: chartTheme.ink,
          bodyColor: chartTheme.inkSoft,
          borderColor: chartTheme.stroke,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: (items) =>
              data.demandaPorDiaSemana[items[0]?.dataIndex ?? 0]?.dia ?? "",
            label: (item) =>
              `Promedio: ${formatDecimal(item.parsed.y ?? 0)} tickets`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: chartTheme.grid },
          ticks: { color: chartTheme.axis, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: chartTheme.grid, lineWidth: 1, drawTicks: false },
          border: { display: false },
          ticks: {
            color: chartTheme.axis,
            padding: 8,
            maxTicksLimit: 5,
            font: { size: 11 },
          },
        },
      },
    };

    return {
      chartData: {
        labels: data.demandaPorDiaSemana.map((d) => d.dia.slice(0, 3)),
        datasets: [
          {
            data: data.demandaPorDiaSemana.map((d) => d.promedio),
            backgroundColor: data.demandaPorDiaSemana.map((d) =>
              d.esPico ? chartTheme.brandStrong : withAlpha(chartTheme.serie, 0.85),
            ),
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: "bottom" as const,
            maxBarThickness: 24,
          },
        ],
      },
      options: barOptions,
    };
  }, [data, theme]);

  return (
    <div className="h-full min-h-52 w-full">
      <Bar
        data={chartData}
        options={options}
        aria-label="Demanda promedio por día de la semana"
      />
    </div>
  );
}
