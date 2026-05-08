import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ProdutosNext from "@/components/pages/ProdutosNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getActiveProducts } from "@/lib/data/products";
import { getPageSettings } from "@/lib/data/page-settings";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/produtos");

  return {
    title: data?.title_tag ?? "Produtos PqEstudar | Recomendações para Estudantes e Concurseiros",
    description:
      data?.meta_description ??
      "Conheça os produtos selecionados pela PqEstudar para ajudar você a estudar de forma mais eficiente e estratégica.",
  };
}

export default async function ProdutosPage() {
  const queryClient = createQueryClient();

  const [pageSettings, products] = await Promise.all([
    getPageSettings("/produtos"),
    getActiveProducts(),
  ]);

  queryClient.setQueryData(["page_settings", "/produtos"], pageSettings ?? null);
  queryClient.setQueryData(["products-public"], products ?? []);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <ProdutosNext />
    </QueryHydration>
  );
}
