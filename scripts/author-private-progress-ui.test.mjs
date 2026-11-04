import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const path = 'src/app/author-private-preview-local/page.tsx';
const source = `'use client';
import {useState} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {AuthorPrivateProgress} from '@/components/authors/AuthorPrivateProgress';
import {AuthorProfileActions} from '@/components/authors/AuthorProfileActions';
let identity='visitor'; let listener;
const session=()=>identity==='visitor'?null:{user:{id:identity}};
supabase.auth.getSession=async()=>({data:{session:session()},error:null});
supabase.auth.onAuthStateChange=(fn)=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}}};
supabase.rpc=async(name)=>['admin','owner'].includes(identity)?{data:name==='get_author_profile_visits'?42:[{points:700,credited_guides:7,contribution_months:2}],error:null}:{data:null,error:{code:'42501'}};
export default function Preview(){const [q]=useState(()=>new QueryClient());return <QueryClientProvider client={q}><AuthProvider><main className="p-8">{['visitor','admin','owner','other'].map(id=><button className="p-3" key={id} onClick={()=>{identity=id;listener('SIGNED_IN',session())}}>{id}</button>)}<AuthorPrivateProgress authorId="example"/><AuthorProfileActions authorId="example"/></main></AuthProvider></QueryClientProvider>}
`;
if (fs.existsSync(path)) throw Error('Temporary route already exists');
fs.mkdirSync('src/app/author-private-preview-local', { recursive: true });
fs.writeFileSync(path, source);
const cleanup = () => { if (fs.existsSync(path) && fs.readFileSync(path, 'utf8') === source) fs.unlinkSync(path); };
process.on('exit', cleanup);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  let activeRole = 'visitor';
  await page.route('**/api/auth/roles', route => route.fulfill({ json: {userId: activeRole, roles: activeRole === 'admin' ? ['admin'] : []} }));
  page.on('pageerror', error => errors.push(error.message));
  for (let i = 0; i < 5; i++) {
    const response = await page.goto('http://localhost:3000/author-private-preview-local');
    if (response && response.status() !== 404) break;
    await page.waitForTimeout(1500);
  }
  await page.getByRole('button', { name: 'admin', exact: true }).waitFor();
  assert.equal(await page.getByRole('progressbar').count(), 0);
  for (const role of ['admin', 'owner']) {
    activeRole = role;
    await page.getByRole('button', { name: role, exact: true }).click();
    await page.getByRole('progressbar').waitFor();
    await page.getByRole('button', {name:'Visitas ao perfil'}).waitFor();
    assert.ok((await page.getByRole('button', {name:'Visitas ao perfil'}).innerText()).includes('42'));
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '200');
    if (role === 'admin') {
      await page.getByRole('link', {name:'Editar perfil do autor'}).waitFor();
      assert.equal(await page.getByRole('link', {name:'Editar perfil do autor'}).getAttribute('href'), '/admin/autores?editar=example');
    } else assert.equal(await page.getByRole('link', {name:'Editar perfil do autor'}).count(), 0);
    activeRole = 'other';
    await page.getByRole('button', { name: 'other', exact: true }).click();
    await page.getByRole('progressbar').waitFor({ state: 'detached' });
    await page.getByRole('button', {name:'Visitas ao perfil'}).waitFor({state:'detached'});
  }
  await page.getByRole('button', { name: 'visitor', exact: true }).click();
  assert.equal(await page.getByRole('progressbar').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: admin/owner visibility and hiding after account changes. Simulated sessions and RPC; no real authentication or writes.');
} finally { await browser.close(); cleanup(); }
