import type { Metadata } from "next";
import { CookieSettings } from "@/components/ui/cookie-settings";

export const metadata: Metadata = {
  title: "Configurações de Cookies | PqEstudar",
  description:
    "Gerencie suas preferências de cookies e proteção de dados conforme a LGPD. Você decide o que permitir.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/configuracoes-cookies" },
};

export default function ConfiguracoesCookiesPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <CookieSettings />
    </main>
  );
}
