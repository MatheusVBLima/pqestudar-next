import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export const REFERRAL_COOKIE = 'mbo_ref';
const cookieName = (request: Request) => new URL(request.url).protocol === 'https:' ? `__Host-${REFERRAL_COOKIE}` : REFERRAL_COOKIE;
export function referralHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function referralHashFromRequest(request: Request): string | null {
  const name = cookieName(request);
  const token = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? referralHash(token) : null;
}
export function referralSubject(request: Request) {
  const secret = process.env.AFFILIATE_REFERRAL_SECRET;
  if (!secret || secret.length < 32) throw new Error('referral_not_configured');
  // Only configure this header when the ingress overwrites it. Default is a shared,
  // conservative bucket, never trusting arbitrary client-supplied IP headers.
  const header = process.env.AFFILIATE_TRUSTED_IP_HEADER;
  const candidate = header ? request.headers.get(header)?.split(',')[0].trim() : null;
  const subject = candidate && isIP(candidate) ? candidate : 'shared';
  return createHmac('sha256',secret).update(`${new Date().toISOString().slice(0,10)}:${subject}`).digest('hex');
}
export function referralCookie(request: Request, value: string, maxAge: number) {
  return `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
