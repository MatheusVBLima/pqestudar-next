import type { Metadata } from "next";
import PremiumVagaDetalheNext from "@/components/pages/premium/PremiumVagaDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Vaga Premium | PqEstudar",
    description: "Detalhes da vaga selecionada pela curadoria premium.",
    alternates: { canonical: `/premium/vagas/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function PremiumVagaDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/vagas/${slug}`);
  return <PremiumVagaDetalheNext />;
}
