import { z } from 'zod';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';

const filters = z.object({ status: z.enum(['all', 'pending', 'approved', 'rejected', 'suspended']), page: z.coerce.number().int().min(0).max(100000) });
export async function GET(request: Request) {
  try {
    const { client, response } = await affiliateSession();
    if (response) return response;
    const url = new URL(request.url);
    const filter = filters.safeParse({ status: url.searchParams.get('status') || 'all', page: url.searchParams.get('page') || '0' });
    if (!filter.success) return affiliateResponse({ error: 'Filtro inválido.' }, 400);
    const { data, error } = await client.rpc('affiliate_admin_list', { p_status: filter.data.status, p_page: filter.data.page });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
const review = z.object({ profile: z.string().uuid(), action: z.enum(['approve', 'reject', 'suspend', 'reactivate']), reason: z.string().trim().min(3).max(1000), version: z.number().int().positive() }).strict();
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' }, 403);
  try {
    const { client, response } = await affiliateSession();
    if (response) return response;
    const body = review.safeParse(await request.json().catch(() => null));
    if (!body.success) return affiliateResponse({ error: 'Informe uma decisão e um motivo válido.' }, 400);
    const { profile, action, reason, version } = body.data;
    const { data, error } = await client.rpc('affiliate_review', { p_profile: profile, p_action: action, p_reason: reason, p_version: version });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
