/**
 * Estado del formulario de login. Vive fuera de actions.ts porque un módulo
 * "use server" solo puede exportar funciones async.
 */
export interface LoginState {
  status: "idle" | "denied" | "unconfigured" | "success";
  /** Contador de intentos: permite re-disparar el modal en fallos consecutivos. */
  attempt: number;
}

export const initialLoginState: LoginState = { status: "idle", attempt: 0 };
