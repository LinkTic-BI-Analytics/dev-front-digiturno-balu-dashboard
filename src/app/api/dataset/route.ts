import { gzipSync } from "node:zlib";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";
import { packDataset } from "@/lib/data/dataset-codec";
import { generateDemoRows } from "@/lib/data/demo-data";
import { fetchDataset } from "@/lib/data/fetch-dataset";
import { isDatabaseConfigured, isDemoMode } from "@/lib/env";
import type { AtencionRow } from "@/types/atenciones";
import type { DatasetApiResponse } from "@/types/dataset";
import type { DataSource } from "@/types/metrics";

/**
 * GET /api/dataset — dataset COMPLETO deduplicado en formato columnar.
 * El cliente lo cachea (memoria + IndexedDB) y filtra localmente.
 * Prioridad de fuente: base de datos > modo demo > vacío.
 * Se comprime con gzip manualmente: `next start` no comprime route handlers.
 */
export async function GET(request: NextRequest) {
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionValue(sessionValue))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let source: DataSource = "sin-configurar";
  let rows: AtencionRow[] = [];

  try {
    if (isDatabaseConfigured()) {
      source = "postgres";
      rows = await fetchDataset();
    } else if (isDemoMode()) {
      source = "demo";
      rows = generateDemoRows();
    }
  } catch (error) {
    console.error("[api/dataset]", error);
    return NextResponse.json(
      { error: "No fue posible consultar la fuente de datos." },
      { status: 502 },
    );
  }

  const body: DatasetApiResponse = {
    source,
    generatedAt: new Date().toISOString(),
    payload: packDataset(rows),
  };

  const json = JSON.stringify(body);
  const acceptsGzip = (request.headers.get("accept-encoding") ?? "").includes("gzip");

  if (!acceptsGzip) {
    return new NextResponse(json, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const compressed = gzipSync(Buffer.from(json));
  return new NextResponse(new Uint8Array(compressed), {
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Cache-Control": "no-store",
      Vary: "Accept-Encoding",
    },
  });
}
