"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GuideAuthorOption {
  userId: string | null;
  name: string;
  email: string | null;
}

const FALLBACK_AUTHORS: GuideAuthorOption[] = [
  { userId: null, name: "Equipe PqEstudar", email: null },
  { userId: null, name: "Matheus Dias", email: null },
  { userId: null, name: "Marília Brasileiro", email: null },
];

export function useGuideAuthors() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["moderator-authors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("moderator_authors");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const authors = useMemo(() => {
    const byName = new Map<string, GuideAuthorOption>();
    FALLBACK_AUTHORS.forEach((author) => byName.set(author.name, author));
    if (user) {
      const currentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Conta atual";
      byName.set(currentName, { userId: user.id, name: currentName, email: user.email ?? null });
    }
    (query.data ?? []).forEach((author) => {
      byName.set(author.display_name, {
        userId: author.user_id,
        name: author.display_name,
        email: author.email,
      });
    });
    return Array.from(byName.values());
  }, [query.data, user]);

  return { ...query, authors };
}
