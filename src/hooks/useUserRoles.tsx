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
  refetchOnMount: true,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: true,
  retry: 2,
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado';

export const useUserRoles = () => {
  const { user, loading: authLoading } = useAuth();

  const adminQuery = useQuery({
    queryKey: ['check-admin', user?.id ?? 'anon', 'server-roles-v3'],
    queryFn: async ({ signal }) => {
      if (!user) return { roles: [] as AppRole[] };

      const response = await fetch('/api/auth/roles', { credentials: 'same-origin', cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível verificar suas permissões. Tente novamente.');
      if (data.userId !== user.id || !Array.isArray(data.roles)) {
        throw new Error('Sua sessão mudou. Atualize a página para verificar o acesso.');
      }
      return { roles: data.roles.filter((role: string) => ['admin', 'developer', 'moderator', 'user'].includes(role)) as AppRole[] };
    },
    enabled: !!user,
    ...ADMIN_CACHE,
  });

  const roles = adminQuery.data?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isDeveloper = roles.includes('developer');
  const isModerator = roles.includes('moderator');
  const canAccessAdmin = isAdmin || isDeveloper;
  const canAccessModerator = isModerator || isAdmin;
  const loading = authLoading || (!!user && adminQuery.isLoading);

  const hasRole = (role: AppRole): boolean => roles.includes(role);

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
    userRoles: roles.map((role) => ({
      id: `${user?.id ?? 'anon'}:${role}`,
      user_id: user?.id ?? '',
      role,
      created_at: '',
      updated_at: '',
    })) as UserRole[],
    isAdmin,
    isDeveloper,
    isModerator,
    canAccessAdmin,
    canAccessModerator,
    loading,
    error: adminQuery.isError ? getErrorMessage(adminQuery.error) : null,
    hasRole,
    assignRole,
    removeRole,
    refetch: adminQuery.refetch,
  };
};
