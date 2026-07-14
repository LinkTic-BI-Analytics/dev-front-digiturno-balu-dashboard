import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (await verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value)) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
