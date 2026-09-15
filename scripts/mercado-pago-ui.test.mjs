import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.MBO_TEST_URL || 'http://localhost:3100';
const browser = await chromium.launch();
fs.mkdirSync('test-results/mercado-pago', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let mode = 'error', requests = [], state = 'pending';
  await page.route('**/api/mercado-pago/create-checkout', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(mode === 'error' ? { status: 503, json: { error: 'unavailable' } }
      : mode === 'login' ? { status: 401, json: { status: 'login_required' } }
      : mode === 'unsafe' ? { json: { url: 'https://www.mercadopago.com.br.evil.test/checkout/x' } }
      : { json: { url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORDTSTEXAMPLE123456789' } });
  });
  await page.route('https://www.mercadopago.com.br/checkout/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Checkout simulado</title>' }));
  await page.goto(`${base}/mbo-premium`, { waitUntil: 'networkidle', timeout: 120000 });
  const cookies = page.getByRole('button', { name: /Apenas Necess/ });
  if (await cookies.isVisible()) await cookies.click();
  const cta = page.getByRole('button', { name: 'Garantir acesso vitalício', exact: true });
  await cta.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/mercado-pago/offer-mobile.png' });
  assert.equal(await page.getByText('Pagamento seguro via Mercado Pago', { exact: true }).count(), 1);
  await cta.click();
  await page.getByRole('alert').filter({ hasText: /abrir o pagamento/ }).waitFor();
  assert.equal(await cta.isEnabled(), true);
  mode = 'unsafe'; await cta.click();
  await page.getByRole('alert').filter({ hasText: /abrir o pagamento/ }).waitFor();
  assert.ok(page.url().startsWith(base));
  mode = 'ok'; await cta.click();
  await page.waitForURL('https://www.mercadopago.com.br/checkout/**');
  assert.equal(requests[0].requestId, requests[2].requestId, 'Same key for network retries');
  await page.goto(`${base}/mbo-premium`, { waitUntil: 'networkidle' });
  mode = 'login'; await cta.click();
  await page.waitForURL('**/login?from=**');
  assert.match(decodeURIComponent(page.url()), /from=\/mbo-premium#premium/);
  await page.route('**/api/mercado-pago/premium-status?**', route => route.fulfill({
    status: state === 'login_required' ? 401 : 200, json: { status: state },
  }));
  const result = `${base}/mbo-premium/sucesso?provider=mercadopago&reference=${requests[0].requestId}`;
  for (const [value, title] of [['pending', 'Aguardando confirmação do pagamento'], ['test_paid', 'Pagamento de teste confirmado'],
    ['refunded', 'Este pagamento não libera acesso'], ['active', 'Seu Premium está liberado!']]) {
    state = value;
    await page.goto(result, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Entrar no Premium' }).count(), value === 'active' ? 1 : 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `test-results/mercado-pago/${value}-mobile.png` });
  }
  state = 'login_required';
  await page.goto(result, { waitUntil: 'networkidle' });
  const login = page.getByRole('link', { name: 'Entrar com Google' });
  await login.waitFor();
  assert.match(decodeURIComponent(await login.getAttribute('href')), /provider=mercadopago&reference=/);
  // Old Stripe return URLs remain supported.
  await page.route('**/api/stripe/premium-status?**', route => route.fulfill({ json: { status: 'active' } }));
  await page.goto(`${base}/mbo-premium/sucesso?session_id=cs_test_legacy`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Entrar no Premium' }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/mbo-premium`, { waitUntil: 'networkidle' });
  await cta.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/mercado-pago/offer-desktop.png' });
  console.log('PASS: mobile/desktop offer, error/retry, unsafe redirect blocked, login return, stable retry key, pending/test/refund/active views, legacy Stripe return and mobile overflow. Provider mocked.');
} finally { await browser.close(); }
