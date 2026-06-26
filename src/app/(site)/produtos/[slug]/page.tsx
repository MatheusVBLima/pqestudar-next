import { permanentRedirect } from "next/navigation";

interface ProdutosSlugRedirectPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProdutosSlugRedirectPage({ params }: ProdutosSlugRedirectPageProps) {
  const { slug } = await params;
  permanentRedirect(`/exclusivos/${slug}`);
}
