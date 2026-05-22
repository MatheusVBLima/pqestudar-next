import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PremiumAtualizacaoDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/premium/beneficios/${slug}`);
}
