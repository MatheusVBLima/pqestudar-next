import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import ConcursoDetalheNext from "@/components/pages/ConcursoDetalheNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import {
  getOportunidadeBySlug,
  getOportunidadeMetadata,
  getOportunidadeRedirectSlug,
} from "@/lib/data/oportunidades";

interface ConcursoDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ConcursoDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getOportunidadeMetadata(slug);

  const title = data?.meta_title || data?.titulo || "Concurso | PqEstudar";
  const description = data?.meta_description || data?.resumo_editorial || "Detalhes do concurso no PqEstudar.";

  return {
    title: `${title} | PqEstudar`,
    description,
  };
}

export default async function ConcursoDetalhePage({ params }: ConcursoDetailPageProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  const detail = await getOportunidadeBySlug(slug);

  if (!detail) {
    const redirectSlug = await getOportunidadeRedirectSlug(slug);
    if (redirectSlug) {
      redirect(`/concursos/${redirectSlug}`);
    }

    queryClient.setQueryData(["concurso_detail", slug], {
      oportunidade: null,
      atualizacoes: [],
      redirectSlug: null,
      notFound: true,
    });
  } else {
    queryClient.setQueryData(["concurso_detail", slug], {
      oportunidade: detail.oportunidade,
      atualizacoes: detail.atualizacoes,
      redirectSlug: null,
      notFound: false,
    });
  }

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <ConcursoDetalheNext />
    </QueryHydration>
  );
}
