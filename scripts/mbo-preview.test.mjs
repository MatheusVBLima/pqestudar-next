import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.MBO_TEST_URL || 'http://localhost:3000';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${base}/mbo-premium`, { waitUntil: 'networkidle', timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { level: 1 }).waitFor();
  const necessaryCookies = page.getByRole('button', { name: 'Apenas Necessários', exact: true });
  if (await necessaryCookies.isVisible()) await necessaryCookies.click();
  const cards = page.locator('#descobrir button').filter({ has: page.locator('h3') });
  assert.equal(await cards.count(), 4);
  await page.getByLabel('Estado', { exact: true }).selectOption('SP');
  assert.equal(await cards.count(), 3, 'National benefits remain in every state');
  await page.getByLabel('Estado', { exact: true }).selectOption('CE');
  await page.getByLabel('Cidade', { exact: true }).selectOption('Fortaleza');
  assert.equal(await cards.count(), 4, 'National and municipal coverage are combined');
  await page.getByRole('button', { name: 'Saúde', exact: true }).click();
  assert.equal(await cards.count(), 1);
  await cards.first().click();
  await page.getByRole('dialog').waitFor();
  assert.ok((await page.getByRole('link', { name: /Consultar a fonte oficial/ }).getAttribute('href')).startsWith('https://www.gov.br/'));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.ok(await cards.first().evaluate(element => element === document.activeElement), 'Modal restores keyboard focus');
  await cards.first().click();
  await page.getByRole('button', { name: 'Montar meu checklist' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.getByLabel('Benefício do checklist').inputValue(), 'farmacia-popular');
  assert.equal(await page.locator('#preparar').getByRole('checkbox').count(), 3);
  for (const checkbox of await page.locator('#preparar').getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('heading', { name: 'Checklist concluído', exact: true }).waitFor();
  await page.getByLabel('Benefício do checklist').selectOption('id-jovem');
  assert.equal(await page.locator('#preparar').getByRole('checkbox').first().isChecked(), false);
  await page.getByLabel('Benefício do checklist').selectOption('farmacia-popular');
  assert.equal(await page.locator('#preparar').getByRole('checkbox').first().isChecked(), true);
  await page.locator('#preparar').getByRole('checkbox').first().uncheck();
  await page.getByRole('heading', { name: 'Faltam conferências' }).waitFor();
  for (const name of ['Informação solta', 'Informação organizada', 'Orientação para agir']) {
    const button = page.getByRole('button', { name: new RegExp(name) });
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  }
  assert.equal(await page.getByRole('button', { name: 'Garantir acesso vitalício', exact: true }).count(), 1);
  await mkdir('test-results/mbo', { recursive: true });
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByLabel('Estado', { exact: true }).selectOption('');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/mbo/desktop.png', fullPage: true });
  await page.screenshot({ path: 'test-results/mbo/desktop-top.png' });
  for (const width of [390, 320, 820]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No overflow at ${width}px`);
    if (width < 760) {
      await page.getByRole('button', { name: 'Mapa', exact: true }).click();
      await page.getByRole('button', { name: 'Explorar exemplo de Fortaleza' }).click();
      assert.equal(await page.getByLabel('Cidade', { exact: true }).inputValue(), 'Fortaleza');
      assert.equal(await cards.count(), 4);
    }
    await page.screenshot({ path: `test-results/mbo/${width}.png`, fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/mbo/${width}-top.png` });
  }
  assert.deepEqual(errors, []);
  console.log('MBO: route, coverage, filters, detail, checklist, comparison, CTA and responsive widths passed.');
} catch (error) {
  await mkdir('test-results/mbo', { recursive: true });
  const page = browser.contexts()[0]?.pages()[0];
  console.log(String(error));
  if (page) { console.log(await page.locator('#preparar').allTextContents().catch(() => [])); await page.screenshot({ path: 'test-results/mbo/failure.png', fullPage: true }).catch(() => {}); }
  throw error;
} finally { await browser.close(); }
