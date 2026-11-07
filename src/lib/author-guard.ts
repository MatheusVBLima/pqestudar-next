import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

export async function ensureAuthorAccess() {
  const db = await createServerSupabaseClientWithAuth();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login?from=%2Fautor');
  const checks = await Promise.all((['author', 'admin', 'developer'] as const).map(role => db.rpc('has_role', { _user_id: user.id, _role: role })));
  if (checks.some(check => check.error)) throw new Error('Não foi possível verificar o acesso ao painel.');
  if (!checks.some(check => check.data === true)) redirect('/autores/meu-perfil');
}
