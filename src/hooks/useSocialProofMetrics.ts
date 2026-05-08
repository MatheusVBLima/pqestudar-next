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

  // Fallback estático — fonte real: Brevo (não acessível via Supabase)
  // TODO: conectar fonte real de newsletter (Brevo API ou RPC segura)
  const newsletterCount = 38;

  return {
    usersCount: usersCount ?? null,
    toolsCount: toolsCount ?? null,
    contestsCount: contestsCount ?? null,
    newsletterCount,
    isLoading: loadingUsers || loadingTools || loadingContests,
  };
}
