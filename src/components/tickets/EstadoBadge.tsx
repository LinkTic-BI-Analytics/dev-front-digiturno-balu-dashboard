import { RULES } from "@/lib/config/business-rules";

const LABELS: Record<string, string> = {
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  no_asistio: "No asistió",
  pendiente: "Pendiente",
  llamando: "Llamando",
  atendiendo: "En atención",
};

const TONE_CLASSES = {
  success: "bg-success-soft text-success-strong",
  danger: "bg-danger-soft text-danger-strong",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutro: "bg-surface-2 text-ink-soft",
} as const;

function toneDe(estado: string | null): keyof typeof TONE_CLASSES {
  if (estado === null) return "neutro";
  const { cerrados, desistidos, noAsistidos, abiertos } = RULES.estadosTicket;
  if (cerrados.includes(estado)) return "success";
  if (desistidos.includes(estado)) return "danger";
  if (noAsistidos.includes(estado)) return "warning";
  if (abiertos.includes(estado)) return "info";
  return "neutro";
}

/** Badge del estado del ticket, tonificado según los buckets de negocio. */
export function EstadoBadge({ estado }: { estado: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
        TONE_CLASSES[toneDe(estado)]
      }`}
    >
      {estado === null ? "Sin estado" : (LABELS[estado] ?? estado)}
    </span>
  );
}
