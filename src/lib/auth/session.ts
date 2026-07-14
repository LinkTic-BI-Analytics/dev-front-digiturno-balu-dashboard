/**
 * Sesión stateless firmada con HMAC-SHA256 (Web Crypto: compatible Node y Edge).
 * Valor de cookie: "<expEpochSeconds>.<firma>" — nada del token maestro viaja al cliente.
 */

export const SESSION_COOKIE = "balu_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

const SIGNATURE_CONTEXT = "balu:v1:";

const encoder = new TextEncoder();

function getSecret(): string {
  return process.env.TOKEN_DIGITURNO_BALU ?? "";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Compara el token ingresado contra el maestro en tiempo constante (vía digests de igual longitud). */
export async function verifyAccessToken(candidate: string): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !candidate) return false;
  const [candidateDigest, secretDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
  ]);
  return timingSafeEquals(
    toBase64Url(new Uint8Array(candidateDigest)),
    toBase64Url(new Uint8Array(secretDigest)),
  );
}

export async function createSessionValue(now: number = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const signature = await signPayload(SIGNATURE_CONTEXT + exp, getSecret());
  return `${exp}.${signature}`;
}

export async function verifySessionValue(
  value: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;

  const [expRaw, signature] = value.split(".");
  if (!expRaw || !signature) return false;

  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp * 1000 < now) return false;

  const expected = await signPayload(SIGNATURE_CONTEXT + exp, secret);
  return timingSafeEquals(signature, expected);
}
