// Uses the real components with synthetic data. No production writes or login.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const harness = 'src/app/author-badge-level-preview-local/page.tsx';
const author = { id: 'author-fixture', slug: 'autora-exemplo', display_name: 'Autora de Exemplo', headline: 'Educação, tecnologia e oportunidades para transformar sua jornada de estudos.', bio: 'Compartilho caminhos práticos para estudar melhor e encontrar novas oportunidades.\nAqui você encontra guias sobre ferramentas, bolsas e carreira.', education: 'Formação e experiência apresentadas pela autora de exemplo.', photo_url: '', website_url: 'https://example.com/', website_label: 'Conheça meu trabalho', instagram_url: 'https://instagram.com/example', youtube_url: '', featured_badges: ['published-10'], created_at: '2026-10-24T12:00:00Z' };
const badges = [
  { author_id: author.id, code: 'published-1', title: 'Primeiro guia', description: 'Publicou seu primeiro guia.', earned_at: '2026-10-24T12:00:00Z' },
  { author_id: author.id, code: 'published-10', title: 'Autor em ação', description: 'Alcançou 10 guias publicados.', earned_at: '2026-10-24T12:00:00Z' },
  { author_id: author.id, code: 'consistent-3', title: 'Autor consistente', description: 'Publicou ao menos um guia por mês durante três meses seguidos.', earned_at: '2026-10-24T12:00:00Z' },
];
badges.push(...[
  ['variety-3', 'Conhecimento plural'], ['published-50', 'Voz de referencia'], ['pioneer-20', 'Autor pioneiro']
].map(([code, title]) => ({ author_id: author.id, code, title, description: 'Descricao de teste da conquista.', earned_at: '2026-10-24T12:00:00Z' })));
const guides = Array.from({ length: 3 }, (_, i) => ({ id: `guide-${i}`, slug: `guia-exemplo-${i}`, title: ['Como organizar sua rotina de estudos com ferramentas gratuitas', 'Oportunidades para começar uma nova etapa na sua carreira', 'Cursos gratuitos: como encontrar a melhor opção para você'][i], short_description: 'Um guia prático com caminhos para colocar seu próximo passo em ação.', public_category: ['Ferramentas', 'Carreira', 'Educação'][i], category: 'Educação', cover_image_url: null }));
const source = `'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthorProfileView } from '@/components/authors/AuthorProfileView';
import { AuthorIdentity } from '@/components/authors/AuthorIdentity';
import { AuthorProfileForm } from '@/components/authors/AuthorProfileEditor';
const author = ${JSON.stringify(author)};
export default function Preview() {
 const [empty, setEmpty] = useState(false);
 const [editing, setEditing] = useState(false);
 const [saved, setSaved] = useState('');
 const [client] = useState(() => { const q = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } }); q.setQueryData(['public-authors'], [author]); return q; });
 return <QueryClientProvider client={client}><button onClick={() => setEmpty(!empty)}>Alternar perfil sem guias</button><button onClick={() => setEditing(!editing)}>Editar perfil de teste</button>{editing ? <div className="mx-auto max-w-3xl p-4"><AuthorProfileForm profile={{...author, user_id: 'fixture-user'}} userId="fixture-user" admin={false} onSaved={setSaved} /><p role="status">{saved ? 'Perfil salvo no teste' : ''}</p></div> : <><AuthorProfileView privateVisits={<button data-testid="visits-counter" className="rounded-md px-2 py-1 text-sm font-medium tabular-nums text-muted-foreground">1234</button>} author={author} badges={empty ? [] : ${JSON.stringify(badges)}} guides={empty ? [] : ${JSON.stringify(guides)}} /><div className="mx-auto max-w-3xl px-4"><div data-testid="byline"><AuthorIdentity authorId={author.id} name={author.display_name} /></div><AuthorIdentity authorId={author.id} name={author.display_name} expanded /></div></>}</QueryClientProvider>;
}`;
if (fs.existsSync(harness)) throw new Error('Preview route already exists');
fs.mkdirSync('src/app/author-badge-level-preview-local', { recursive: true });
fs.writeFileSync(harness, source);
const cleanup = () => { if (fs.existsSync(harness) && fs.readFileSync(harness, 'utf8') === source) fs.unlinkSync(harness); };
process.on('exit', cleanup);
const browser = await chromium.launch();
try {
  fs.mkdirSync('test-results/authors', { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  let savedPayload;
  await page.route('**/rest/v1/**', async route => {
    if (route.request().url().includes('/rpc/get_author_progress')) return route.fulfill({ json: [{points:700,credited_guides:7,contribution_months:3}] });
    if (route.request().method() === 'PATCH') {
      savedPayload = route.request().postDataJSON();
      return route.fulfill({ json: { id: author.id } });
    }
    return route.fulfill({ json: route.request().url().includes('author_badges') ? badges : [author] });
  });
  page.on('pageerror', error => errors.push(error.message));
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await page.goto((process.env.AUTHOR_PREVIEW_ORIGIN || 'http://localhost:3000') + '/author-badge-level-preview-local', { timeout: 120000 });
    if (response.status() !== 404) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await page.getByRole('heading', { name: author.display_name, exact: true }).waitFor({ timeout: 120000 });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
    assert.equal(await page.getByRole('progressbar').count(), 0, 'Public profile hides progress');
    const counter = await page.getByTestId('visits-counter').boundingBox();
    const profileCard = await page.locator('main > section').first().boundingBox();
    const channel = await page.getByRole('link', { name: /Instagram/ }).first().boundingBox();
    assert.ok(counter.x > profileCard.x + profileCard.width / 2, 'Counter on right side');
    assert.ok(counter.x + counter.width < profileCard.x + profileCard.width, 'Counter within card');
    assert.ok(counter.y + counter.height < channel.y, 'Counter above channels');
    const topics = await page.getByRole('heading', { name: 'Temas que compartilha' }).boundingBox();
    const about = await page.getByRole('heading', { name: 'Sobre ' + author.display_name }).boundingBox();
    const guideList = await page.getByRole('heading', { name: 'Guias de ' + author.display_name }).boundingBox();
    if (width < 1024) assert.ok(topics.y > about.y && topics.y < guideList.y, 'Mobile topics between biography and guides');
    else assert.ok(topics.x > guideList.x && topics.y < guideList.y, 'Desktop topics stay in sidebar');
    assert.equal(await page.getByTestId('byline').getByRole('link').getAttribute('href'), '/autores/autora-exemplo');
    assert.equal(await page.getByRole('heading', { name: 'Conquistas', exact: true }).count(), 0);
    assert.equal(await page.locator('main a[href^="/guias/"]').count(), 3);
    for (const level of ['first', 'dedication', 'mastery', 'excellence', 'historic']) assert.ok(await page.locator('[data-level="' + level + '"]').count(), level);
    await page.getByRole('button', { name: 'Alternar perfil sem guias' }).focus();
    await page.getByRole('button', { name: 'Autor pioneiro', exact: true }).focus();
    await page.getByRole('tooltip').waitFor();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `test-results/authors/profile-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Alternar perfil sem guias' }).click();
  await page.getByText('Os primeiros guias deste autor aparecerão aqui.').waitFor();
  assert.equal(await page.locator('main a[href^="/guias/"]').count(), 0);
  await page.screenshot({ path: 'test-results/authors/empty-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Editar perfil de teste' }).click();
  await page.getByRole('progressbar').waitFor();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '200');
  await page.getByLabel('Sobre você').fill('Apresentação atualizada no teste local.');
  assert.equal(await page.getByLabel('Endereço do perfil').isDisabled(), true);
  await page.screenshot({ path: 'test-results/authors/editor-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Salvar perfil público' }).click();
  await page.getByText('Perfil salvo no teste', { exact: true }).waitFor();
  assert.equal(savedPayload.bio, 'Apresentação atualizada no teste local.');
  assert.equal(savedPayload.user_id, 'fixture-user');
  assert.deepEqual(errors, []);
  console.log('PASS: profile desktop/mobile geometry, byline link, about-author block, badges, guide links, empty state, no browser exceptions. Synthetic data only.');
} finally { await browser.close(); cleanup(); }
