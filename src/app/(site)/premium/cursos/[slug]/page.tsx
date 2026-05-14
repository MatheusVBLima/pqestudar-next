import type { Metadata } from "next";
import PremiumCursoDetalheNext from "@/components/pages/premium/PremiumCursoDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Curso Premium | PqEstudar",
  description: "Detalhes do curso selecionado pela curadoria premium.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PremiumCursoDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/cursos/${slug}`);
  return <PremiumCursoDetalheNext />;
}
