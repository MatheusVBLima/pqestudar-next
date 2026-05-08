import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MapaDosBeneficios from "@/legacy-pages/MapaDosBeneficios";
import { getAffiliateBySlug } from "@/lib/data/affiliates";

interface AfiliadoPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AfiliadoPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Oferta Especial: O Mapa dos Benefícios Ocultos | PqEstudar",
    description:
      "Descubra mais de 50 benefícios, auxílios e direitos que você pode ter acesso agora. Guia completo com passo a passo para cada programa do governo.",
    robots: { index: false, follow: true },
    alternates: { canonical: `/mapa-dos-beneficios/${slug}` },
  };
}

export default async function MapaDosBeneficiosAfiliadoPage({ params }: AfiliadoPageProps) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);

  if (!affiliate) {
    redirect("/mapa-dos-beneficios");
  }

  return (
    <MapaDosBeneficios
      checkoutBasico={affiliate.basic_url}
      checkoutPremium={affiliate.premium_url}
      affiliateSlug={affiliate.slug}
    />
  );
}
