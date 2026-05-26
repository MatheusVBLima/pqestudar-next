import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BonusPageContent } from "@/components/pages/BonusPageContent";
import { getBonusBySlug } from "@/lib/data/bonus";

interface BonusPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BonusPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getBonusBySlug(`/${slug}`);

  if (!page) {
    return { title: "Página não encontrada | PqEstudar" };
  }

  return {
    title: `${page.title} – PqEstudar`,
    description: page.intro,
    alternates: { canonical: `/bonus/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function BonusBySlugPage({ params }: BonusPageProps) {
  const { slug } = await params;
  const page = await getBonusBySlug(`/${slug}`);

  if (!page) {
    notFound();
  }

  return <BonusPageContent page={page} />;
}
