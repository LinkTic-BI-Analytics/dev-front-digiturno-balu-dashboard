"use client";

import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ShieldAlertIcon } from "@/components/ui/icons";

interface AccessDeniedModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccessDeniedModal({ open, onClose }: AccessDeniedModalProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="acceso-denegado-titulo">
      <Card className="w-[min(92vw,26rem)] p-8 text-center animate-shake">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
          <ShieldAlertIcon className="h-8 w-8 text-danger" />
        </div>
        <h2
          id="acceso-denegado-titulo"
          className="text-xl font-bold text-ink"
        >
          Acceso denegado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          El token ingresado no es válido. Verifica el token de acceso e
          inténtalo nuevamente.
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-danger px-8 font-button text-sm font-semibold text-white transition-transform duration-150 hover:opacity-90 active:scale-95 dark:text-canvas"
        >
          Reintentar
        </button>
      </Card>
    </Modal>
  );
}
