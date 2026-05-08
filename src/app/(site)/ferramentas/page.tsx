import { dehydrate } from "@tanstack/react-query";
import FerramentasNext from "@/components/pages/FerramentasNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getPublicTools } from "@/lib/data/tools";

export default async function FerramentasPage() {
  const queryClient = createQueryClient();

  const [toolsPage, pageSettings] = await Promise.all([
    getPublicTools(1, 12, []),
    getPageSettings("/ferramentas"),
  ]);

  queryClient.setQueryData(["tools_public", 1, 12, ""], toolsPage);
  queryClient.setQueryData(["page_settings", "/ferramentas"], pageSettings ?? null);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <FerramentasNext />
    </QueryHydration>
  );
}
