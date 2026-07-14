"use client";

import { LazyMotion, domAnimation } from "motion/react";
import { FiltersBar } from "@/components/filters/FiltersBar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MapSection } from "@/components/map/MapSection";
import { MetricasPanel } from "@/components/metricas/MetricasPanel";
import { ProyeccionesSection } from "@/components/proyecciones/ProyeccionesSection";
import { TendenciasSection } from "@/components/tendencias/TendenciasSection";
import {
  DashboardDataProvider,
  useDashboard,
} from "@/providers/DashboardDataProvider";
import { LoadingGate } from "./LoadingGate";

/** Entrada escalonada de las secciones del dashboard. */
function Section({
  children,
  delayMs,
  className = "",
}: {
  children: React.ReactNode;
  delayMs: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-fade-up ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

function ShellContent() {
  const { dataset } = useDashboard();

  // Gate de carga: solo en el primer acceso (sin caché en IndexedDB).
  if (!dataset.hydrated) {
    return <LoadingGate degraded={dataset.degraded} />;
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <DashboardHeader />

      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-12 sm:px-6 lg:px-8">
        <Section delayMs={80} className="mt-6">
          <FiltersBar />
        </Section>

        <Section delayMs={160} className="mt-8">
          <TendenciasSection />
        </Section>

        <Section delayMs={240} className="mt-8">
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[7fr_3fr]">
            <MapSection />
            <MetricasPanel />
          </div>
        </Section>

        <Section delayMs={320} className="mt-8">
          <ProyeccionesSection />
        </Section>
      </main>
    </div>
  );
}

export function DashboardShell() {
  return (
    <DashboardDataProvider>
      <LazyMotion features={domAnimation} strict>
        <ShellContent />
      </LazyMotion>
    </DashboardDataProvider>
  );
}
