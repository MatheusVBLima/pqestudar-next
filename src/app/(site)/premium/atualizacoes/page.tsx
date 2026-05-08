import type { Metadata } from "next";
import PremiumUpdatesClient from "@/components/pages/premium/PremiumUpdatesClient";

export const metadata: Metadata = {
  title: "Atualizações Premium | PqEstudar",
  description: "Conteúdo atualizado semanalmente para assinantes Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/atualizacoes" },
};

export default function PremiumAtualizacoesPage() {
  return <PremiumUpdatesClient />;
}
