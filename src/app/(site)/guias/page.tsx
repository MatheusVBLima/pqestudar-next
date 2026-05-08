import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import GuiasNext from "@/components/pages/GuiasNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublishedGuides } from "@/lib/data/guides";

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

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <GuiasNext />
    </QueryHydration>
  );
}
