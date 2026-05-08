import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import VotacoesNext from "@/components/pages/VotacoesNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/votacoes");

  return {
    title: data?.title_tag ?? "Votação de Novas Funcionalidades | PqEstudar",
    description:
      data?.meta_description ??
      "Vote nas próximas funcionalidades do PqEstudar. Sugira melhorias, acompanhe o roadmap e participe das decisões da plataforma.",
    alternates: { canonical: "/votacoes" },
  };
}

export default async function VotacoesPage() {
  const queryClient = createQueryClient();
  const pageSettings = await getPageSettings("/votacoes");
  queryClient.setQueryData(["page_settings", "/votacoes"], pageSettings ?? null);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <VotacoesNext />
    </QueryHydration>
  );
}
