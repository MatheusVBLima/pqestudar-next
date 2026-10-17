import { z } from 'zod';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';

export async function GET() {
  try {
    const { client, response, user } = await affiliateSession();
    if (response) return response;
    const [{ data, error }, admin] = await Promise.all([
      client.rpc('affiliate_dashboard'),
      client.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    ]);
    return error ? affiliateFailure(error) : affiliateResponse({ ...(data as object), can_demo: !admin.error && admin.data === true });
  } catch { return affiliateFailure({}); }
}
const application = z.object({ name: z.string().trim().min(2).max(100), channel: z.string().trim().min(5).max(500) }).strict();
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' }, 403);
  try {
    const { client, response } = await affiliateSession();
    if (response) return response;
    const body = application.safeParse(await request.json().catch(() => null));
    if (!body.success) return affiliateResponse({ error: 'Informe seu nome e como pretende divulgar o MBO.' }, 400);
    const { data, error } = await client.rpc('affiliate_apply', { p_name: body.data.name, p_channel: body.data.channel });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
