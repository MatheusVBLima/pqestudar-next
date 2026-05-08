import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ConcursosNext from "@/components/pages/ConcursosNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublishedOportunidades } from "@/lib/data/oportunidades";
import { JsonLd, absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/concursos");

  return {
    title: data?.title_tag ?? "Concursos Publicos Abertos e Previstos | PqEstudar",
    description:
      data?.meta_description ??
      "Concursos publicos abertos e previstos organizados por status. Acompanhe editais publicados, prazos e atualizacoes.",
    alternates: { canonical: "/concursos" },
  };
}

export default async function ConcursosPage() {
  const queryClient = createQueryClient();

  const [pageSettings, oportunidades] = await Promise.all([
    getPageSettings("/concursos"),
    getPublishedOportunidades(),
  ]);

  queryClient.setQueryData(["page_settings", "/concursos"], pageSettings ?? null);
  queryClient.setQueryData(["oportunidades-public", {}], oportunidades ?? []);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Concursos Publicos Abertos e Previstos",
    url: absoluteUrl("/concursos"),
    description:
      "Concursos publicos abertos e previstos organizados por status. Acompanhe editais publicados, prazos e atualizacoes.",
    isPartOf: { "@type": "WebSite", name: "PqEstudar", url: absoluteUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: oportunidades.length,
      itemListElement: oportunidades.slice(0, 50).map((op, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/concursos/${op.slug}`),
        name: op.titulo,
      })),
    },
  };

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <JsonLd data={collectionLd} />
      <ConcursosNext />
    </QueryHydration>
  );
}
