import { redirect } from 'next/navigation';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';
import AffiliateDashboardClient from '@/components/affiliates/AffiliateDashboardClient';

export const metadata = { title: 'Afiliados | MBO Partners', robots: { index: false, follow: false } };
export default async function AffiliatesPage() {
  const client = await createServerSupabaseClientWithAuth();
  const { data, error } = await client.auth.getUser();
  if (error && (!error.status || error.status >= 500)) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
  if (error || !data.user) redirect('/login?from=/afiliados');
  return <AffiliateDashboardClient userId={data.user.id} />;
}
