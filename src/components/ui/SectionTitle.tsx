import type { ReactNode } from "react";

interface SectionTitleProps {
  id: string;
  titulo: string;
  subtitulo?: ReactNode;
}

/** Encabezado de sección con el acento de marca (barra vertical degradada). */
export function SectionTitle({ id, titulo, subtitulo }: SectionTitleProps) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-4.5 w-1 shrink-0 rounded-full bg-linear-to-b from-brand to-brand-strong"
        />
        <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
          {titulo}
        </h2>
      </div>
      {subtitulo && (
        <p className="mt-0.5 pl-3.5 text-sm text-ink-mute">{subtitulo}</p>
      )}
    </div>
  );
}
