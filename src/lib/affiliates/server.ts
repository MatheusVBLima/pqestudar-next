import 'server-only';
import { NextResponse } from 'next/server';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

export function affiliateResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}
export async function affiliateSession() {
  const client = await createServerSupabaseClientWithAuth();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client, response: affiliateResponse({ error: 'Entre novamente para continuar.' }, error && (!error.status || error.status >= 500) ? 503 : 401) };
  return { client, response: null, user: data.user };
}
export function affiliateFailure(error: { code?: string; message?: string }) {
  const messages: Record<string, [number, string]> = {
    affiliate_approval_required: [403, 'Seu cadastro precisa estar aprovado para alterar o código.'],
    invalid_affiliate_code: [400, 'Use de 3 a 32 letras, números ou hífens, começando e terminando com letra ou número.'],
    affiliate_code_taken: [409, 'Este código já está em uso. Escolha outro.'],
    email_confirmation_required: [403, 'Confirme seu email antes de solicitar participação.'],
    admin_required: [403, 'Você não tem permissão para esta operação.'],
    stale_version: [409, 'Este cadastro foi alterado. Atualize a lista antes de continuar.'],
    invalid_transition: [409, 'Essa mudança não está disponível para o status atual.'],
    rate_limited: [429, 'Muitas operações. Aguarde um minuto e tente novamente.'],
    profile_not_found: [404, 'Cadastro não encontrado.'],
  };
  const [status, message] = messages[error.message || ''] || [503, 'Não foi possível acessar o programa. Tente novamente em instantes.'];
  return affiliateResponse({ error: message }, status);
}
export function validAffiliateOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
