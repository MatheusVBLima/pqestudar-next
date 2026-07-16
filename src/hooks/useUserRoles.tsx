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
      if (!user) return { roles: [] as AppRole[] };

      const roleChecks = await Promise.all(
        (['admin', 'developer', 'moderator', 'user'] as AppRole[]).map(async (role) => {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: role,
          });

          if (error) {
            console.error(`Error checking ${role} role:`, error);
            return null;
          }

          return data === true ? role : null;
        }),
      );

      return { roles: roleChecks.filter(Boolean) as AppRole[] };
    },
    enabled: !!user,
    ...ADMIN_CACHE,
  });

  const roles = adminQuery.data?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isDeveloper = roles.includes('developer');
  const canAccessAdmin = isAdmin || isDeveloper;
  const loading = adminQuery.isLoading;

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
    canAccessAdmin,
    loading,
    hasRole,
    assignRole,
    removeRole,
    refetch: adminQuery.refetch,
  };
};
