import type { Metadata } from "next";
import PremiumAtualizacaoDetalheNext from "@/components/pages/premium/PremiumAtualizacaoDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Atualização Premium | PqEstudar",
    robots: { index: false, follow: false },
    alternates: { canonical: `/premium/atualizacoes/${slug}` },
  };
}

export default async function PremiumAtualizacaoDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/atualizacoes/${slug}`);
  return <PremiumAtualizacaoDetalheNext />;
}
