import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AFFILIATE_CODE_PATTERN, normalizeAffiliateCode } from '@/lib/affiliates/code';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { affiliateResponse, validAffiliateOrigin } from '@/lib/affiliates/server';
import { referralCookie, referralHash, referralHashFromRequest, referralSubject } from '@/lib/affiliates/referral-server';

export const runtime = 'nodejs';
const capture = z.object({ code: z.string().max(128).transform(normalizeAffiliateCode).pipe(z.string().regex(AFFILIATE_CODE_PATTERN)), marketingConsent: z.literal(true) }).strict();
function logCaptureFailure(error: unknown, stage: 'configuration' | 'database') {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  // Log only configuration presence and a bounded provider error code. Never log
  // raw errors, headers, cookies, referral tokens, keys or request bodies.
  console.error('[affiliate-referral] capture_failed', {
    stage,
    referralSecretValid: (process.env.AFFILIATE_REFERRAL_SECRET?.length ?? 0) >= 32,
    supabaseUrlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    databaseCode: typeof code === 'string' && /^[A-Z0-9]{5,12}$/.test(code) ? code : null,
  });
}
export async function POST(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' },403);
  const parsed = capture.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return affiliateResponse({ error: 'Indicação inválida ou sem consentimento.' },400);
  let stage: 'configuration' | 'database' = 'configuration';
  try {
    const token = randomBytes(32).toString('hex');
    const subject = referralSubject(request);
    const client = createSupabaseAdminClient();
    stage = 'database';
    const { data, error } = await client.rpc('affiliate_capture', {
      p_code: parsed.data.code, p_token_hash: referralHash(token), p_subject_hash: subject,
    });
    if (error) throw error;
    if (data?.limited) return affiliateResponse({ error: 'Limite de indicações atingido. Tente mais tarde.' },429);
    const response = affiliateResponse({ accepted: data?.accepted === true });
    // Invalid/inactive codes never replace a previous valid cookie.
    if (data?.accepted) response.headers.set('Set-Cookie',referralCookie(request,token,data.max_age));
    return response;
  } catch (error) {
    logCaptureFailure(error, stage);
    return affiliateResponse({ error: 'Não foi possível registrar a indicação.' },503);
  }
}
export async function DELETE(request: Request) {
  if (!validAffiliateOrigin(request)) return affiliateResponse({ error: 'Origem inválida.' },403);
  const token = referralHashFromRequest(request);
  let status = 200;
  try {
    if (token) {
      const { error } = await createSupabaseAdminClient().rpc('affiliate_revoke',{ p_token_hash: token });
      if (error) status = 503;
    }
  } catch { status = 503; }
  const response = affiliateResponse({ cleared: true },status);
  response.headers.set('Set-Cookie',referralCookie(request,'',0));
  return response;
}
