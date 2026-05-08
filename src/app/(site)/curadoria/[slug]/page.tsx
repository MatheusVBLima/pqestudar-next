import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import CuradoriaPublicNext from "@/components/pages/CuradoriaPublicNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getCurationBySlug } from "@/lib/data/curations";

interface CuradoriaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CuradoriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const curation = await getCurationBySlug(slug);

  if (!curation) {
    return { title: "Curadoria não encontrada | Pq Estudar" };
  }

  return {
    title: `${curation.title} | Pq Estudar`,
    description: curation.description || `Curadoria de ferramentas: ${curation.title}`,
    alternates: { canonical: `/curadoria/${slug}` },
  };
}

export default async function CuradoriaPage({ params }: CuradoriaPageProps) {
  const { slug } = await params;
  const curation = await getCurationBySlug(slug);

  if (!curation) {
    notFound();
  }

  const queryClient = createQueryClient();
  queryClient.setQueryData(["curations", "slug", slug], curation);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <CuradoriaPublicNext />
    </QueryHydration>
  );
}
