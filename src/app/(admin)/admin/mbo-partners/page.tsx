import AdminAffiliatesClient from '@/components/affiliates/AdminAffiliatesClient';
import { redirect } from 'next/navigation';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

export const metadata = { title: 'Gestão de Afiliados | p.q.estudar' };
export default async function AdminAffiliatesPage() {
  const client = await createServerSupabaseClientWithAuth();
  const { data, error } = await client.auth.getUser();
  if (error && (!error.status || error.status >= 500)) throw new Error('Não foi possível verificar a sessão.');
  if (error || !data.user) redirect('/login?from=/admin/mbo-partners');
  // The layout checks the existing admin guard; every RPC independently authorizes the actor.
  return <AdminAffiliatesClient userId={data.user.id} />;
}
