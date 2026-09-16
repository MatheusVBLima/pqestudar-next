import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const reference = randomUUID();
const userId = randomUUID();
const otherUser = randomUUID();
const id = 'ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP9';
const env = { MERCADO_PAGO_ACCESS_TOKEN: 'test-only', MERCADO_PAGO_WEBHOOK_SECRET: 'test-secret',
  MERCADO_PAGO_MODE: 'test', MERCADO_PAGO_SELLER_ID: '123', MERCADO_PAGO_SITE_URL: 'https://example.test' };
const fixture = () => ({ id, type: 'online', external_reference: reference, user_id: '123', currency: 'BRL', country_code: 'BR',
  total_amount: '59.90', total_paid_amount: '59.90', status: 'processed', status_detail: 'accredited',
  last_updated_date: '2026-09-14T12:00:00Z', checkout_url: `https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${id}`,
  items: [{ external_code: 'pqestudar-premium-lifetime', quantity: 1, unit_price: '59.90' }],
  transactions: { payments: [{ status: 'processed', status_detail: 'accredited', amount: '59.90' }] } });
let order = fixture();
let user = { id: userId, email: 'buyer@example.test', email_confirmed_at: '2026-01-01' };
let intent = { id: reference, user_id: userId, customer_email: user.email, live_mode: false, seller_id: '123',
  site_url: 'https://example.test', status: 'pending', order_id: null };
let apiCalls = [], rpcCalls = [], failApi = false, failDb = false;
const admin = {
  rpc: async (name, args) => {
    rpcCalls.push({ name, args });
    if (failDb) return { error: { message: 'db failed' } };
    if (name === 'prepare_mercado_pago_order') return { data: intent, error: null };
    intent.status = args.p_status;
    intent.last_synced_at = new Date().toISOString();
    return { error: null };
  },
  from: () => {
    const filters = {};
    let values;
    const chain = { select: () => chain, eq: (key, value) => { filters[key] = value; return chain; },
      update: value => { values = value; return chain; },
      maybeSingle: async () => ({ data: Object.entries(filters).every(([k, v]) => intent[k] === v) ? { ...intent } : null, error: null }),
      then: resolve => { if (values) Object.assign(intent, values); return resolve({ error: failDb ? { message: 'db failed' } : null }); },
    };
    return chain;
  },
};
const cache = new Map();
const logs = [];
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { exports: {}, Response, Request, URL, Buffer, AbortSignal, Date, console: { error(...args) { logs.push(args); } }, process: { env },
    fetch: async (url, options) => {
      apiCalls.push({ url, options });
      if (failApi) return { ok: false, status: 503 };
      return { ok: true, json: async () => url.endsWith('/users/me') ? { id: '123', site_id: 'MLB', tags: ['test_user'] } : order };
    },
    require: name => {
      if (name === '@/lib/supabase-admin') return { createSupabaseAdminClient: () => admin };
      if (name === '@/lib/supabase-server') return { createServerSupabaseClientWithAuth: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) };
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      return require(name);
    },
  };
  vm.runInNewContext(code, sandbox);
  cache.set(path, sandbox.exports);
  return sandbox.exports;
}
const core = load('src/lib/mercado-pago.ts');
const checkout = load('src/app/api/mercado-pago/create-checkout/route.ts');
const webhook = load('src/app/api/mercado-pago/webhook/route.ts');
const status = load('src/app/api/mercado-pago/premium-status/route.ts');
const post = (body, origin = 'https://example.test') => new Request('https://example.test/api/mercado-pago/create-checkout', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function event(valid = true, queryId = id) {
  const ts = '1789398000000';
  const hash = createHmac('sha256', env.MERCADO_PAGO_WEBHOOK_SECRET).update(`id:${id.toLowerCase()};request-id:request-123;ts:${ts};`).digest('hex');
  return new Request(`https://example.test/api/mercado-pago/webhook?data.id=${queryId}&type=order`, {
    method: 'POST', headers: { 'x-request-id': 'request-123', 'x-signature': `ts=${ts},v1=${valid ? hash : '0'.repeat(64)}` },
    body: JSON.stringify({ data: { status: 'paid', total_amount: 1 }, live_mode: true }),
  });
}
assert.equal(core.moneyCents('59.90'), 5990);
for (const v of [59.9, '59.901', '-59.90', '5.99e1', null, '']) assert.equal(core.moneyCents(v), -1);
assert.equal(core.isMercadoPagoCheckoutUrl(order.checkout_url), true);
for (const url of ['https://www.mercadopago.com.br.evil.test/checkout/x', 'http://www.mercadopago.com.br/checkout/x',
  'https://evil@www.mercadopago.com.br/checkout/x', 'https://www.mercadopago.com.br:444/checkout/x']) assert.equal(core.isMercadoPagoCheckoutUrl(url), false);
assert.equal((await checkout.POST(post({ requestId: reference }, 'https://evil.test'))).status, 403);
assert.equal((await checkout.POST(post({ requestId: '../bad' }))).status, 400);
user = null;
assert.equal((await checkout.POST(post({ requestId: reference }))).status, 401);
user = { id: userId, email: 'buyer@example.test', email_confirmed_at: '2026-01-01' };
assert.equal((await checkout.POST(post({ requestId: reference, amount: 1, user_id: otherUser }))).status, 200);
const created = apiCalls.find(c => c.options.method === 'POST');
assert.equal(JSON.parse(created.options.body).total_amount, '59.90');
assert.equal(JSON.parse(created.options.body).external_reference, reference);
assert.equal(created.options.headers['X-Idempotency-Key'], reference);
assert.equal(rpcCalls[0].args.p_user, userId);
assert.equal(JSON.parse(created.options.body).config.online.success_url, `https://example.test/mbo-premium/sucesso?provider=mercadopago&reference=${reference}`);
assert.equal(JSON.parse(created.options.body).config.payment_method, undefined, 'Do not silently subsidize installments');
await checkout.POST(post({ requestId: reference }));
assert.equal(apiCalls.filter(c => c.options.method === 'POST').length, 1, 'Reuse persisted order on retry');
let before = rpcCalls.length;
assert.equal((await webhook.POST(event(false))).status, 401);
assert.equal((await webhook.POST(event(true, `${id}A`))).status, 401);
assert.equal(rpcCalls.length, before);
assert.equal((await webhook.POST(event())).status, 200);
assert.equal(rpcCalls.at(-1).args.p_status, 'paid', 'Fulfillment uses API response, never webhook body');
for (const patch of [{ total_amount: '0.01' }, { currency: 'USD' }, { user_id: 'attacker' },
  { items: [{ external_code: 'other', quantity: 1, unit_price: '59.90' }] }, { id: id.replace('ORDTST', 'ORD') },
  { external_reference: randomUUID() }]) {
  order = { ...fixture(), ...patch };
  before = rpcCalls.length;
  assert.throws(() => core.validateMercadoPagoOrder(order, reference, '123', false));
  await webhook.POST(event());
  assert.equal(rpcCalls.length, before);
}
order = fixture();
assert.equal(core.mercadoPagoOrderStatus({ ...order, total_paid_amount: '10.00' }), 'pending');
assert.equal(core.mercadoPagoOrderStatus({ ...order, transactions: { payments: [] } }), 'pending');
assert.equal(core.mercadoPagoOrderStatus({ ...order, status: 'action_required', status_detail: 'waiting_capture' }), 'pending');
for (const detail of ['refunded', 'partially_refunded']) assert.equal(core.mercadoPagoOrderStatus({ ...order, status_detail: detail }), 'refunded');
assert.equal(core.mercadoPagoOrderStatus({ ...order, status: 'charged_back' }), 'canceled');
assert.equal(core.mercadoPagoOrderStatus({ ...order, status: 'failed', status_detail: 'high_risk' }), 'failed');
failDb = true;
assert.equal((await webhook.POST(event())).status, 503);
failDb = false; failApi = true;
assert.equal((await webhook.POST(event())).status, 503);
failApi = false;
const get = () => new Request(`https://example.test/api/mercado-pago/premium-status?reference=${reference}`);
intent.status = 'paid'; intent.live_mode = false;
assert.equal((await (await status.GET(get())).json()).status, 'test_paid');
intent.live_mode = true;
assert.equal((await (await status.GET(get())).json()).status, 'active');
intent.status = 'refunded'; intent.revoked_at = new Date().toISOString();
assert.equal((await (await status.GET(get())).json()).status, 'refunded');
user.id = otherUser;
assert.equal((await status.GET(get())).status, 404);
user = null;
assert.equal((await status.GET(get())).status, 401);
env.MERCADO_PAGO_ACCESS_TOKEN = '';
assert.equal((await checkout.POST(post({ requestId: reference }))).status, 503);
assert.equal(logs.at(-1)[1].stage, 'configuration');
assert.equal(logs.at(-1)[1].code, 'mp_not_configured');
env.MERCADO_PAGO_ACCESS_TOKEN = 'test-only';
user = { id: userId, email: 'buyer@example.test', email_confirmed_at: '2026-01-01' };
failApi = true;
await checkout.POST(post({ requestId: reference }));
assert.equal(logs.at(-1)[1].stage, 'seller_lookup');
assert.equal(logs.at(-1)[1].code, 'mp_api_503');
failApi = false; failDb = true;
await checkout.POST(post({ requestId: reference }));
assert.equal(logs.at(-1)[1].stage, 'prepare_order');
assert.equal(logs.at(-1)[1].code, 'unexpected_error');
for (const secret of ['test-only', 'test-secret', 'buyer@example.test', 'db failed']) assert.equal(JSON.stringify(logs).includes(secret), false);
console.log('PASS: fixed amount, verified owner, login, idempotency, URL validation, HMAC/tampering, API-authoritative fulfillment, amount/product/seller/environment, refund/dispute, retries, test isolation and private status.');
