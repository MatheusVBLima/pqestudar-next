import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'developer' | 'moderator' | 'user';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

const ADMIN_CACHE = {
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  retry: 0,
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado';

export const useUserRoles = () => {
  const { user } = useAuth();

  const adminQuery = useQuery({
    queryKey: ['check-admin', user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user) return { isAdmin: false };
      const { data, error } = await supabase.functions.invoke('check-admin');
      if (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false };
      }
      return { isAdmin: data?.isAdmin || false };
    },
    enabled: !!user,
    ...ADMIN_CACHE,
  });

  const isAdmin = adminQuery.data?.isAdmin ?? false;
  const loading = adminQuery.isLoading;

  const hasRole = (_role: AppRole): boolean => false;

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }])
        .select()
        .single();
      if (error) throw error;
      if (userId === user?.id) adminQuery.refetch();
      return { data, error: null };
    } catch (err: unknown) {
      return { data: null, error: getErrorMessage(err) };
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
      if (userId === user?.id) adminQuery.refetch();
      return { error: null };
    } catch (err: unknown) {
      return { error: getErrorMessage(err) };
    }
  };

  return {
    userRoles: [] as UserRole[],
    isAdmin,
    loading,
    hasRole,
    assignRole,
    removeRole,
    refetch: adminQuery.refetch,
  };
};
