"use client";

import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Etiqueta accesible (aria-label y tooltip nativo). */
  label: string;
}

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stroke bg-surface text-ink-soft transition-all duration-200 hover:border-stroke-strong hover:bg-surface-2 hover:text-ink active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
