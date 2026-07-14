import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

export default async function DashboardPage() {
  // Doble verificación además del proxy: defensa en profundidad.
  const cookieStore = await cookies();
  if (!(await verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value))) {
    redirect("/");
  }

  return <DashboardShell />;
}
