"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { LoginState } from "./login-state";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionValue,
  verifyAccessToken,
} from "./session";

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const attempt = prevState.attempt + 1;

  if (!process.env.TOKEN_DIGITURNO_BALU) {
    return { status: "unconfigured", attempt };
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!(await verifyAccessToken(token))) {
    return { status: "denied", attempt };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return { status: "success", attempt };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
