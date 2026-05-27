import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const GUIDES_TAG = "guides";
const GUIDE_LIST_SELECT =
  "id,internal_code,title,slug,category,public_category,short_description,is_published,is_featured,sort_order,author_name,cover_image_url,created_at,updated_at";

export function guideSlugTag(slug: string): string {
  return `guide:${slug}`;
}

async function fetchPublishedGuides() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("guides")
    .select(GUIDE_LIST_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export function getPublishedGuides() {
  return unstable_cache(
    () => fetchPublishedGuides(),
    ["guides-published"],
    { tags: [GUIDES_TAG], revalidate: 1800 },
  )();
}

async function fetchGuideBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ?? null;
}

export function getGuideBySlug(slug: string) {
  return unstable_cache(
    () => fetchGuideBySlug(slug),
    ["guide-by-slug", slug],
    { tags: [GUIDES_TAG, guideSlugTag(slug)], revalidate: 1800 },
  )();
}

async function fetchGuideRelatedTools(guideId: string) {
  const supabase = createServerSupabaseClient();
  const { data: relations } = await supabase
    .from("guide_related_tools")
    .select("tool_id")
    .eq("guide_id", guideId);
  if (!relations || relations.length === 0) return [];

  const toolIds = relations.map((r: { tool_id: string }) => r.tool_id);
  const { data: tools } = await supabase
    .from("tools_public")
    .select("id, name, description, url, icon_url")
    .in("id", toolIds);
  return tools ?? [];
}

export function getGuideRelatedTools(guideId: string) {
  return unstable_cache(
    () => fetchGuideRelatedTools(guideId),
    ["guide-related-tools", guideId],
    { tags: [GUIDES_TAG], revalidate: 1800 },
  )();
}

async function fetchGuideRelatedContests(guideId: string) {
  const supabase = createServerSupabaseClient();
  const { data: relations } = await supabase
    .from("guide_related_contests")
    .select("contest_id")
    .eq("guide_id", guideId);
  if (!relations || relations.length === 0) return [];

  const ids = relations.map((r: { contest_id: string }) => r.contest_id);
  const { data: contests } = await supabase
    .from("oportunidades_public")
    .select("id, titulo, slug, situacao, tipo")
    .in("id", ids);
  return contests ?? [];
}

export function getGuideRelatedContests(guideId: string) {
  return unstable_cache(
    () => fetchGuideRelatedContests(guideId),
    ["guide-related-contests", guideId],
    { tags: [GUIDES_TAG], revalidate: 1800 },
  )();
}

async function fetchGuideRelatedGuides(guideId: string) {
  const supabase = createServerSupabaseClient();
  const { data: relations } = await supabase
    .from("guide_related_guides")
    .select("related_guide_id")
    .eq("guide_id", guideId);
  if (!relations || relations.length === 0) return [];

  const ids = relations.map((r: { related_guide_id: string }) => r.related_guide_id);
  const { data: guides } = await supabase
    .from("guides")
    .select("id, title, slug, short_description, category")
    .in("id", ids)
    .eq("is_published", true);
  return guides ?? [];
}

export function getGuideRelatedGuides(guideId: string) {
  return unstable_cache(
    () => fetchGuideRelatedGuides(guideId),
    ["guide-related-guides", guideId],
    { tags: [GUIDES_TAG], revalidate: 1800 },
  )();
}
