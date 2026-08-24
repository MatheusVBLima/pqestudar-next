import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TrailStage, TrailStageStatus } from "@/lib/guide-trail-planner";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

export interface TrailCoverageStatus {
  subject: string;
  stage: TrailStage;
  status: Exclude<TrailStageStatus, "missing">;
}

export function useModeratorTrailCoverage(enabled: boolean) {
  return useQuery({
    queryKey: ["moderator-trail-coverage"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "trail-coverage" }),
      });
      if (!response.ok) throw new Error("Erro ao carregar cobertura do planejador");
      return await response.json() as TrailCoverageStatus[];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
