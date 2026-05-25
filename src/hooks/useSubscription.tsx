import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'inactive' | 'expired' | 'canceled';
  plan_type: 'monthly' | 'annual' | 'trial_30d' | 'lifetime';
  plan_tier: 'basic' | 'premium' | 'founder';
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

const SUB_CACHE = {
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  retry: 0,
};

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Skip fetching on admin routes — admin bypasses subscription anyway
  const isAdminRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  const subQuery = useQuery({
    queryKey: ['subscription', user?.id ?? 'anon'],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      return data as Subscription | null;
    },
    enabled: !!user && !isAdminRoute,
    ...SUB_CACHE,
  });

  const subscription = subQuery.data ?? null;
  const loading = authLoading || (subQuery.isLoading && !subQuery.data && !isAdminRoute);
  const error = subQuery.error ? 'Erro ao verificar assinatura' : null;

  // Check if subscription is currently active
  const isActive = useCallback(() => {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    const endsAt = new Date(subscription.ends_at);
    return endsAt > new Date();
  }, [subscription]);

  // Get remaining days
  const getRemainingDays = useCallback(() => {
    if (!subscription || !isActive()) return 0;
    const endsAt = new Date(subscription.ends_at);
    const diffTime = endsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [subscription, isActive]);

  // Get plan display name
  const getPlanName = useCallback(() => {
    if (!subscription) return null;
    const tierLabel =
      subscription.plan_tier === 'founder' ? 'Fundador' : subscription.plan_tier === 'basic' ? 'Básico' : 'Premium';
    switch (subscription.plan_type) {
      case 'monthly': return `${tierLabel} Mensal`;
      case 'annual': return `${tierLabel} Anual`;
      case 'trial_30d': return `${tierLabel} Trial 30 dias`;
      case 'lifetime': return `${tierLabel} Vitalício`;
      default: return subscription.plan_type;
    }
  }, [subscription]);

  // Redeem a token
  const redeemToken = useCallback(async (token: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Você precisa estar logado para resgatar um token.' };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
      }

      const response = await supabase.functions.invoke('redeem-token', {
        body: { token },
      });

      if (response.error) {
        console.error('Error redeeming token:', response.error);
        return { success: false, message: response.error.message || 'Erro ao resgatar token. Tente novamente.' };
      }

      if (response.data?.success) {
        // Refresh subscription data
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });
        return { success: true, message: response.data.message || 'Assinatura ativada com sucesso!' };
      }

      return { success: false, message: response.data?.error || 'Erro desconhecido ao resgatar token.' };
    } catch (err: unknown) {
      console.error('Unexpected error redeeming token:', err);
      return { success: false, message: 'Erro inesperado. Tente novamente.' };
    }
  }, [user, queryClient]);

  return {
    subscription,
    loading,
    error,
    isActive,
    getRemainingDays,
    getPlanName,
    redeemToken,
    refetch: subQuery.refetch,
  };
};
