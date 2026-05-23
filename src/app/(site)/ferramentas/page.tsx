import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import FerramentasNext from "@/components/pages/FerramentasNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublicTools } from "@/lib/data/tools";
import { JsonLd, absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/ferramentas");

  return {
    title: data?.title_tag ?? "Ferramentas e Plataformas Educacionais",
    description:
      data?.meta_description ??
      "Plataformas e ferramentas educacionais selecionadas para acelerar seus estudos. Apps, sites e recursos gratuitos organizados por categoria.",
    alternates: { canonical: "/ferramentas" },
  };
}

export default async function FerramentasPage() {
  const queryClient = createQueryClient();

  const [toolsPage, pageSettings] = await Promise.all([
    getPublicTools(1, 12, []),
    getPageSettings("/ferramentas"),
  ]);

  queryClient.setQueryData(["tools_public_v2", 1, 12, ""], toolsPage);
  queryClient.setQueryData(["page_settings", "/ferramentas"], pageSettings ?? null);

  const tools = toolsPage.tools as Array<{ slug?: string; name?: string }>;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ferramentas e Plataformas Educacionais",
    url: absoluteUrl("/ferramentas"),
    description:
      "Plataformas e ferramentas educacionais selecionadas para acelerar seus estudos.",
    isPartOf: { "@type": "WebSite", name: "PqEstudar", url: absoluteUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: toolsPage.total,
      itemListElement: tools
        .filter((t) => t.slug)
        .map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/ferramentas/${tool.slug}`),
          name: tool.name,
        })),
    },
  };

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <JsonLd data={collectionLd} />
      <FerramentasNext />
    </QueryHydration>
  );
}
