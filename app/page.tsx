import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const decoded = await verifyAccessToken(token);
      if (decoded.role === "ADMIN") {
        redirect("/dashboard");
      }
    } catch {
      // Invalid token, continue to login
    }
  }

  return <LoginForm />;
}
