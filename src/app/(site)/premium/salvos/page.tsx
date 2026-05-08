import type { Metadata } from "next";
import PremiumSavedClient from "@/components/pages/premium/PremiumSavedClient";

export const metadata: Metadata = {
  title: "Salvos Premium | PqEstudar",
  description: "Itens salvos da sua área Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/salvos" },
};

export default function PremiumSavedPage() {
  return <PremiumSavedClient />;
}
