import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import GuiasNext from "@/components/pages/GuiasNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublishedGuides } from "@/lib/data/guides";
import { JsonLd, absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/guias");

  return {
    title: data?.title_tag ?? "Guias Práticos e Tutoriais para Estudar | PqEstudar",
    description:
      data?.meta_description ??
      "Explore guias práticos e tutoriais evergreen para estudar melhor, usar ferramentas, aproveitar oportunidades e resolver dúvidas passo a passo.",
    alternates: { canonical: "/guias" },
  };
}

export default async function GuiasPage() {
  const queryClient = createQueryClient();

  const [pageSettings, guides] = await Promise.all([
    getPageSettings("/guias"),
    getPublishedGuides(),
  ]);

  queryClient.setQueryData(["page_settings", "/guias"], pageSettings ?? null);
  queryClient.setQueryData(["guides", "published"], guides ?? []);

  const guideList = (guides ?? []) as Array<{ slug: string; title: string }>;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guias Praticos e Tutoriais para Estudar",
    url: absoluteUrl("/guias"),
    description:
      "Guias praticos e tutoriais evergreen para estudar melhor, usar ferramentas e aproveitar oportunidades.",
    isPartOf: { "@type": "WebSite", name: "PqEstudar", url: absoluteUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: guideList.length,
      itemListElement: guideList.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/guias/${guide.slug}`),
        name: guide.title,
      })),
    },
  };

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <JsonLd data={collectionLd} />
      <GuiasNext />
    </QueryHydration>
  );
}
