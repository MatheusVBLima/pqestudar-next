import type { Metadata } from "next";
import LoginClient from "@/components/pages/LoginClient";

export const metadata: Metadata = {
  title: "Entrar | PqEstudar",
  description: "Acesse sua conta no PqEstudar.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginClient />;
}
