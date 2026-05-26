import type { Metadata } from "next";
import PremiumCursoDetalheNext from "@/components/pages/premium/PremiumCursoDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Curso Premium | PqEstudar",
    description: "Detalhes do curso selecionado pela curadoria premium.",
    alternates: { canonical: `/premium/cursos/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function PremiumCursoDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/cursos/${slug}`);
  return <PremiumCursoDetalheNext />;
}
