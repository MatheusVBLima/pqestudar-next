import type { Metadata } from "next";
import LoginClient from "@/components/pages/LoginClient";

export const metadata: Metadata = {
  title: "Entrar | PqEstudar",
  description: "Acesse sua conta no PqEstudar.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginClient />;
}
