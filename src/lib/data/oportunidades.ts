import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const OPORTUNIDADES_TAG = "oportunidades";

export function oportunidadeSlugTag(slug: string): string {
  return `oportunidade:slug:${slug}`;
}

async function fetchPublishedOportunidades() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("oportunidades")
    .select("*, views_total")
    .eq("publicado", true)
    .order("data_publicacao", { ascending: false });
  return data ?? [];
}

export function getPublishedOportunidades() {
  return unstable_cache(
    () => fetchPublishedOportunidades(),
    ["oportunidades-published"],
    { tags: [OPORTUNIDADES_TAG], revalidate: 600 },
  )();
}

async function fetchOportunidadeMetadata(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("oportunidades")
    .select("titulo, meta_title, meta_description, resumo_editorial")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();
  return data ?? null;
}

export function getOportunidadeMetadata(slug: string) {
  return unstable_cache(
    () => fetchOportunidadeMetadata(slug),
    ["oportunidade-metadata", slug],
    { tags: [OPORTUNIDADES_TAG, oportunidadeSlugTag(slug)], revalidate: 600 },
  )();
}

async function fetchOportunidadeBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data: oportunidade } = await supabase
    .from("oportunidades")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();

  if (!oportunidade) return null;

  const [{ data: fontes }, { data: atualizacoes }] = await Promise.all([
    supabase
      .from("fontes_oportunidade")
      .select("*")
      .eq("oportunidade_id", oportunidade.id),
    supabase
      .from("atualizacoes_oportunidade")
      .select("*")
      .eq("oportunidade_id", oportunidade.id)
      .order("data_atualizacao", { ascending: false }),
  ]);

  return {
    oportunidade: {
      ...oportunidade,
      fontes_oportunidade: fontes ?? [],
    },
    atualizacoes: atualizacoes ?? [],
  };
}

export function getOportunidadeBySlug(slug: string) {
  return unstable_cache(
    () => fetchOportunidadeBySlug(slug),
    ["oportunidade-by-slug", slug],
    { tags: [OPORTUNIDADES_TAG, oportunidadeSlugTag(slug)], revalidate: 600 },
  )();
}

async function fetchOportunidadeRedirectSlug(oldSlug: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();

  const { data: redirectRow } = await supabase
    .from("oportunidades_slug_redirects")
    .select("oportunidade_id")
    .eq("old_slug", oldSlug)
    .maybeSingle();

  if (!redirectRow?.oportunidade_id) return null;

  const { data: currentOp } = await supabase
    .from("oportunidades")
    .select("slug")
    .eq("id", redirectRow.oportunidade_id)
    .eq("publicado", true)
    .maybeSingle();

  return currentOp?.slug ?? null;
}

export function getOportunidadeRedirectSlug(oldSlug: string): Promise<string | null> {
  return unstable_cache(
    () => fetchOportunidadeRedirectSlug(oldSlug),
    ["oportunidade-redirect", oldSlug],
    { tags: [OPORTUNIDADES_TAG], revalidate: 3600 },
  )();
}
