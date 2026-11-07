'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useOwnAuthor() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['my-author-profile', user?.id],
    enabled: !!user && !loading,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('author_profiles').select('id,slug,user_id').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
