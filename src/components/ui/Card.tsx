import type { HTMLAttributes } from "react";

/** Superficie base del dashboard: borde hairline, radio de card y sombra suave. */
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-stroke bg-surface shadow-card ${className}`}
      {...props}
    />
  );
}
