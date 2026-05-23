import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LegalVersionHistoryItem {
  date: string;
  changes: string;
  isCurrent?: boolean;
}

interface RawLegalVersionHistoryItem {
  date: string;
  changes: string;
}

const VERIFIED_HISTORY: Record<string, RawLegalVersionHistoryItem[]> = {
  "/termos": [
    {
      date: "2026-05-22",
      changes: "Alteracao registrada no historico do repositorio.",
    },
    {
      date: "2026-05-07",
      changes: "Alteracao registrada no historico do repositorio.",
    },
  ],
  "/privacidade": [
    {
      date: "2026-05-22",
      changes: "Alteracao registrada no historico do repositorio.",
    },
    {
      date: "2026-05-07",
      changes: "Alteracao registrada no historico do repositorio.",
    },
  ],
};

function formatLegalDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function useLegalVersionHistory(route: string, currentUpdatedAt?: string | null) {
  return useQuery<LegalVersionHistoryItem[]>({
    queryKey: ["legal-version-history", route, currentUpdatedAt],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_versions")
        .select("created_at, summary")
        .eq("url", route)
        .eq("source", "legal_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const currentEntry: RawLegalVersionHistoryItem[] = currentUpdatedAt
        ? [
            {
              date: currentUpdatedAt,
              changes: "Alteracao registrada no banco de dados.",
            },
          ]
        : [];

      const automaticHistory: RawLegalVersionHistoryItem[] = (data ?? []).map((version) => ({
        date: version.created_at,
        changes: version.summary || "Alteracao registrada automaticamente.",
      }));

      const byDate = new Map<string, RawLegalVersionHistoryItem>();
      [...currentEntry, ...automaticHistory, ...(VERIFIED_HISTORY[route] ?? [])].forEach((item) => {
        const dayKey = item.date.slice(0, 10);
        if (!byDate.has(dayKey)) {
          byDate.set(dayKey, item);
        }
      });

      return Array.from(byDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((item, index) => ({
          date: formatLegalDate(item.date),
          changes: item.changes,
          isCurrent: index === 0,
        }));
    },
  });
}
