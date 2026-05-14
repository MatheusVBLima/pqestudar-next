import type { Metadata } from "next";
import PremiumVagaDetalheNext from "@/components/pages/premium/PremiumVagaDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Vaga Premium | PqEstudar",
  description: "Detalhes da vaga selecionada pela curadoria premium.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PremiumVagaDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/vagas/${slug}`);
  return <PremiumVagaDetalheNext />;
}
