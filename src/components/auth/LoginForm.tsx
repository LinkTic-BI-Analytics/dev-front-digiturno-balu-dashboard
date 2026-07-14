"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { login } from "@/lib/auth/actions";
import { initialLoginState } from "@/lib/auth/login-state";
import { Card } from "@/components/ui/Card";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/ui/icons";
import { AccessDeniedModal } from "./AccessDeniedModal";

const ENTER_TRANSITION_MS = 850;

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(login, initialLoginState);
  const [showToken, setShowToken] = useState(false);
  const [dismissedAttempt, setDismissedAttempt] = useState(0);
  const [washOrigin, setWashOrigin] = useState({ x: "50%", y: "62%" });
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados derivados del resultado de la server action (sin copiarlos a estado local).
  const deniedOpen =
    state.status === "denied" && state.attempt > dismissedAttempt;
  const entering = state.status === "success";

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (state.status !== "success") return;
    const timer = setTimeout(
      () => router.push("/dashboard"),
      ENTER_TRANSITION_MS,
    );
    return () => clearTimeout(timer);
  }, [state.status, router]);

  const handleDeniedClose = () => {
    setDismissedAttempt(state.attempt);
    inputRef.current?.select();
    inputRef.current?.focus();
  };

  // La onda de transición nace exactamente donde el usuario hizo clic.
  const captureWashOrigin = (event: PointerEvent<HTMLButtonElement>) => {
    setWashOrigin({ x: `${event.clientX}px`, y: `${event.clientY}px` });
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      {/* Fondo ambiental */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-soft-2 opacity-70 blur-3xl dark:opacity-40" />
        <div className="absolute -right-40 -bottom-40 h-[30rem] w-[30rem] rounded-full bg-brand-soft opacity-80 blur-3xl dark:opacity-30" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <Card className="px-8 py-10 sm:px-10">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/graphic_identity/positiva_logo.svg"
              alt="Positiva"
              width={190}
              height={46}
              priority
              className="dark:brightness-0 dark:invert"
            />
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-ink">
              Digiturno Balú
            </h1>
            <p className="mt-1 text-sm font-medium text-ink-mute">
              Tablero de Operación
            </p>
          </div>

          <form action={formAction} className="mt-9 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                Token de acceso
              </span>
              <div className="group relative">
                <LockIcon className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-ink-mute transition-colors group-focus-within:text-brand" />
                <input
                  ref={inputRef}
                  name="token"
                  type={showToken ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Ingresa tu token"
                  className="h-12 w-full rounded-control border border-stroke bg-surface-2 pr-12 pl-11 text-sm text-ink transition-all duration-200 outline-none placeholder:text-ink-mute focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? "Ocultar token" : "Mostrar token"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-ink-mute transition-colors hover:text-ink"
                >
                  {showToken ? (
                    <EyeOffIcon className="h-4.5 w-4.5" />
                  ) : (
                    <EyeIcon className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </label>

            {state.status === "unconfigured" && (
              <p className="rounded-control border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
                El token de acceso no está configurado en el servidor. Define la
                variable de entorno <code>TOKEN_DIGITURNO_BALU</code>.
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || entering}
              onPointerDown={captureWashOrigin}
              className="inline-flex h-12 items-center justify-center rounded-full bg-brand font-button text-sm font-semibold text-brand-contrast shadow-card transition-all duration-200 hover:bg-brand-strong hover:shadow-card-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
            >
              {isPending || entering ? (
                <span className="flex items-center gap-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Verificando…
                </span>
              ) : (
                "Ingresar al tablero"
              )}
            </button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-mute">
          Desarrollado por el equipo de BI Analytics de LinkTic
        </p>
      </div>

      <AccessDeniedModal open={deniedOpen} onClose={handleDeniedClose} />

      {/* Transición de éxito: onda de marca que cubre el viewport */}
      {entering && (
        <div
          className="animate-brand-wash fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-brand to-brand-strong"
          style={
            {
              "--wash-x": washOrigin.x,
              "--wash-y": washOrigin.y,
            } as CSSProperties
          }
        >
          <div className="flex animate-fade-up flex-col items-center gap-5 [animation-delay:250ms]">
            <Image
              src="/graphic_identity/positiva_logo.svg"
              alt=""
              width={220}
              height={53}
              className="brightness-0 invert"
            />
            <p className="text-sm font-medium tracking-wide text-white/85">
              Cargando tablero de operación…
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
