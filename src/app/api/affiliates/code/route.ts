import { z } from 'zod';
import { AFFILIATE_CODE_PATTERN, normalizeAffiliateCode } from '@/lib/affiliates/code';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';

const code = z.string().max(128).transform(normalizeAffiliateCode).pipe(z.string().regex(AFFILIATE_CODE_PATTERN));
export async function GET(request: Request) {
  try {
    const { client, response } = await affiliateSession();
    if (response) return response;
    const parsed = code.safeParse(new URL(request.url).searchParams.get('code'));
    if (!parsed.success) return affiliateFailure({ message: 'invalid_affiliate_code' });
    const { data, error } = await client.rpc('affiliate_code_available', { p_code: parsed.data });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
const change = z.object({ code, version: z.number().int().positive() }).strict();
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' }, 403);
  try {
    const { client, response } = await affiliateSession();
    if (response) return response;
    const parsed = change.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return affiliateFailure({ message: 'invalid_affiliate_code' });
    const { data, error } = await client.rpc('affiliate_change_code', { p_code: parsed.data.code, p_version: parsed.data.version });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
