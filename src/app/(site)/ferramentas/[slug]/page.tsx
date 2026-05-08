import { dehydrate } from "@tanstack/react-query";
import ToolDetalheNext from "@/components/pages/ToolDetalheNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getRelatedTools, getToolBySlug } from "@/lib/data/tools";

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FerramentaDetalhePage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  const tool = await getToolBySlug(slug);

  queryClient.setQueryData(["tool_detail", slug], tool ?? null);

  if (tool?.id && Array.isArray(tool.tags) && tool.tags.length > 0) {
    const related = await getRelatedTools(tool.id as string, tool.tags as string[]);
    queryClient.setQueryData(
      ["tool_related", tool.id, [...tool.tags].sort().join(",")],
      related,
    );
  }

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <ToolDetalheNext />
    </QueryHydration>
  );
}
