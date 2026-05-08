import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ConcursosNext from "@/components/pages/ConcursosNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublishedOportunidades } from "@/lib/data/oportunidades";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/concursos");

  return {
    title: data?.title_tag ?? "Concursos Publicos Abertos e Previstos | PqEstudar",
    description:
      data?.meta_description ??
      "Concursos publicos abertos e previstos organizados por status. Acompanhe editais publicados, prazos e atualizacoes.",
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

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <ConcursosNext />
    </QueryHydration>
  );
}
