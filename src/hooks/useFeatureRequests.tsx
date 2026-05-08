import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-message';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'completed';
  is_visible: boolean;
  sort_order: number;
  votes_count: number;
  user_voted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  card_image_url: string | null;
}

const QUERY_KEY = ['feature_requests'];

export const useFeatureRequests = (includeHidden = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, includeHidden, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_feature_requests', {
        include_hidden: includeHidden,
      });
      if (error) throw error;
      return (data ?? []) as FeatureRequest[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const voteMutation = useMutation({
    mutationFn: async (featureId: string) => {
      if (!user) throw new Error('Login necessário');
      const { error } = await supabase
        .from('feature_votes')
        .insert({ feature_id: featureId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: unknown) => toast({ title: 'Erro ao votar', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const unvoteMutation = useMutation({
    mutationFn: async (featureId: string) => {
      if (!user) throw new Error('Login necessário');
      const { error } = await supabase
        .from('feature_votes')
        .delete()
        .eq('feature_id', featureId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: unknown) => toast({ title: 'Erro ao remover voto', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; card_image_url?: string | null }) => {
      const { error } = await supabase.from('feature_requests').insert({
        title: data.title,
        description: data.description || null,
        card_image_url: data.card_image_url ?? null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Lançamento adicionado' });
    },
    onError: (err: unknown) => toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; description?: string; card_image_url?: string | null }) => {
      const { error } = await supabase
        .from('feature_requests')
        .update({
          title: data.title,
          description: data.description || null,
          card_image_url: data.card_image_url ?? null,
          updated_by: user?.id,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Atualizado' });
    },
    onError: (err: unknown) => toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const toggleVisibleMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from('feature_requests')
        .update({ is_visible: !is_visible })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feature_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Excluído' });
    },
    onError: (err: unknown) => toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const { error } = await supabase.rpc('complete_feature_request', { p_feature_id: featureId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Marcado como concluído! Notificação enviada a todos.' });
    },
    onError: (err: unknown) => toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      if (items.length === 0) return;
      await Promise.all(
        items.map(async (item) => {
          const { error } = await supabase
            .from('feature_requests')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id);
          if (error) throw error;
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    features: query.data ?? [],
    loading: query.isLoading,
    vote: voteMutation.mutate,
    unvote: unvoteMutation.mutate,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    toggleVisible: toggleVisibleMutation.mutate,
    remove: deleteMutation.mutate,
    complete: completeMutation.mutate,
    reorder: reorderMutation.mutate,
    refetch: query.refetch,
  };
};
