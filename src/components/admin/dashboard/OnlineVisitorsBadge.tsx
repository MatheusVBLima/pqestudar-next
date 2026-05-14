"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function OnlineVisitorsBadge() {
  const { data } = useQuery({
    queryKey: ["admin-overview-online-visitors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_online_visitors", {
        p_window_minutes: 2,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const count = data ?? 0;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-[1.2rem] border bg-muted/30 px-3 py-1.5 text-xs"
      title="Visitantes ativos nos últimos 2 minutos"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="font-medium">{count}</span>
      <span className="text-muted-foreground">
        {count === 1 ? "visitante atual" : "visitantes atuais"}
      </span>
    </div>
  );
}
