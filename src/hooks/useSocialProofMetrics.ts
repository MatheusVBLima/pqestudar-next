import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SocialProofMetrics {
  usersCount: number | null;
  toolsCount: number | null;
  contestsCount: number | null;
  newsletterCount: number | null;
  isLoading: boolean;
}

export function useSocialProofMetrics(): SocialProofMetrics {
  const { data: usersCount, isLoading: loadingUsers } = useQuery({
    queryKey: ["metrics-users-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_users_count");
      if (error) throw error;
      return data as number;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: toolsCount, isLoading: loadingTools } = useQuery({
    queryKey: ["metrics-tools-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tools_public")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: contestsCount, isLoading: loadingContests } = useQuery({
    queryKey: ["metrics-contests-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("oportunidades_public")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: newsletterCount, isLoading: loadingNewsletter } = useQuery({
    queryKey: ["metrics-newsletter-count"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ count: number }>(
        "newsletter-count",
        { method: "GET" },
      );
      if (error) throw error;
      return data.count;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    usersCount: usersCount ?? null,
    toolsCount: toolsCount ?? null,
    contestsCount: contestsCount ?? null,
    newsletterCount: newsletterCount ?? null,
    isLoading: loadingUsers || loadingTools || loadingContests || loadingNewsletter,
  };
}
