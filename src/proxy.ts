import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

/** Protege el dashboard: sin sesión válida se redirige al login y se limpia la cookie. */
export async function proxy(request: NextRequest) {
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!(await verifySessionValue(sessionValue))) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
