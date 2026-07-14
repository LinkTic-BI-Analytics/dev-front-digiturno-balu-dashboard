"use client";

import Image from "next/image";
import { FullscreenToggle } from "./FullscreenToggle";
import { LiveIndicator } from "./LiveIndicator";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Image
            src="/graphic_identity/positiva_logo.svg"
            alt="Positiva"
            width={132}
            height={32}
            priority
            className="h-7 w-auto shrink-0 sm:h-8 dark:brightness-0 dark:invert"
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

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <FullscreenToggle />
          <LogoutButton />
        </div>
      </div>

      {/* En móvil el indicador baja a su propia fila */}
      <div className="flex justify-center pb-2.5 md:hidden">
        <LiveIndicator />
      </div>
    </header>
  );
}
