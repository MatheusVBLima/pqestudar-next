import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const key = 'pqestudar-premium-lifetime';
const priceId = 'price_1UF5gOEfNogJi61paz25os3B';
let price = { active: true, type: 'one_time', currency: 'brl', unit_amount: 5990 };
let items = { data: [{ quantity: 1, price: { id: priceId, unit_amount: 5990, currency: 'brl' } }] };
let calls = [], sessions = [], updates = [];
let rpcError = null, rejectPix = false;
let user = { id: '35c8ce15-73df-4086-858c-c026a9fa88cd', email: 'buyer@example.test', email_confirmed_at: '2026-01-01' };
const env = { STRIPE_SECRET_KEY: 'test-only', STRIPE_WEBHOOK_SECRET: 'whsec_test_only' };
const admin = {
  rpc: async (name, args) => { calls.push({ name, args }); return { error: rpcError }; },
  from: () => {
    const chain = { select: () => chain, eq: () => chain, neq: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async value => { updates.push(value); return { error: null }; },
      update: value => { updates.push(value); return chain; },
      then: resolve => resolve({ error: null }),
    }; return chain;
  },
};
function load(path) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { exports: {}, Response, URL, URLSearchParams, Buffer, AbortSignal, console: { error() {} }, process: { env },
    fetch: async (_url, options) => {
      const params = new URLSearchParams(options.body); sessions.push(params);
      if (rejectPix && params.get('payment_method_types[1]') === 'pix') return { ok: false, status: 400, json: async () => ({ error: { param: 'payment_method_types', message: 'Pix unavailable' } }) };
      return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_checkout' }) };
    },
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: Response.json.bind(Response) } };
      if (name === '@/lib/supabase-server') return { createServerSupabaseClientWithAuth: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) };
      if (name === '@/lib/supabase-admin') return { createSupabaseAdminClient: () => admin };
      if (name === '@/lib/stripe-premium') return { PREMIUM_PRODUCT_KEY: key, PREMIUM_AMOUNT: 5990, premiumPriceId: () => priceId,
        stripeGet: async path => path.startsWith('prices/') ? price : path.startsWith('charges/') ? { payment_intent: 'pi_disputed' } : items };
      return require(name);
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.exports;
}
const checkout = load('src/app/api/stripe/create-checkout-session/route.ts');
const webhook = load('src/app/api/stripe/webhook/route.ts');
function request(body, origin = 'https://example.test') {
  const req = new Request('https://example.test/api/stripe/create-checkout-session', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }); req.nextUrl = new URL(req.url); return req;
}
assert.equal((await checkout.POST(request({ productKey: key }, 'https://evil.test'))).status, 403);
assert.equal((await checkout.POST(request({ productKey: '__proto__' }))).status, 400);
assert.equal((await checkout.POST(request({ productKey: key, price: 'attacker', amount: 1 }))).status, 200);
assert.equal(sessions.at(-1).get('line_items[0][price]'), priceId);
assert.equal(sessions.at(-1).get('line_items[0][price_data][unit_amount]'), null);
assert.equal(sessions.at(-1).get('metadata[plan_type]'), 'lifetime');
assert.match(sessions.at(-1).get('success_url'), /\/mbo-premium\/sucesso/);
assert.equal(sessions.at(-1).get('metadata[user_id]'), user.id);
user = null;
await checkout.POST(request({ productKey: key }));
assert.equal(sessions.at(-1).get('metadata[user_id]'), null, 'Guest can go directly to checkout');
rejectPix = true;
await checkout.POST(request({ productKey: key }));
assert.equal(sessions.at(-1).get('payment_method_types[1]'), null, 'Card fallback');
rejectPix = false;
price = { ...price, unit_amount: 1 };
assert.equal((await checkout.POST(request({ productKey: key }))).status, 503);
price = { ...price, unit_amount: 5990 };
await checkout.POST(request({ productKey: 'certificado-que-conta' }));
assert.equal(sessions.at(-1).get('line_items[0][price_data][unit_amount]'), '1990');
assert.match(sessions.at(-1).get('success_url'), /certificado-que-conta\/sucesso/);

function event(type, object, signed = true) {
  const body = JSON.stringify({ id: 'evt_test', type, data: { object } });
  const time = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${time}.${body}`).digest('hex');
  return new Request('https://example.test/api/stripe/webhook', { method: 'POST', body,
    headers: { 'stripe-signature': `t=${time},v1=${signed ? signature : 'wrong'}` } });
}
const session = { id: 'cs_test_payment', object: 'checkout.session', amount_total: 5990, currency: 'brl', payment_status: 'unpaid', payment_intent: 'pi_test', customer_details: { email: 'buyer@example.test' }, metadata: { product_key: key } };
assert.equal((await webhook.POST(event('checkout.session.completed', session, false))).status, 400);
assert.equal(calls.length, 0);
await webhook.POST(event('checkout.session.completed', session));
assert.equal(calls.at(-1).args.p_purchase.status, 'pending');
await webhook.POST(event('checkout.session.async_payment_succeeded', { ...session, payment_status: 'paid' }));
assert.equal(calls.at(-1).args.p_purchase.status, 'paid');
assert.equal(calls.at(-1).args.p_purchase.verified_price_id, priceId);
items = { data: [{ quantity: 1, price: { id: 'price_wrong', unit_amount: 5990, currency: 'brl' } }] };
const before = calls.length;
assert.equal((await webhook.POST(event('checkout.session.completed', { ...session, payment_status: 'paid' }))).status, 500);
assert.equal(calls.length, before, 'Wrong product price never grants access');
items.data[0].price.id = priceId;
rpcError = { message: 'db unavailable' };
assert.equal((await webhook.POST(event('checkout.session.completed', session))).status, 500, 'Stripe must retry on persistence failure');
rpcError = null;
await webhook.POST(event('charge.refunded', { object: 'charge', id: 'ch_test', payment_intent: 'pi_test', refunded: true }));
assert.equal(calls.at(-1).args.p_reason, 'refund');
await webhook.POST(event('charge.dispute.created', { object: 'dispute', id: 'dp_test', charge: 'ch_test' }));
assert.equal(calls.at(-1).args.p_payment_intent, 'pi_disputed');
assert.equal(calls.at(-1).args.p_reason, 'dispute');
await webhook.POST(event('checkout.session.completed', { ...session, metadata: { product_key: 'certificado-que-conta' }, amount_total: 1990, payment_status: 'paid' }));
assert.equal(updates.at(-1).product_key, 'certificado-que-conta');
delete env.STRIPE_SECRET_KEY;
assert.equal((await checkout.POST(request({ productKey: key }))).status, 500);
console.log('PASS: fixed price, lifetime metadata, verified identity, guests, Pix fallback, signature, payment states, refund/dispute, failures and certificate regression');
