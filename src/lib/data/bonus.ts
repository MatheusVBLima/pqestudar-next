import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface BonusTool {
  logoUrl: string;
  logoAlt: string;
  toolTitle: string;
  toolDescription: string;
  toolLink: string;
  tags?: string[];
}

export interface BonusPage {
  id: string;
  slug: string;
  title: string;
  intro: string;
  cards: BonusTool[];
  status: "visible" | "hidden";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const BONUS_TAG = "bonus";

export function bonusSlugTag(slug: string): string {
  return `bonus:${slug}`;
}

async function fetchBonusBySlug(slug: string): Promise<BonusPage | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("newsletter_bonus_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if ((data as { status?: string }).status === "hidden") return null;
  return data as unknown as BonusPage;
}

export function getBonusBySlug(slug: string): Promise<BonusPage | null> {
  return unstable_cache(
    () => fetchBonusBySlug(slug),
    ["bonus-by-slug", slug],
    { tags: [BONUS_TAG, bonusSlugTag(slug)], revalidate: 3600 },
  )();
}
