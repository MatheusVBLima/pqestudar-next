import type { Metadata } from "next";
import PremiumHomeNext from "@/components/pages/premium/PremiumHomeNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Premium | PqEstudar",
  description: "Recursos selecionados, vagas exclusivas e atualizações para assinantes Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium" },
};

export default async function PremiumPage() {
  await requireActiveSubscription("/premium");
  return <PremiumHomeNext />;
}
