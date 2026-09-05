import PremiumBeneficioDetalheNext from "@/components/pages/premium/PremiumBeneficioDetalheNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";
import { resolvePremiumItemSlug } from "@/lib/premium-item-slug";
import { permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const resolution = await resolvePremiumItemSlug(slug);
  if (resolution.kind === "alias") permanentRedirect(`/premium/beneficios/${resolution.canonicalSlug}`);
  const canonicalSlug = resolution.kind === "not_found" ? slug : resolution.canonicalSlug;
  return {
    title: "Benefício Premium | PqEstudar",
    description: "Detalhes do benefício selecionado pela curadoria premium.",
    alternates: { canonical: `/premium/beneficios/${canonicalSlug}` },
  };
}

export default async function PremiumBeneficioDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/beneficios/${slug}`);
  const resolution = await resolvePremiumItemSlug(slug);
  if (resolution.kind === "alias") permanentRedirect(`/premium/beneficios/${resolution.canonicalSlug}`);
  return <PremiumBeneficioDetalheNext />;
}
