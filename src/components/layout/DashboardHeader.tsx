"use client";

import Image from "next/image";
import { FullscreenToggle } from "./FullscreenToggle";
import { LiveIndicator } from "./LiveIndicator";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1800px] items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <Image
            src="/graphic_identity/positiva_logo.svg"
            alt="Positiva"
            width={132}
            height={32}
            priority
            className="h-6 w-auto shrink-0 sm:h-8 dark:brightness-0 dark:invert"
          />
          <span
            className="hidden h-7 w-px shrink-0 bg-stroke sm:block"
            aria-hidden="true"
          />
          <h1 className="truncate text-sm font-bold tracking-tight text-ink sm:text-base">
            Digiturno Balú
            <span className="hidden font-medium text-ink-soft lg:inline">
              {" "}
              - Tablero de Operación
            </span>
          </h1>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <LiveIndicator />
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
          {/* En móvil el indicador se compacta a solo el punto de estado */}
          <span className="md:hidden">
            <LiveIndicator compact />
          </span>
          <ThemeToggle />
          <FullscreenToggle />
          <LogoutButton />
        </div>
      </div>

      {/* Hairline con tinte de marca sobre el borde inferior */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-brand/35 to-transparent"
      />
    </header>
  );
}
