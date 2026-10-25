import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { isMissingGuideAuthorColumn, isMissingAuthorProfiles } from '../src/lib/author-schema.ts';

assert.equal(isMissingGuideAuthorColumn({ code: '42703', message: 'column guides.author_id does not exist' }), true);
assert.equal(isMissingGuideAuthorColumn({ code: '42703', message: 'column guides.title does not exist' }), false);
assert.equal(isMissingGuideAuthorColumn({ code: '42501', message: 'permission denied for author_id' }), false);
assert.equal(isMissingAuthorProfiles({ code: 'PGRST205', message: "Could not find the table 'public.author_profiles' in the schema cache" }), true);
assert.equal(isMissingAuthorProfiles({ code: '42501', message: 'permission denied for author_profiles' }), false);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.GUIDE_TEST_ORIGIN || 'http://localhost:3000';
  const response = await page.goto(`${origin}/guias`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  assert.equal(response.status(), 200);
  const link = page.locator('main a[href^="/guias/"]').first();
  await link.waitFor({ timeout: 60000 });
  const href = await link.getAttribute('href');
  assert.ok((await page.locator('main a[href^="/guias/"]').count()) > 1, 'Published guides must remain visible');
  const detail = await page.goto(`${origin}${href}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  assert.equal(detail.status(), 200);
  await page.locator('article').first().waitFor({ timeout: 60000 });
  assert.ok((await page.locator('article').innerText()).length > 100, 'The article content must load');
  assert.deepEqual(errors, []);
  console.log('PASS: /guias and a real published guide return 200 and render content without runtime exceptions; schema fallback is specific to the missing author feature.');
} finally { await browser.close(); }
