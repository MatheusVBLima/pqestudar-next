import { z } from 'zod';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';
import { encryptPix, validatePix, walletConfigured } from '@/lib/affiliates/pix-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const { client, response } = await affiliateSession(); if (response) return response;
    const page = z.coerce.number().int().min(0).max(100000).safeParse(new URL(request.url).searchParams.get('page') || 0);
    if (!page.success) return affiliateResponse({ error: 'Página inválida.' }, 400);
    const { data, error } = await client.rpc('affiliate_wallet', { p_page: page.data });
    return error ? affiliateFailure(error) : affiliateResponse({ ...(data as object), configured: walletConfigured() });
  } catch { return affiliateFailure({}); }
}
const schema = z.object({ id: z.string().uuid(), amount: z.number().int().positive().max(100000000), pixType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']), pix: z.string().max(254) }).strict();
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' }, 403);
  try {
    const { client, response, user } = await affiliateSession(); if (response) return response;
    if (!walletConfigured()) return affiliateFailure({ message: 'wallet_not_configured' });
    if (Number(request.headers.get('content-length')) > 4096) return affiliateResponse({ error: 'Solicitação inválida.' }, 413);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) return affiliateResponse({ error: 'Revise o valor e a chave Pix.' }, 400);
    const pix = validatePix(body.data.pixType, body.data.pix);
    if (!pix) return affiliateResponse({ error: 'Chave Pix inválida para o tipo selecionado.' }, 400);
    const mask = `${body.data.pixType}: ••••${pix.slice(-4)}`;
    const { data, error } = await client.rpc('affiliate_request_payout', { p_id: body.data.id, p_amount: body.data.amount, p_cipher: encryptPix(pix, user.id), p_mask: mask });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
