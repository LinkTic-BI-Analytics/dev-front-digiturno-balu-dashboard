import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/Card";

export type MetricTone = "brand" | "success" | "danger" | "warning" | "info";

const TONE_CLASSES: Record<MetricTone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success-strong",
  danger: "bg-danger-soft text-danger-strong",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

interface MetricCardProps {
  titulo: string;
  valor: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: MetricTone;
  detalle?: string;
}

export function MetricCard({ titulo, valor, Icon, tone, detalle }: MetricCardProps) {
  return (
    <Card className="flex h-full items-center gap-4 p-5 transition-shadow duration-200 hover:shadow-card-hover">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-soft">{titulo}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{valor}</p>
        {detalle && <p className="mt-0.5 text-[11px] text-ink-mute">{detalle}</p>}
      </div>
    </Card>
  );
}
