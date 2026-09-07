import { chromium, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../', import.meta.url);
const output = new URL('../reports/security-2026-09-05/', import.meta.url);
const result = { checkedAt: new Date().toISOString(), localTests: {}, crawl: [], publicContent: {}, ads: [], safeBrowsing: [] };
async function loadSource(relative, transform = source => source) {
  const filename = fileURLToPath(new URL(relative, root));
  const source = transform(await readFile(filename, 'utf8'));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } });
  const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(fileURLToPath(root));
  mod._compile(compiled.outputText, filename);
  return mod.exports;
}
const utils = await loadSource('src/lib/utils.ts');
const { JsonLd } = await loadSource('src/lib/seo/jsonld.tsx', source => source.replace('import { SITE_URL } from "@/lib/site";', 'const SITE_URL = "https://www.pqestudar.com.br";'));
const browser = await chromium.launch({ headless: true });
try {
  const isolated = await browser.newPage();
  await isolated.route('**/*', route => route.abort());
  const html = renderToStaticMarkup(React.createElement(JsonLd, { data: { name: '</script><script>window.__auditMarker = true</script>' } }));
  await isolated.setContent(html);
  result.localTests.jsonLdScriptEscapeExecuted = await isolated.evaluate(() => window.__auditMarker === true);
  const sanitized = utils.sanitizeHtml('<xmp><img src="invalid:" onerror="window.__sanitizeMarker = true"></xmp>');
  await isolated.setContent(`<div>${sanitized}</div>`);
  await isolated.waitForTimeout(500);
  result.localTests.sanitizerRetainsEventHandler = /onerror/i.test(sanitized);
  result.localTests.sanitizerScriptExecuted = await isolated.evaluate(() => window.__sanitizeMarker === true);
  await isolated.close();

  const urls = [...(await readFile(new URL('sitemap.xml', output), 'utf8')).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      if (new URL(url).hostname !== 'www.pqestudar.com.br') continue;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
        const body = await response.text();
        const scripts = [...body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
        const externalScripts = scripts.map(match => match[1].match(/\bsrc="([^"]+)"/)?.[1]).filter(src => src && !src.startsWith('/') && !src.startsWith('https://www.pqestudar.com.br/'));
        const suspiciousScripts = scripts.filter(match => !/application\/ld\+json/.test(match[1]) && !/\bsrc=/.test(match[1]) && !match[2].startsWith('self.__next_f') && /eval\(|atob\(|location\.(?:href|replace|assign)|document\.write/i.test(match[2])).length;
        result.crawl.push({ url, finalUrl: response.url, status: response.status, externalScripts, suspiciousScripts, metaRefresh: /<meta[^>]+http-equiv=["']refresh/i.test(body) });
      } catch (error) { result.crawl.push({ url, error: error.message }); }
    }
  }));

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from('tools_public').select('*').range(0, 999);
  if (error) result.publicContent = { error: error.message };
  else {
    const findings = []; const domains = new Set();
    for (const tool of data) {
      for (const [field, value] of Object.entries(tool)) {
        if (typeof value !== 'string') continue;
        if (/<\/?script\b|<xmp\b|\bon(?:error|load)\s*=|javascript\s*:|data:text\/html/i.test(value)) findings.push({ slug: tool.slug, field, issue: 'Potential executable markup' });
        for (const match of value.matchAll(/https?:\/\/[^\s<>"')]+/g)) { try { domains.add(new URL(match[0]).hostname); } catch {} }
      }
    }
    result.publicContent = { toolsChecked: data.length, findings, domains: [...domains].sort() };
  }

  for (const mode of ['desktop', 'mobile']) {
    const context = await browser.newContext(mode === 'mobile' ? devices['Pixel 7'] : {});
    const page = await context.newPage(); const origins = new Set(); const popups = [];
    page.on('request', req => { try { origins.add(new URL(req.url()).origin); } catch {} });
    page.on('popup', popup => { popups.push(popup.url()); void popup.close(); });
    try {
      await page.goto('https://www.pqestudar.com.br/ferramentas', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await page.getByRole('button', { name: 'Aceitar Todos', exact: true }).click({ timeout: 15000 });
      await page.waitForTimeout(22000);
      result.ads.push({ mode, url: page.url(), origins: [...origins], popups, scripts: await page.locator('script[src]').evaluateAll(nodes => nodes.map(n => n.src).filter(src => !src.includes('/_next/'))), frames: await page.locator('iframe').evaluateAll(nodes => nodes.map(n => n.src)) });
    } catch (error) { result.ads.push({ mode, error: error.message, origins: [...origins] }); }
    await context.close();
  }
  for (const url of ['https://www.pqestudar.com.br/ferramentas', 'www.pqestudar.com.br']) {
    const page = await browser.newPage();
    try {
      await page.goto(`https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(url)}&hl=pt_BR`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(7000);
      const text = await page.locator('body').innerText();
      result.safeBrowsing.push({ url, status: text.split('Status atual')[1]?.split('Desde')[0]?.trim() ?? text.slice(0, 500) });
    } catch (error) { result.safeBrowsing.push({ url, error: error.message }); }
    await page.close();
  }
} finally { await browser.close(); }
const axon = await readFile(new URL('public/axon/standalone.html', root), 'utf8');
const manifest = axon.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (manifest) {
  const assets = Object.values(JSON.parse(manifest[1])).map(entry => {
    const bytes = Buffer.from(entry.data, 'base64');
    const decoded = (entry.compressed ? gunzipSync(bytes) : bytes).toString('utf8');
    return { type: entry.type ?? entry.mimeType, bytes: bytes.length, domains: [...new Set([...decoded.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)].map(m => m[1]))], hasWalletOrMiningTerms: /coinhive|cryptonight|walletconnect|eth_requestAccounts/.test(decoded) };
  });
  result.axonAssets = assets;
}
const tracked = execFileSync('git', ['ls-files'], { cwd: fileURLToPath(root), encoding: 'utf8' }).trim().split('\n');
result.inventory = { trackedFiles: tracked.length, sourceFiles: tracked.filter(path => /^(src|supabase|public)\//.test(path)).length, trackedEnvFiles: tracked.filter(path => /(^|\/)\.env(?:\.|$)/.test(path)) };
await writeFile(new URL('content-review.json', output), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, crawl: { pages: result.crawl.length, non200: result.crawl.filter(x => x.status !== 200), flags: result.crawl.filter(x => x.suspiciousScripts || x.metaRefresh || x.externalScripts?.length) } }, null, 2));
