import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type PageSettingsRow = {
  route: string;
  title_tag?: string | null;
  meta_description?: string | null;
  header_title?: string | null;
  header_description?: string | null;
  [key: string]: unknown;
} | null;

export function pageSettingsTag(route: string): string {
  return `page_settings:${route}`;
}

async function fetchPageSettings(route: string): Promise<PageSettingsRow> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("page_settings")
    .select("*")
    .eq("route", route)
    .maybeSingle();
  return (data ?? null) as PageSettingsRow;
}

export function getPageSettings(route: string): Promise<PageSettingsRow> {
  return unstable_cache(
    () => fetchPageSettings(route),
    ["page_settings", route],
    { tags: ["page_settings", pageSettingsTag(route)], revalidate: 3600 },
  )();
}
