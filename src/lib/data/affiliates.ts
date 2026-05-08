import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface AffiliatePage {
  affiliate_name: string;
  slug: string;
  basic_url: string;
  premium_url: string;
  is_active: boolean;
}

export const AFFILIATES_TAG = "affiliates";

export function affiliateSlugTag(slug: string): string {
  return `affiliate:${slug}`;
}

async function fetchAffiliateBySlug(slug: string): Promise<AffiliatePage | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("affiliate_pages")
    .select("affiliate_name, slug, basic_url, premium_url, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as AffiliatePage | null) ?? null;
}

export function getAffiliateBySlug(slug: string): Promise<AffiliatePage | null> {
  return unstable_cache(
    () => fetchAffiliateBySlug(slug),
    ["affiliate-by-slug", slug],
    { tags: [AFFILIATES_TAG, affiliateSlugTag(slug)], revalidate: 3600 },
  )();
}
