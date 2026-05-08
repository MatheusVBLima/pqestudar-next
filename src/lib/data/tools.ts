import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const TOOLS_TAG = "tools";

export function toolSlugTag(slug: string): string {
  return `tool:slug:${slug}`;
}

interface ToolsListPayload {
  tools: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchPublicTools(
  page: number,
  pageSize: number,
  tags: readonly string[],
): Promise<ToolsListPayload> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("tools_public").select("*", { count: "exact" });
  if (tags.length > 0) {
    query = query.overlaps("tags", tags as string[]);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await query
    .order("sort_order", { ascending: true })
    .range(from, to);

  return {
    tools: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export function getPublicTools(
  page: number,
  pageSize: number,
  tags: readonly string[] = [],
): Promise<ToolsListPayload> {
  const tagsKey = [...tags].sort().join(",");
  return unstable_cache(
    () => fetchPublicTools(page, pageSize, tags),
    ["tools-public", String(page), String(pageSize), tagsKey],
    { tags: [TOOLS_TAG], revalidate: 600 },
  )();
}

async function fetchToolBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("tools_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data ?? null;
}

export function getToolBySlug(slug: string) {
  return unstable_cache(
    () => fetchToolBySlug(slug),
    ["tool-by-slug", slug],
    { tags: [TOOLS_TAG, toolSlugTag(slug)], revalidate: 600 },
  )();
}

async function fetchRelatedTools(toolId: string, tagsKey: string, tags: readonly string[]) {
  if (tags.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("tools_public")
    .select("*")
    .neq("id", toolId)
    .overlaps("tags", tags as string[])
    .order("sort_order", { ascending: true })
    .limit(4);
  return data ?? [];
}

export function getRelatedTools(toolId: string, tags: readonly string[]) {
  const tagsKey = [...tags].sort().join(",");
  return unstable_cache(
    () => fetchRelatedTools(toolId, tagsKey, tags),
    ["tool-related", toolId, tagsKey],
    { tags: [TOOLS_TAG], revalidate: 600 },
  )();
}
