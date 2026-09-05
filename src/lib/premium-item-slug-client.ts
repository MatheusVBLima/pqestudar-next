import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolvePremiumItemSlugFromLookup, type PremiumItemSlugResolution } from "@/lib/premium-item-slug-resolution";

export function resolvePremiumItemSlugWithClient(supabase: SupabaseClient<Database>, slug: string): Promise<PremiumItemSlugResolution> {
  return resolvePremiumItemSlugFromLookup(
    slug,
    async value => (await supabase.from("premium_items").select("slug").eq("slug", value).maybeSingle()).data?.slug ?? null,
    async value => {
      const alias = (await supabase.from("premium_item_slug_aliases").select("premium_item_id").eq("old_slug", value).eq("is_active", true).maybeSingle()).data;
      if (!alias) return null;
      return (await supabase.from("premium_items").select("slug").eq("id", alias.premium_item_id).maybeSingle()).data?.slug ?? null;
    },
  );
}
