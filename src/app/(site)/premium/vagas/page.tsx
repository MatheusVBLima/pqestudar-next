import type { Metadata } from "next";
import PremiumVagasNext from "@/components/pages/premium/PremiumVagasNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Vagas Premium | PqEstudar",
  description: "Curadoria exclusiva de vagas de emprego e estágio selecionadas para assinantes premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/vagas" },
};

export default async function PremiumVagasPage() {
  await requireActiveSubscription("/premium/vagas");
  return <PremiumVagasNext />;
}
