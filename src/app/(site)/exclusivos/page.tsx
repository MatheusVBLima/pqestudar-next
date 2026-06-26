import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ProdutosNext from "@/components/pages/ProdutosNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getActiveProducts } from "@/lib/data/products";
import { getPageSettings } from "@/lib/data/page-settings";
import { slugifyProductTitle } from "@/lib/product-slug";
import { JsonLd, absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/exclusivos");

  return {
    title: data?.title_tag ?? "Exclusivos PqEstudar | Recomendações para Estudantes e Concurseiros",
    description:
      data?.meta_description ??
      "Conheça os materiais exclusivos selecionados pela PqEstudar para ajudar você a estudar de forma mais eficiente e estratégica.",
    alternates: { canonical: "/exclusivos" },
  };
}

export default async function ExclusivosPage() {
  const queryClient = createQueryClient();

  const [pageSettings, products] = await Promise.all([
    getPageSettings("/exclusivos"),
    getActiveProducts(),
  ]);

  queryClient.setQueryData(["page_settings", "/exclusivos"], pageSettings ?? null);
  queryClient.setQueryData(["products-public"], products ?? []);

  const productList = (products ?? []) as Array<{ title: string }>;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Exclusivos PqEstudar",
    url: absoluteUrl("/exclusivos"),
    description:
      "Materiais exclusivos selecionados pela PqEstudar para ajudar voce a estudar de forma mais eficiente.",
    isPartOf: { "@type": "WebSite", name: "PqEstudar", url: absoluteUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: productList.length,
      itemListElement: productList.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/exclusivos/${slugifyProductTitle(product.title)}`),
        name: product.title,
      })),
    },
  };

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <JsonLd data={collectionLd} />
      <ProdutosNext />
    </QueryHydration>
  );
}
