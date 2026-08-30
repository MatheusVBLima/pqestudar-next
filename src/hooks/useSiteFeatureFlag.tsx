import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PREMIUM_COURSES_PUBLIC_FLAG = "premium_courses_public_access";
export const FEATURED_TOOLS_CLICK_BADGE_FLAG = "featured_tools_click_badge";

export function useSiteFeatureFlag(key: string) {
  const query = useQuery({
    queryKey: ["site-feature-flag", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_feature_flags")
        .select("enabled")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.enabled === true;
    },
    // Feature flags only change through the admin controls. Keep the resolved
    // value while the user changes tabs instead of reloading the navbar.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    enabled: query.data === true,
    loading: query.isLoading,
    error: query.error,
  };
}
