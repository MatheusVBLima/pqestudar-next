import { createHash } from 'node:crypto';

// Explicit allowlist: never persist buyer/email/address or the provider's entire response.
export function affiliatePaymentEvidence(value: unknown) {
  const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const pick = (v: unknown, keys: string[]) => Object.fromEntries(keys.flatMap(key => {
    const field = object(v)[key];
    return typeof field === 'string' && field.length <= 200 ? [[key, field]] : [];
  }));
  const order = object(value);
  const details: Record<string, unknown> = pick(order,['id','status','status_detail','last_updated_date','total_amount','total_paid_amount']);
  for (const key of ['payments','refunds','chargebacks']) {
    const rows = object(order.transactions)[key] ?? order[key];
    details[key] = Array.isArray(rows) ? rows.slice(0,100).map(row => pick(row,['id','status','status_detail','amount','paid_amount'])) : [];
  }
  return { details, key: createHash('sha256').update(JSON.stringify(details)).digest('hex') };
}
