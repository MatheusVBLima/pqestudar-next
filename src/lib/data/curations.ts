import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const CURATIONS_TAG = "curations";

export function curationSlugTag(slug: string): string {
  return `curation:${slug}`;
}

async function fetchCurationBySlug(slug: string) {
  const supabase = createServerSupabaseClient();

  const { data: page } = await supabase
    .from("curation_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!page) return null;

  const { data: items } = await supabase
    .from("curation_page_items")
    .select("*")
    .eq("page_id", page.id)
    .order("order", { ascending: true });

  const toolIds = (items ?? []).map((item: { tool_id: string }) => item.tool_id);

  if (toolIds.length === 0) {
    return { ...page, items: [] };
  }

  const { data: tools } = await supabase
    .from("tools_public")
    .select("*")
    .in("id", toolIds);

  const toolsMap = new Map((tools ?? []).map((t: { id: string }) => [t.id, t]));

  const itemsWithTools = (items ?? [])
    .map((item: { tool_id: string }) => ({
      ...item,
      tool: toolsMap.get(item.tool_id),
    }))
    .filter((item: { tool: unknown }) => item.tool);

  return { ...page, items: itemsWithTools };
}

export function getCurationBySlug(slug: string) {
  return unstable_cache(
    () => fetchCurationBySlug(slug),
    ["curation-by-slug", slug],
    { tags: [CURATIONS_TAG, curationSlugTag(slug)], revalidate: 1800 },
  )();
}
