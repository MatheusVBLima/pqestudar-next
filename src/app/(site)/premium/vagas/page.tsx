import type { Metadata } from "next";
import PremiumJobsClient from "@/components/pages/premium/PremiumJobsClient";

export const metadata: Metadata = {
  title: "Vagas Premium | PqEstudar",
  description: "Vagas exclusivas para assinantes Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/vagas" },
};

export default function PremiumVagasPage() {
  return <PremiumJobsClient />;
}
