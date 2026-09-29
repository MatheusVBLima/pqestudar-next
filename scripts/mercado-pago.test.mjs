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
const fixture = () => ({ id, type: 'online', external_reference: reference, user_id: '123', currency: 'BRL', country_code: 'BRA',
  total_amount: '59.90', total_paid_amount: '59.90', status: 'processed', status_detail: 'accredited',
  last_updated_date: '2026-09-14T12:00:00Z', checkout_url: `https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${id}`,
  items: [{ external_code: 'pqestudar-premium-lifetime', quantity: 1, unit_price: '59.90' }],
  transactions: { payments: [{ status: 'processed', status_detail: 'accredited', amount: '59.90' }] } });
let order = fixture();
let user = { id: userId, email: 'buyer@example.test', email_confirmed_at: '2026-01-01' };
let intent = { id: reference, user_id: userId, customer_email: user.email, live_mode: false, seller_id: '123',
  site_url: 'https://example.test', status: 'pending', order_id: null };
let apiCalls = [], rpcCalls = [], failApi = false, failDb = false;
let providerFailure = null;
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
      if (providerFailure) return providerFailure;
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
for (const country_code of ['BRA', 'BR']) assert.doesNotThrow(() => core.validateMercadoPagoOrder({ ...fixture(), country_code }, reference, '123', false));
for (const country_code of ['ARG', 'USA', '', undefined]) assert.throws(() => core.validateMercadoPagoOrder({ ...fixture(), country_code }, reference, '123', false), /mp_order_mismatch/);
providerFailure = { ok: false, status: 400, json: async () => ({
  error: 'bad_request', message: 'Invalid config',
  errors: [{ code: 'invalid_field', description: 'config.online.auto_return is invalid' }],
  cause: [{ code: 123, description: 'test-only test-secret buyer@example.test https://private.test/callback Alice Example' }],
  payer: { email: 'never-log@example.test' }, access_token: 'never-log-token',
}) };
await assert.rejects(core.mercadoPagoFetch('/v1/orders', { payer: { name: 'Alice Example' } }), /mp_api_400/);
const diagnostic = JSON.stringify(logs.at(-1));
assert.equal(typeof logs.at(-1)[1], 'string', 'Nested causes must render fully in the terminal');
assert.equal(JSON.parse(logs.at(-1)[1]).details.causes[1].code, 'invalid_field');
assert.ok(diagnostic.includes('config.online.auto_return is invalid'));
assert.ok(diagnostic.includes('invalid_field'));
for (const secret of ['test-only', 'test-secret', 'buyer@example.test', 'private.test', 'Alice Example', 'never-log']) assert.equal(diagnostic.includes(secret), false);
providerFailure = { ok: false, status: 502, json: async () => { throw new SyntaxError('HTML'); } };
await assert.rejects(core.mercadoPagoFetch('/users/me'), /mp_api_502/);
providerFailure = null;
apiCalls = [];
const checkout = load('src/app/api/mercado-pago/create-checkout/route.ts');
const webhook = load('src/app/api/mercado-pago/webhook/route.ts');
const status = load('src/app/api/mercado-pago/premium-status/route.ts');
const post = (body, origin = 'https://example.test') => new Request('https://example.test/api/mercado-pago/create-checkout', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function event(valid = true, queryId = id) {
  const ts = '1789398000000';
  const hash = createHmac('sha256', env.MERCADO_PAGO_WEBHOOK_SECRET).update(`id:${id};request-id:request-123;ts:${ts};`).digest('hex');
  return new Request(`https://example.test/api/mercado-pago/webhook?data.id=${queryId}&type=order`, {
    method: 'POST', headers: { 'x-request-id': 'request-123', 'x-signature': `ts=${ts},v1=${valid ? hash : '0'.repeat(64)}` },
    body: JSON.stringify({ data: { status: 'paid', total_amount: 1 }, live_mode: true }),
  });
}
// The official SDK preserves data.id case (mercadopago/sdk-nodejs PR #439).
assert.equal(core.verifyMercadoPagoSignature(event(), env.MERCADO_PAGO_WEBHOOK_SECRET), true);
assert.equal(core.verifyMercadoPagoSignature(event(true, id.toLowerCase()), env.MERCADO_PAGO_WEBHOOK_SECRET), false,
  'Changing the signed ID case must invalidate the signature');
assert.equal(core.verifyMercadoPagoSignature(event(), 'wrong-secret'), false);
const missingSignature = event();
missingSignature.headers.delete('x-signature');
assert.equal(core.verifyMercadoPagoSignature(missingSignature, env.MERCADO_PAGO_WEBHOOK_SECRET), false);
assert.equal(core.mercadoPagoSignatureFailure(missingSignature, env.MERCADO_PAGO_WEBHOOK_SECRET), 'missing_signature');
assert.equal(core.mercadoPagoSignatureFailure(event(), 'wrong-secret'), 'signature_mismatch');
assert.equal(core.mercadoPagoSignatureFailure(event(true, '12345'), env.MERCADO_PAGO_WEBHOOK_SECRET), 'invalid_order_id');
for (const [header, reason] of [['x-request-id', 'missing_request_id'], ['x-signature', 'missing_signature']]) {
  const request = event();
  request.headers.delete(header);
  const before = apiCalls.length;
  assert.equal((await webhook.POST(request)).status, 401);
  assert.equal(apiCalls.length, before);
  assert.equal(logs.at(-1)[1], JSON.stringify({ reason }));
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
assert.equal(JSON.parse(created.options.body).config.notification_url, undefined, 'Orders does not accept notification_url in config; use application Webhooks');
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
intent.last_synced_at = null;
env.MERCADO_PAGO_ACCESS_TOKEN = '';
assert.equal((await status.GET(get())).status, 503);
assert.deepEqual(JSON.parse(logs.at(-1)[1]), { stage: 'sync_order', code: 'mp_not_configured', reason: 'unclassified', environment: 'unknown' });
env.MERCADO_PAGO_ACCESS_TOKEN = 'test-only';
failApi = true;
assert.equal((await status.GET(get())).status, 503);
assert.equal(JSON.parse(logs.at(-1)[1]).code, 'mp_api_503');
failApi = false;
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
for (const [message, httpStatus, reason] of [
  ['Invalid API key test-only', 401, 'invalid_api_key'],
  ['permission denied for function secret-function', 403, 'permission_denied'],
  ['TypeError: fetch failed', 0, 'connection_failed'],
]) {
  admin.rpc = async () => ({ error: { message }, status: httpStatus });
  const result = await checkout.POST(post({ requestId: reference }));
  assert.equal(result.status, 503);
  assert.equal(logs.at(-1)[1].databaseStatus, httpStatus);
  assert.equal(logs.at(-1)[1].databaseReason, reason);
  assert.equal(JSON.stringify(logs.at(-1)).includes(message), false);
  assert.equal(JSON.stringify(await result.json()).includes(reason), false);
}
for (const secret of ['test-only', 'test-secret', 'buyer@example.test', 'db failed']) assert.equal(JSON.stringify(logs).includes(secret), false);
console.log('PASS: fixed amount, verified owner, login, idempotency, URL validation, HMAC/tampering, API-authoritative fulfillment, amount/product/seller/environment, refund/dispute, retries, test isolation and private status.');
