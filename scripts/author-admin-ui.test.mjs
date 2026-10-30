import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const route = 'src/app/author-admin-preview-local/page.tsx';
const author = { id: 'example', user_id: null, slug: 'autora-exemplo', display_name: 'Autora de Exemplo', headline: 'Educação e tecnologia para transformar a jornada de quem estuda.', bio: '', education: '', photo_url: '', website_url: '', website_label: 'Conheça meu trabalho', instagram_url: '', youtube_url: '', featured_badges: [], created_at: '2025-08-10T12:00:00Z' };
const authors = [author, { ...author, id: 'second', slug: 'outro-autor', display_name: 'Outro Autor', headline: 'Carreira, oportunidades e os próximos passos para o seu futuro.', created_at: '2026-09-10T12:00:00Z' }, { ...author, id: 'third', slug: 'nova-autora', display_name: 'Nova Autora', headline: '', created_at: new Date().toISOString() }];
const badges = [{ author_id: 'example', code: 'published-1', title: 'Primeiro guia', description: 'Publicou seu primeiro guia.', earned_at: '2025-08-10T12:00:00Z' }, { author_id: 'example', code: 'published-10', title: 'Autor em ação', description: 'Alcançou 10 guias publicados.', earned_at: '2026-01-10T12:00:00Z' }, { author_id: 'example', code: 'consistent-3', title: 'Autor consistente', description: 'Publicou em três meses seguidos.', earned_at: '2026-02-10T12:00:00Z' }];
const source = `'use client';
import {useState} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AuthorAdminDirectory} from '@/components/authors/AuthorAdminDirectory';
import {AuthorProfileForm} from '@/components/authors/AuthorProfileEditor';
const authors=${JSON.stringify(authors)};
export default function Preview(){const [selected,setSelected]=useState(null);const [client]=useState(()=>new QueryClient());return <QueryClientProvider client={client}><main className="admin-radius mx-auto max-w-[1240px] p-4 sm:p-8">{selected===null?<AuthorAdminDirectory authors={authors} badges={${JSON.stringify(badges)}} badgeState="ready" onSelect={setSelected}/>:<><button onClick={()=>setSelected(null)}>Voltar aos autores</button><h1 className="my-6 text-2xl font-bold">{selected?'Editar autor':'Novo autor'}</h1><AuthorProfileForm profile={authors.find(a=>a.id===selected)} userId="fixture" admin onSaved={()=>{}}/></>}</main></QueryClientProvider>}
`;
if (fs.existsSync(route)) throw new Error('Preview already exists');
fs.mkdirSync('src/app/author-admin-preview-local', { recursive: true });
fs.writeFileSync(route, source);
const cleanup = () => { if (fs.existsSync(route) && fs.readFileSync(route, 'utf8') === source) fs.unlinkSync(route); };
process.on('exit', cleanup);
const browser = await chromium.launch();
try {
  fs.mkdirSync('test-results/authors', { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route('**/rest/v1/author_badges**', route => route.fulfill({ json: badges }));
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await page.goto('http://localhost:3000/author-admin-preview-local', { timeout: 120000 });
    if (response.status() !== 404) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await page.locator('[data-author-card]').first().waitFor({ timeout: 60000 }).catch(async error => { console.error((await page.locator('body').innerText()).slice(0, 4000)); throw error; });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const rects = await page.locator('[data-author-card]').evaluateAll(cards => cards.map(c => ({ width: c.getBoundingClientRect().width, height: c.getBoundingClientRect().height })));
    assert.ok(rects.every(r => r.height > r.width), `Vertical cards at ${width}: ${JSON.stringify(rects)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/authors/admin-directory-${width}.png`, fullPage: true });
    console.log(JSON.stringify({ width, cards: rects }));
  }
  await page.getByRole('button', { name: /Com conquistas/ }).click();
  assert.equal(await page.locator('[data-author-card]').count(), 1);
  await page.getByRole('button', { name: /^Todos/ }).click();
  await page.getByRole('button', { name: 'Mostrar filtros de autores' }).click();
  await page.getByLabel('Filtrar conta vinculada').click();
  await page.getByRole('option', { name: 'Com conta vinculada', exact: true }).click();
  assert.equal(await page.locator('[data-author-card]').count(), 0);
  await page.getByRole('button', { name: 'Limpar todos os filtros' }).click();
  assert.equal(await page.locator('[data-author-card]').count(), 3);
  await page.getByLabel('Ordenar autores').click();
  await page.getByRole('option', { name: 'Mais recentes', exact: true }).click();
  const focusStyle = await page.getByLabel('Ordenar autores').evaluate(el => ({ shadow: getComputedStyle(el).boxShadow, padding: parseFloat(getComputedStyle(el).paddingRight) }));
  assert.ok(!focusStyle.shadow.includes('2px'), 'No focus ring after selecting');
  assert.ok(focusStyle.padding >= 20, 'Arrow has breathing room');
  assert.ok((await page.locator('[data-author-card]').first().innerText()).includes('Nova Autora'));
  await page.getByLabel('Buscar autores').fill('nova');
  assert.equal(await page.locator('[data-author-card]').count(), 1);
  await page.getByLabel('Buscar autores').fill('ninguém');
  await page.getByText('Nenhum autor encontrado para esta busca.').waitFor();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  assert.equal(await page.locator('[data-author-card]').count(), 3);
  await page.getByRole('button', { name: 'Novo autor', exact: true }).click();
  const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 32, height: 32 } });
  let uploadCount = 0;
  await page.route('**/storage/v1/object/guide-images/authors/**', async route => {
    uploadCount++;
    await route.fulfill({ json: { Key: 'guide-images/authors/test.png' } });
  });
  await page.route('**/storage/v1/object/public/guide-images/authors/**', route => route.fulfill({ contentType: 'image/png', body: photo }));
  const photoInput = page.locator('#author-photo-upload');
  await photoInput.setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await page.getByRole('alert').filter({ hasText: 'Selecione uma imagem' }).waitFor();
  assert.equal(uploadCount, 0);
  await photoInput.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: photo });
  await page.getByRole('button', { name: 'Trocar foto' }).waitFor();
  assert.equal(uploadCount, 1);
  await page.locator('[data-author-card] img').waitFor();
  await page.getByRole('button', { name: 'Remover foto' }).click();
  await page.getByRole('button', { name: 'Enviar foto', exact: true }).waitFor();
  await page.getByLabel('Nome público').fill('Nova Escritora');
  await page.locator('[data-author-card]').getByRole('heading', { name: 'Nova Escritora' }).waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/authors/admin-create-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Voltar aos autores' }).click();
  await page.getByRole('button', { name: 'Editar Autora de Exemplo', exact: true }).click();
  assert.equal(await page.getByLabel('Endereço do perfil').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: vertical card geometry, mobile overflow, search, empty state, new-author live preview, edit badges. Synthetic data; no database writes.');
} finally { await browser.close(); cleanup(); }
