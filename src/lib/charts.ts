"use client";

import {
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { formatDecimal, formatFechaLarga, formatPorcentaje } from "@/lib/format";
import type { TrendMetric } from "@/types/metrics";

let registered = false;

/** Registro tree-shaken de Chart.js (líneas, barras, leyenda del forecast). */
export function ensureChartsRegistered(): void {
  if (registered) return;
  Chart.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    BarElement,
    Filler,
    Tooltip,
    Legend,
  );
  registered = true;
}

export interface ChartTheme {
  /** Color de la serie principal (token --chart-1, validado en ambos temas). */
  serie: string;
  serieFill: string;
  /** Colores de estado (dots/chips; NO se usan como series de líneas). */
  success: string;
  danger: string;
  brandStrong: string;
  grid: string;
  axis: string;
  surface: string;
  ink: string;
  inkSoft: string;
  /** Neutro para las líneas mín/máx del forecast (validado ≥3:1 en ambos temas). */
  inkMute: string;
  stroke: string;
}

/** Fallback para el render de servidor (los canvas solo dibujan en cliente). */
const SSR_FALLBACK_THEME: ChartTheme = {
  serie: "#df7702",
  serieFill: "rgba(223, 119, 2, 0.1)",
  success: "#0d8c3c",
  danger: "#bd1c1c",
  brandStrong: "#c05800",
  grid: "#eceae4",
  axis: "#b8b4ac",
  surface: "#ffffff",
  ink: "#1c1917",
  inkSoft: "#57534e",
  inkMute: "#8a8680",
  stroke: "#e8e5df",
};

/** Lee la paleta de charts desde las CSS vars del tema activo. */
export function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") return SSR_FALLBACK_THEME;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  const serie = read("--chart-1");
  return {
    serie,
    serieFill: withAlpha(serie, 0.1),
    success: read("--success"),
    danger: read("--danger"),
    brandStrong: read("--brand-strong"),
    grid: read("--chart-grid"),
    axis: read("--chart-axis"),
    surface: read("--surface"),
    ink: read("--ink"),
    inkSoft: read("--ink-soft"),
    inkMute: read("--ink-mute"),
    stroke: read("--stroke"),
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type AreaFillContext = { chart: Chart };

/**
 * Relleno de área con gradiente vertical (vivo arriba → transparente abajo).
 * Solo acepta hex de 6 dígitos (como --chart-1). Scriptable de Chart.js:
 * cachea el gradiente por altura del chartArea; si aún no existe (primer
 * render) cae al fill plano.
 */
export function verticalAreaFill(hex: string) {
  let cache: { key: string; gradient: CanvasGradient } | null = null;
  return (context: AreaFillContext): CanvasGradient | string => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return withAlpha(hex, 0.1);
    const key = `${hex}:${chartArea.top}:${chartArea.bottom}`;
    if (cache?.key !== key) {
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, withAlpha(hex, 0.22));
      gradient.addColorStop(1, withAlpha(hex, 0));
      cache = { key, gradient };
    }
    return cache.gradient;
  };
}

function formatValor(valor: number, unidad: TrendMetric["unidad"]): string {
  return unidad === "porcentaje" ? formatPorcentaje(valor) : formatDecimal(valor);
}

/**
 * Opciones compartidas de los charts de línea del dashboard.
 * `detail: false` = sparkline sin ejes; `detail: true` = chart con ejes y grid hairline.
 */
export function buildLineOptions(params: {
  detail: boolean;
  unidad: TrendMetric["unidad"];
  theme: ChartTheme;
  fechas: string[];
}): ChartOptions<"line"> {
  const { detail, unidad, theme, fechas } = params;

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      // Serie única por defecto: el título de la card la nombra (sin leyenda).
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.surface,
        titleColor: theme.ink,
        bodyColor: theme.inkSoft,
        borderColor: theme.stroke,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        titleFont: { family: "var(--font-montserrat)", weight: 600 },
        callbacks: {
          title: (items) => {
            const fecha = fechas[items[0]?.dataIndex ?? 0];
            return fecha ? formatFechaLarga(fecha) : "";
          },
          label: (item) => formatValor(item.parsed.y ?? 0, unidad),
        },
      },
    },
    scales: {
      x: {
        display: detail,
        grid: { display: false },
        border: { color: theme.grid },
        ticks: {
          color: theme.axis,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 11 },
        },
      },
      y: {
        display: detail,
        beginAtZero: true,
        grid: { color: theme.grid, lineWidth: 1, drawTicks: false },
        border: { display: false },
        ticks: {
          color: theme.axis,
          padding: 8,
          maxTicksLimit: 5,
          font: { size: 11 },
        },
      },
    },
  };
}
