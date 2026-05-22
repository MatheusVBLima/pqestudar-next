import PremiumBeneficioDetalheNext from "@/components/pages/premium/PremiumBeneficioDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: "Benefício Premium | PqEstudar",
    description: "Detalhes do benefício selecionado pela curadoria premium.",
    alternates: { canonical: `/premium/beneficios/${slug}` },
  };
}

export default async function PremiumBeneficioDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/beneficios/${slug}`);
  return <PremiumBeneficioDetalheNext />;
}
