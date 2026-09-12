import { requireAdminApi } from '@/lib/admin-api';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1));
  const search = (params.get('search') || '').trim().slice(0, 120);
  try {
    let query = createSupabaseAdminClient().from('support_messages')
      .select('id,created_at,email,subject,description', { count: 'exact' });
    if (search) query = query.ilike('subject', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
    const { data, count, error } = await query.order('created_at', { ascending: false }).order('id').range((Math.floor(page)-1)*20, Math.floor(page)*20-1);
    if (error) throw error;
    return Response.json({ messages: data, total: count }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível carregar as mensagens.' }, { status: 503 });
  }
}
