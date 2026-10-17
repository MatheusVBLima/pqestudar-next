import { z } from 'zod';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { syncMercadoPagoOrder } from '@/lib/mercado-pago-fulfillment';
import { decryptPix } from '@/lib/affiliates/pix-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const { client, response } = await affiliateSession(); if (response) return response;
    const params = new URL(request.url).searchParams;
    const proof = params.get('proof');
    if (proof) {
      if (!z.string().uuid().safeParse(proof).success) return affiliateResponse({ error: 'Identificador inválido.' }, 400);
      const { data, error } = await client.rpc('affiliate_payout_proof', { p_attempt: proof });
      if (error) return affiliateFailure(error);
      if (!data) return affiliateResponse({ error: 'Comprovante não encontrado.' }, 404);
      return new Response(Buffer.from(data.base64, 'base64'), { headers: { 'Content-Type': data.type, 'Content-Disposition': 'attachment; filename="comprovante.' + (data.type === 'application/pdf' ? 'pdf' : data.type === 'image/png' ? 'png' : 'jpg') + '"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' } });
    }
    const page = z.coerce.number().int().min(0).max(100000).safeParse(params.get('page') || 0);
    if (!page.success) return affiliateResponse({ error: 'Página inválida.' }, 400);
    const { data, error } = await client.rpc('affiliate_finance_admin', { p_page: page.data });
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('settings'), minimum: z.number().int().min(100).max(10000000), days: z.number().int().min(1).max(365) }).strict(),
  z.object({ action: z.literal('release'), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal('detail'), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal('review'), id: z.string().uuid(), version: z.number().int().positive(), status: z.enum(['reviewing', 'approved', 'processing', 'paid', 'rejected', 'failed']), reason: z.string().trim().min(3).max(1000), reference: z.string().trim().min(6).max(150).optional(), proof: z.string().max(2796204).optional(), proofType: z.enum(['image/png', 'image/jpeg', 'application/pdf']).optional(), verified: z.boolean().optional() }).strict(),
]);
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' }, 403);
  try {
    const { client, response } = await affiliateSession(); if (response) return response;
    // Authorize with the caller's session before touching service-role functions or parsing uploads.
    const permission = await client.rpc('affiliate_is_admin');
    if (permission.error || permission.data !== true) return affiliateFailure({ message: 'admin_required' });
    if (Number(request.headers.get('content-length')) > 2900000) return affiliateResponse({ error: 'O comprovante deve ter até 2 MB.' }, 413);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) return affiliateResponse({ error: 'Revise os dados da operação.' }, 400);
    const b = body.data;
    if (b.action === 'settings') {
      const { error } = await client.rpc('affiliate_finance_settings', { p_minimum: b.minimum, p_days: b.days });
      return error ? affiliateFailure(error) : affiliateResponse({ ok: true });
    }
    if (b.action === 'detail') {
      const { data, error } = await client.rpc('affiliate_payout_detail', { p_id: b.id });
      if (error) return affiliateFailure(error);
      // The profile's user id is provided by the protected RPC, never accepted from the browser.
      const record = data as Record<string, unknown> & { pix_ciphertext: string; user_id: string };
      const pix = decryptPix(record.pix_ciphertext, record.user_id);
      const { pix_ciphertext: _cipher, user_id: _user, ...safe } = record;
      return affiliateResponse({ ...safe, pix });
    }
    let proof: Buffer | undefined;
    if (b.action === 'review' && b.status === 'paid') {
      if (!b.verified || !b.proof || !b.reference || !b.proofType || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.proof)) return affiliateFailure({ message: 'payment_proof_required' });
      proof = Buffer.from(b.proof, 'base64');
      const valid = b.proofType === 'application/pdf' ? proof.subarray(0, 5).toString() === '%PDF-' : b.proofType === 'image/png' ? proof.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) : proof[0] === 255 && proof[1] === 216 && proof[2] === 255;
      if (!valid || proof.length > 2097152 || proof.length < 8) return affiliateFailure({ message: 'payment_proof_required' });
    }
    if (b.action === 'release' || (b.action === 'review' && b.status === 'paid')) {
      const service = createSupabaseAdminClient();
      const orders = await service.rpc('affiliate_wallet_orders', { p_commission: b.action === 'release' ? b.id : null, p_payout: b.action === 'review' ? b.id : null });
      if (orders.error) return affiliateFailure(orders.error);
      for (const id of orders.data as string[]) await syncMercadoPagoOrder(id);
      if (b.action === 'release') {
        const { error } = await client.rpc('affiliate_release_commission', { p_commission: b.id });
        return error ? affiliateFailure(error) : affiliateResponse({ ok: true });
      }
    }
    if (b.action === 'review') {
      const { error } = await client.rpc('affiliate_review_payout', { p_id: b.id, p_version: b.version, p_status: b.status, p_reason: b.reason, p_reference: b.reference || null, p_proof: proof ? '\\x' + proof.toString('hex') : null, p_type: b.proofType || null });
      return error ? affiliateFailure(error) : affiliateResponse({ ok: true });
    }
    return affiliateResponse({ error: 'Operação inválida.' }, 400);
  } catch { return affiliateFailure({}); }
}
