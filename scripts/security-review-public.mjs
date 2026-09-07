import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import tls from 'node:tls';

const output = new URL('../reports/security-2026-09-05/', import.meta.url);
await mkdir(output, { recursive: true });
const result = { checkedAt: new Date().toISOString(), tls: [], http: [], browsers: [] };
for (const hostname of ['pqestudar.com.br', 'www.pqestudar.com.br']) {
  result.tls.push(await new Promise(resolve => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      resolve({ hostname, authorized: socket.authorized, issuer: cert.issuer, validFrom: cert.valid_from, validTo: cert.valid_to, subjectAltName: cert.subjectaltname });
      socket.end();
    });
    socket.setTimeout(15000, () => socket.destroy(new Error('timeout')));
    socket.on('error', error => resolve({ hostname, error: error.message }));
  }));
}
for (const start of ['http://pqestudar.com.br/ferramentas', 'https://pqestudar.com.br/ferramentas', 'https://www.pqestudar.com.br/ferramentas', 'https://www.pqestudar.com.br/robots.txt', 'https://www.pqestudar.com.br/sitemap.xml']) {
  const chain = []; let url = start;
  try {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      chain.push({ url, status: response.status, location: response.headers.get('location'), headers: Object.fromEntries([...response.headers].filter(([key]) => /content-type|strict-transport|content-security|x-frame|x-content-type|server/.test(key))) });
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { url = new URL(response.headers.get('location'), url).href; continue; }
      const body = await response.text();
      if (start.endsWith('sitemap.xml')) await writeFile(new URL('sitemap.xml', output), body);
      if (start.endsWith('robots.txt')) chain.push({ body });
      break;
    }
    result.http.push({ start, chain });
  } catch (error) { result.http.push({ start, chain, error: error.message }); }
}
const browser = await chromium.launch({ headless: true });
try {
  for (const mode of ['desktop', 'mobile']) {
    const context = await browser.newContext(mode === 'mobile' ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const origins = new Set(); const failures = []; const navigations = []; const popups = [];
    page.on('request', request => { try { origins.add(new URL(request.url()).origin); } catch {} });
    page.on('requestfailed', request => failures.push({ url: request.url().split('?')[0], error: request.failure()?.errorText }));
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
    page.on('popup', popup => { popups.push(popup.url()); void popup.close(); });
    try {
      const response = await page.goto('https://www.pqestudar.com.br/ferramentas', { waitUntil: 'domcontentloaded', timeout: 45000, referer: 'https://www.google.com/' });
      await page.waitForTimeout(20000);
      await page.screenshot({ path: new URL(`${mode}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: false });
      const dom = await page.evaluate(() => ({
        title: document.title,
        scripts: [...document.scripts].filter(s => s.src).map(s => s.src),
        frames: [...document.querySelectorAll('iframe')].map(f => ({ src: f.src, sandbox: f.getAttribute('sandbox') })),
        externalLinks: [...document.querySelectorAll('a[href]')].filter(a => a.origin !== location.origin).map(a => ({ text: a.textContent?.trim().slice(0,80), href: a.href })),
        suspiciousLinks: [...document.querySelectorAll('[href],[src]')].map(a => a.getAttribute('href') || a.getAttribute('src')).filter(url => /^\s*(javascript:|data:text\/html|http:)/i.test(url ?? '')),
        text: document.body.innerText.slice(0, 1000),
      }));
      result.browsers.push({ mode, status: response?.status(), url: page.url(), origins: [...origins], failures, navigations, popups, ...dom });
    } catch (error) { result.browsers.push({ mode, error: error.message, origins: [...origins], failures }); }
    await context.close();
  }
  const page = await browser.newPage();
  try {
    await page.goto('https://transparencyreport.google.com/safe-browsing/search?url=pqestudar.com.br&hl=pt_BR', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(12000);
    result.safeBrowsing = { url: page.url(), text: await page.locator('body').innerText() };
  } catch (error) { result.safeBrowsing = { error: error.message }; }
} finally { await browser.close(); }
await writeFile(new URL('public-review.json', output), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
