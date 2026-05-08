import type { Metadata } from "next";
import PremiumHomeClient from "@/components/pages/premium/PremiumHomeClient";

export const metadata: Metadata = {
  title: "Premium | PqEstudar",
  description: "Recursos selecionados, vagas exclusivas e atualizações para assinantes Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium" },
};

export default function PremiumPage() {
  return <PremiumHomeClient />;
}
