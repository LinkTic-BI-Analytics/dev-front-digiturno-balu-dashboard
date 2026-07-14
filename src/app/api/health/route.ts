import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";
import { pingDatabase } from "@/lib/data/fetch-dataset";
import { isDatabaseConfigured, isDemoMode } from "@/lib/env";

/**
 * GET /api/health — ping barato previo al refresco del dataset: evita
 * descargar ~1 MB cuando la base de datos está caída (502 intermitentes).
 */
export async function GET(request: NextRequest) {
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionValue(sessionValue))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (isDatabaseConfigured()) {
    try {
      await pingDatabase();
      return NextResponse.json({ ok: true, source: "postgres" });
    } catch (error) {
      console.error("[api/health]", error);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  }

  if (isDemoMode()) {
    return NextResponse.json({ ok: true, source: "demo" });
  }

  return NextResponse.json({ ok: true, source: "sin-configurar" });
}
