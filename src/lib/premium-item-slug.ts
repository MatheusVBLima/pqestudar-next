import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { resolvePremiumItemSlugWithClient } from "@/lib/premium-item-slug-client";
import type { PremiumItemSlugResolution } from "@/lib/premium-item-slug-resolution";

export async function resolvePremiumItemSlug(slug: string): Promise<PremiumItemSlugResolution> {
  return resolvePremiumItemSlugWithClient(await createServerSupabaseClientWithAuth(), slug);
}
