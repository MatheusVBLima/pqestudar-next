import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.MBO_TEST_URL || 'http://localhost:3000';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let requests = [], checkoutOk = false;
  await page.route('**/api/stripe/create-checkout-session', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(checkoutOk ? { json: { url: 'https://checkout.stripe.com/c/pay/cs_test_ui' } } : { status: 503, json: { error: 'unavailable' } });
  });
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Mock Stripe checkout</title>' }));
  await page.goto(`${base}/mbo-premium`, { waitUntil: 'networkidle', timeout: 120000 });
  const cookies = page.getByRole('button', { name: /Apenas Necess/ });
  if (await cookies.isVisible()) await cookies.click();
  const cta = page.getByRole('button', { name: 'Garantir acesso vitalício', exact: true });
  await cta.click();
  await page.getByRole('alert').filter({ hasText: /abrir o pagamento/ }).waitFor();
  assert.equal(await cta.isEnabled(), true);
  checkoutOk = true;
  await cta.click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], { productKey: 'pqestudar-premium-lifetime' });

  let receiptStatus = 'login_required';
  await page.route('**/api/stripe/premium-status?**', route => route.fulfill({ status: receiptStatus === 'login_required' ? 401 : 200, json: { status: receiptStatus } }));
  await page.goto(`${base}/mbo-premium/sucesso?session_id=cs_test_ui`, { waitUntil: 'networkidle', timeout: 120000 });
  const login = page.getByRole('link', { name: 'Entrar com Google' });
  await login.waitFor();
  assert.match(decodeURIComponent(await login.getAttribute('href')), /from=\/mbo-premium\/sucesso\?session_id=cs_test_ui/);
  assert.equal(await page.getByRole('link', { name: 'Entrar no Premium' }).count(), 0);
  receiptStatus = 'pending';
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Aguardando confirmação do pagamento' }).waitFor();
  receiptStatus = 'active';
  await page.getByRole('button', { name: 'Verificar novamente' }).click();
  await page.getByRole('link', { name: 'Entrar no Premium' }).waitFor();
  receiptStatus = 'refunded';
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Este pagamento não libera acesso' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Entrar no Premium' }).count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: direct CTA, error/retry, checkout payload, guest login return, pending/active/refunded UI and mobile overflow (Stripe/API mocked).');
} finally { await browser.close(); }
