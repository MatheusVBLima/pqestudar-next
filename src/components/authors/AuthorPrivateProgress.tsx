"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthorProgress } from './AuthorProgress';

export function AuthorPrivateProgress({ authorId }: { authorId: string }) {
  const { user, loading } = useAuth();
  const progress = useQuery({
    queryKey: ['author-private-progress', authorId, user?.id],
    enabled: !loading && !!user,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      // The RPC authorizes owners and administrators using the actual session.
      const { data, error } = await supabase.rpc('get_author_progress', { target: authorId });
      if (error?.code === '42501') return null;
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  if (loading || !user) return null;
  if (progress.isError) return <div className="mt-5 text-xs text-muted-foreground" role="status">Não foi possível consultar o progresso privado.<Button variant="link" size="sm" onClick={() => progress.refetch()}>Tentar novamente</Button></div>;
  if (!progress.data) return null;
  return <AuthorProgress progress={progress.data} privateView compact />;
}
