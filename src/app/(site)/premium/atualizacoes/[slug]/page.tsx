import type { Metadata } from "next";
import PremiumUpdateDetailClient from "@/components/pages/premium/PremiumUpdateDetailClient";

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

export default function PremiumUpdateDetailPage() {
  return <PremiumUpdateDetailClient />;
}
