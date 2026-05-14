import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const PREMIUM_TAG = "premium";

export function premiumItemSlugTag(slug: string): string {
  return `premium-item:slug:${slug}`;
}

export function premiumUpdateSlugTag(slug: string): string {
  return `premium-update:slug:${slug}`;
}

const PREMIUM_ITEM_COLUMNS =
  "id, title, slug, description_short, description_full, logo_url, external_url, tags, item_type, status, sort_order, published_at";

async function fetchPremiumCourses() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("premium_items")
    .select(PREMIUM_ITEM_COLUMNS)
    .eq("item_type", "course")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export function getPremiumCourses() {
  return unstable_cache(
    () => fetchPremiumCourses(),
    ["premium-courses"],
    { tags: [PREMIUM_TAG], revalidate: 600 },
  )();
}

async function fetchPremiumJobs() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("premium_items")
    .select(PREMIUM_ITEM_COLUMNS)
    .eq("item_type", "job")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export function getPremiumJobs() {
  return unstable_cache(
    () => fetchPremiumJobs(),
    ["premium-jobs"],
    { tags: [PREMIUM_TAG], revalidate: 600 },
  )();
}

async function fetchPremiumItemBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("premium_items")
    .select(PREMIUM_ITEM_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ?? null;
}

export function getPremiumItemBySlug(slug: string) {
  return unstable_cache(
    () => fetchPremiumItemBySlug(slug),
    ["premium-item-by-slug", slug],
    { tags: [PREMIUM_TAG, premiumItemSlugTag(slug)], revalidate: 600 },
  )();
}

async function fetchPremiumItemById(id: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("premium_items")
    .select(PREMIUM_ITEM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export function getPremiumItemById(id: string) {
  return unstable_cache(
    () => fetchPremiumItemById(id),
    ["premium-item-by-id", id],
    { tags: [PREMIUM_TAG], revalidate: 600 },
  )();
}

async function fetchPremiumUpdates() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("weekly_updates")
    .select("id, title, slug, intro, highlight, published_at, status")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return data ?? [];
}

export function getPremiumUpdates() {
  return unstable_cache(
    () => fetchPremiumUpdates(),
    ["premium-updates"],
    { tags: [PREMIUM_TAG], revalidate: 600 },
  )();
}

async function fetchPremiumUpdateBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data: update } = await supabase
    .from("weekly_updates")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!update) return null;

  const { data: items } = await supabase
    .from("weekly_update_items")
    .select(
      "id, weekly_update_id, premium_item_id, sort_order, premium_items(id, title, slug, description_short, logo_url, external_url, tags, item_type, status)",
    )
    .eq("weekly_update_id", update.id)
    .order("sort_order", { ascending: true });

  return { update, items: items ?? [] };
}

export function getPremiumUpdateBySlug(slug: string) {
  return unstable_cache(
    () => fetchPremiumUpdateBySlug(slug),
    ["premium-update-by-slug", slug],
    { tags: [PREMIUM_TAG, premiumUpdateSlugTag(slug)], revalidate: 600 },
  )();
}
