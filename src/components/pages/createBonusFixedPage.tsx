import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BonusPageContent } from "@/components/pages/BonusPageContent";
import { getBonusBySlug } from "@/lib/data/bonus";

export function createBonusFixedPage(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    const page = await getBonusBySlug(slug);
    if (!page) return { title: "Página não encontrada | PqEstudar" };
    return {
      title: `${page.title} – PqEstudar`,
      description: page.intro,
      alternates: { canonical: slug },
      robots: { index: false, follow: false },
    };
  }

  async function Page() {
    const page = await getBonusBySlug(slug);
    if (!page) notFound();
    return <BonusPageContent page={page} />;
  }

  return { generateMetadata, Page };
}
