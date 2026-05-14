import type { Metadata } from "next";
import PremiumAtualizacoesNext from "@/components/pages/premium/PremiumAtualizacoesNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Atualizações Premium | PqEstudar",
  description: "Acompanhe o que entrou de novo na Área Premium toda semana.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/atualizacoes" },
};

export default async function PremiumAtualizacoesPage() {
  await requireActiveSubscription("/premium/atualizacoes");
  return <PremiumAtualizacoesNext />;
}
