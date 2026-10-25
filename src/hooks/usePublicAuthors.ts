"use client";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AUTHOR_SELECT } from '@/lib/authors';
import { isMissingAuthorProfiles } from '@/lib/author-schema';

export function usePublicAuthors() {
  return useQuery({
    queryKey: ['public-authors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('author_profiles').select(AUTHOR_SELECT).order('display_name');
      if (isMissingAuthorProfiles(error)) return [];
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
