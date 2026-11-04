"use client";

import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Portal } from '@radix-ui/react-tooltip';

export function AuthorProfileVisits({ authorId }: { authorId: string }) {
  const { user, loading } = useAuth();
  const visits = useQuery({
    queryKey: ['author-profile-visits', authorId, user?.id],
    enabled: !loading && !!user,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_author_profile_visits', { target: authorId });
      if (error?.code === '42501') return null;
      if (error) throw error;
      return data;
    },
  });
  if (loading || !user || visits.isError || visits.data == null) return null;
  return <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
    <button type="button" aria-label="Visitas ao perfil" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium tabular-nums text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Eye size={14} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
      {Number(visits.data).toLocaleString('pt-BR')}
    </button>
  </TooltipTrigger><Portal><TooltipContent side="bottom" align="end" className="max-w-64 text-xs leading-relaxed">
    Visitas registradas ao perfil, não visitantes únicos. Exclui acessos identificados do autor e da administração. Inclui apenas acessos com consentimento para analytics.
  </TooltipContent></Portal></Tooltip></TooltipProvider>;
}
