import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const CURATIONS_TAG = "curations";

export function curationSlugTag(slug: string): string {
  return `curation:${slug}`;
}

function toolToContent(tool: {
  id: string;
  name: string;
  description: string;
  slug?: string | null;
  url?: string | null;
  attachment_url?: string | null;
  icon_url?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  return {
    id: tool.id,
    type: "tool",
    title: tool.name,
    description: tool.description,
    href: tool.attachment_url || tool.url || `/ferramentas/${tool.slug || tool.id}`,
    actionLabel: tool.attachment_url ? "Fazer download" : "Acessar",
    imageUrl: tool.icon_url || null,
    category: tool.tags?.[0] || null,
    tags: tool.tags || [],
    updatedAt: tool.updated_at || tool.created_at || null,
    raw: tool,
  };
}

function contestToContent(contest: {
  id: string | null;
  titulo: string | null;
  slug: string | null;
  resumo_editorial?: string | null;
  categoria?: string | null;
  situacao?: string | null;
  tipo?: string | null;
  abrangencia?: string | null;
  escolaridade?: string | null;
  escolaridades?: string[] | null;
  updated_at?: string | null;
  data_publicacao?: string | null;
}) {
  if (!contest.id || !contest.titulo || !contest.slug) return null;
  return {
    id: contest.id,
    type: "contest",
    title: contest.titulo,
    description: contest.resumo_editorial || [contest.tipo, contest.abrangencia, contest.situacao].filter(Boolean).join(" - "),
    href: `/concursos/${contest.slug}`,
    actionLabel: "Ver concurso",
    category: contest.categoria || contest.situacao || null,
    tags: [contest.tipo, contest.abrangencia, contest.escolaridade, ...(contest.escolaridades || [])].filter(Boolean),
    updatedAt: contest.updated_at || contest.data_publicacao || null,
    raw: contest,
  };
}

function guideToContent(guide: {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  public_category?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  updated_at?: string | null;
}) {
  return {
    id: guide.id,
    type: "guide",
    title: guide.title,
    description: guide.short_description,
    href: `/guias/${guide.slug}`,
    actionLabel: "Ler guia",
    imageUrl: guide.cover_image_url || null,
    category: guide.public_category || guide.category || null,
    tags: [guide.public_category, guide.category].filter(Boolean),
    updatedAt: guide.updated_at || null,
    raw: guide,
  };
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

  const normalizedItems = (items ?? []).map((item: { tool_id?: string | null; item_id?: string | null; item_type?: string | null }) => ({
    ...item,
    item_type: item.item_type || (item.tool_id ? "tool" : "tool"),
    item_id: item.item_id || item.tool_id,
  }));

  const toolIds = normalizedItems.filter((item) => item.item_type === "tool" && item.item_id).map((item) => item.item_id as string);
  const contestIds = normalizedItems.filter((item) => item.item_type === "contest" && item.item_id).map((item) => item.item_id as string);
  const guideIds = normalizedItems.filter((item) => item.item_type === "guide" && item.item_id).map((item) => item.item_id as string);

  if (toolIds.length === 0 && contestIds.length === 0 && guideIds.length === 0) {
    return { ...page, items: [] };
  }

  const [toolsResult, contestsResult, guidesResult] = await Promise.all([
    toolIds.length ? supabase.from("tools_public").select("*").in("id", toolIds) : Promise.resolve({ data: [] }),
    contestIds.length
      ? supabase
          .from("oportunidades_public")
          .select("id, titulo, slug, resumo_editorial, categoria, situacao, tipo, abrangencia, escolaridade, escolaridades, updated_at, data_publicacao")
          .in("id", contestIds)
      : Promise.resolve({ data: [] }),
    guideIds.length
      ? supabase
          .from("guides")
          .select("id, title, slug, short_description, public_category, category, cover_image_url, updated_at")
          .in("id", guideIds)
          .eq("is_published", true)
      : Promise.resolve({ data: [] }),
  ]);

  const contentMap = new Map<string, unknown>();
  for (const tool of toolsResult.data ?? []) {
    contentMap.set(`tool:${(tool as { id: string }).id}`, toolToContent(tool as Parameters<typeof toolToContent>[0]));
  }
  for (const contest of contestsResult.data ?? []) {
    const content = contestToContent(contest as Parameters<typeof contestToContent>[0]);
    if (content) contentMap.set(`contest:${content.id}`, content);
  }
  for (const guide of guidesResult.data ?? []) {
    const content = guideToContent(guide as Parameters<typeof guideToContent>[0]);
    contentMap.set(`guide:${content.id}`, content);
  }

  const itemsWithContent = normalizedItems
    .map((item) => ({
      ...item,
      content: contentMap.get(`${item.item_type}:${item.item_id}`),
      tool: item.item_type === "tool" ? (contentMap.get(`tool:${item.item_id}`) as { raw?: unknown } | undefined)?.raw : undefined,
    }))
    .filter((item: { content: unknown }) => item.content);

  return { ...page, items: itemsWithContent };
}

export function getCurationBySlug(slug: string) {
  return unstable_cache(
    () => fetchCurationBySlug(slug),
    ["curation-by-slug", slug],
    { tags: [CURATIONS_TAG, curationSlugTag(slug)], revalidate: 1800 },
  )();
}

async function fetchPublishedCurations() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("curation_pages")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  return (data ?? []) as Array<{ slug: string; updated_at: string }>;
}

export function getPublishedCurations() {
  return unstable_cache(
    () => fetchPublishedCurations(),
    ["curations-published"],
    { tags: [CURATIONS_TAG], revalidate: 3600 },
  )();
}
