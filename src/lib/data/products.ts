import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface ProductRow {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  cta_url: string;
  clicks_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const PRODUCTS_TAG = "products";

async function fetchActiveProducts(): Promise<ProductRow[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as ProductRow[];
}

export function getActiveProducts(): Promise<ProductRow[]> {
  return unstable_cache(
    () => fetchActiveProducts(),
    ["products-active"],
    { tags: [PRODUCTS_TAG], revalidate: 3600 },
  )();
}
