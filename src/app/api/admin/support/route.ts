import { requireAdminApi } from '@/lib/admin-api';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    return Response.json({ error: 'Mensagem inválida.' }, { status: 400 });
  }
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('delete_support_message', { p_id: id });
    if (error) throw error;
    if (!data) return Response.json({ error: 'Esta mensagem não foi encontrada. Atualize a lista.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'Não foi possível excluir. Tente novamente.' }, { status: 503 });
  }
}

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
