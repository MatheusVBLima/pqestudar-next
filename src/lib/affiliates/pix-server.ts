import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function key() {
  const raw = process.env.AFFILIATE_PIX_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) throw new Error('wallet_not_configured');
  return Buffer.from(raw, 'hex');
}
export function walletConfigured() { try { key(); return true; } catch { return false; } }
export function encryptPix(value: string, userId: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function decryptPix(value: string, userId: string) {
  const [version, iv, tag, encrypted] = value.split('.');
  if (version !== 'v1' || !encrypted) throw new Error('invalid_pix_cipher');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}
export function validatePix(type: string, raw: string): string | null {
  const value = raw.trim();
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254 ? value : null;
  if (type === 'random') return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value.toLowerCase() : null;
  if (type === 'phone') return /^\+55\d{10,11}$/.test(value) ? value : null;
  if (type === 'cpf' || type === 'cnpj') {
    const digits = value.replace(/[.\-/]/g, '');
    const size = type === 'cpf' ? 11 : 14;
    if (!new RegExp(`^\\d{${size}}$`).test(digits) || /^(\d)\1+$/.test(digits)) return null;
    const base = digits.slice(0, -2);
    const check = (s: string) => { let sum = 0; for (let i = 0; i < s.length; i++) sum += Number(s[i]) * (type === 'cpf' ? s.length + 1 - i : (s.length - 1 - i) % 8 + 2); const n = sum % 11; return n < 2 ? 0 : 11 - n; };
    return `${base}${check(base)}${check(base + check(base))}` === digits ? digits : null;
  }
  return null;
}
