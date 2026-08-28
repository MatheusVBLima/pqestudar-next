import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PREMIUM_COURSES_PUBLIC_FLAG = "premium_courses_public_access";

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
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    enabled: query.data === true,
    loading: query.isLoading,
    error: query.error,
  };
}

