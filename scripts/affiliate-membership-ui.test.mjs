// Uses an ephemeral route and mocked API responses, never real authenticated data.
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const harness = 'src/app/partners-preview-local/page.tsx';
const harnessSource = `'use client';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AffiliateDashboardClient from '@/components/affiliates/AffiliateDashboardClient';
import AdminAffiliatesClient from '@/components/affiliates/AdminAffiliatesClient';
export default function Preview() {
 const [client] = useState(() => new QueryClient());
 const [admin, setAdmin] = useState(null);
 useEffect(() => { setAdmin(window.location.search.includes('admin')); }, []);
 return <QueryClientProvider client={client}>{admin === null ? null : admin ? <AdminAffiliatesClient userId="fixture" /> : <AffiliateDashboardClient userId="fixture" />}</QueryClientProvider>;
}`;
if (fs.existsSync(harness)) throw new Error('Refusing to overwrite an existing preview route');
fs.mkdirSync('src/app/partners-preview-local',{recursive:true});
fs.writeFileSync(harness,harnessSource);
const cleanup = () => { if(fs.existsSync(harness) && fs.readFileSync(harness,'utf8')===harnessSource) fs.unlinkSync(harness); };
process.on('exit',cleanup);
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:390,height:844}});
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(60000);
await page.emulateMedia({reducedMotion:'reduce'});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
const directory = 'test-results/affiliates'; fs.mkdirSync(directory,{recursive:true});
const levels = [{id:'initial',name:'Inicial',minimum_sales:0,commission_bps:2500},{id:'bronze',name:'Bronze',minimum_sales:10,commission_bps:3000},{id:'silver',name:'Prata',minimum_sales:30,commission_bps:3500},{id:'gold',name:'Ouro',minimum_sales:60,commission_bps:4000}];
const profile = {id:'00000000-0000-4000-8000-000000000001',user_id:'fixture',display_name:'Pessoa de teste',status:'approved',code:'abc1234567890123456789012345678901',level_id:'initial',version:1,created_at:'2026-10-11T12:00:00Z'};
let current = null;
let fail = false;
let tracking = false;
let canDemo = false;
let codeConflict = false;
await page.route('**/api/affiliates/code**', async route => {
 if(route.request().method()==='POST') {
  if(codeConflict)return route.fulfill({status:409,json:{error:'Este código já está em uso. Escolha outro.'}});
  current={...current,code:route.request().postDataJSON().code,version:current.version+1};
  return route.fulfill({json:{code:current.code,version:current.version}});
 }
 const code=new URL(route.request().url()).searchParams.get('code');
 return route.fulfill({json:{code,available:code!=='ocupado',current:code===current.code}});
});
await page.route('**/api/affiliates/sales**', route => route.fulfill({json:{total:1,valid_sales:1,pending_sales:0,clicks:4,unreconciled_sales:1,commissions_cents:0,performance:[{day:'2026-10-11',sales:1}],items:[{id:'sale-fixture',status:'pending_calculation',rate_bps:2500,net_cents:null,commission_cents:null,created_at:'2026-10-11T12:00:00Z'}]}}));
await page.route('**/api/affiliates',async route => {
 if (fail) return route.fulfill({status:503,json:{error:'Não foi possível acessar o programa.'}});
 if (route.request().method()==='POST') current={...profile,status:'pending'};
 await route.fulfill({json:{profile:current,application:current?{channel:'Canal de teste',decision_reason:'Critério de teste'}:null,levels,tracking_enabled:tracking,finance_enabled:false,can_demo:canDemo}});
});
await page.route('**/api/admin/affiliates**',async route => {
 if(route.request().url().includes('/tracking')) {
  if(route.request().method()==='POST') tracking=route.request().postDataJSON().enabled;
  return route.fulfill({json:{tracking_enabled:tracking,attribution_days:30}});
 }
 if(route.request().method()==='POST') current={...current,status:'approved',version:2};
 const status = new URL(route.request().url()).searchParams.get('status');
 const items = status==='all' || status===current.status ? [{...current,channel:'Canal de teste',history:[{id:'event-fixture',actor_id:'admin-fixture',action:'approve',reason:'Canal conferido para teste',next_status:'approved',created_at:'2026-10-11T12:00:00Z'}]}] : [];
 await route.fulfill({json:{items,total:items.length}});
});
const base = process.env.PARTNERS_PREVIEW_URL || 'http://localhost:3000/partners-preview-local';
try {
 // Next's dev route watcher may briefly return 404 for a just-created harness.
 for (let attempt=0;attempt<10;attempt++) {
  const response = await page.goto(base,{waitUntil:'domcontentloaded'});
  if(response?.ok()) break;
  if(attempt===9) throw new Error(`Preview route unavailable: ${response?.status()}`);
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 await page.getByLabel('Seu nome',{exact:true}).fill('Pessoa de teste');
 await page.getByLabel('Como você pretende divulgar?').fill('Canal de conteúdo educacional');
 await page.screenshot({path:`${directory}/application-mobile.png`,fullPage:true});
 await page.getByRole('button',{name:'Quero ser afiliado',exact:true}).click();
 await page.getByRole('heading',{name:'Sua solicitação está em análise'}).waitFor();
 for(const status of ['rejected','suspended','approved']) {
  current={...profile,status}; await page.reload();
  await page.getByText(status==='approved'?'Suas indicações':status==='suspended'?'Sua participação está suspensa':'Sua solicitação não foi aprovada',{exact:true}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${status}`);
 }
 await page.getByRole('tab',{name:'Meu link',exact:true}).click();
 await page.getByText('Aguarde a ativação do rastreamento antes de divulgar links como afiliado.').waitFor();
 tracking=true; await page.reload();
 await page.getByRole('tab',{name:'Meu link',exact:true}).click();
 await page.getByRole('button',{name:'Copiar link de indicação'}).waitFor();
 assert.equal(await page.getByRole('switch',{name:'Ver com dados de exemplo'}).count(),0);
 await page.getByRole('button',{name:'Personalizar código'}).click();
 await page.getByLabel('Novo código de afiliado').fill('ocupado');
 await page.getByText('Este código já está em uso. Escolha outro.',{exact:true}).waitFor();
 assert(await page.getByRole('button',{name:'Salvar código',exact:true}).isDisabled());
 await page.getByLabel('Novo código de afiliado').fill('Meu-Canal');
 await page.getByText('Código disponível.',{exact:true}).waitFor();
 codeConflict=true;
 await page.getByRole('button',{name:'Salvar código',exact:true}).click();
 await page.locator('[role=alert]').getByText('Este código já está em uso. Escolha outro.',{exact:true}).waitFor();
 codeConflict=false;
 await page.getByRole('button',{name:'Salvar código',exact:true}).click();
 await page.getByText('meu-canal',{exact:true}).waitFor();
 await page.getByText(/\/mbo-premium\?ref=meu-canal/).waitFor();
 await page.screenshot({path:`${directory}/custom-code-mobile.png`,fullPage:true});
 await page.getByRole('tab',{name:'Minhas vendas',exact:true}).click();
 await page.locator('span').filter({hasText:/^Pendente de apuração$/}).waitFor();
 await page.screenshot({path:`${directory}/sales-mobile.png`,fullPage:true});
 await page.getByRole('tab',{name:'Minha evolução',exact:true}).click();
 await page.getByText('A partir de 60 vendas válidas').waitFor();
 await page.getByRole('tab',{name:'Visão geral',exact:true}).click();
 for(const width of [320,390,1440]) {
  await page.setViewportSize({width,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  await page.screenshot({path:`${directory}/dashboard-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.screenshot({path:`${directory}/dashboard-dark-mobile.png`,fullPage:true});
 // Approved redesign: examples remain local and do not replace real affiliate data.
 canDemo=true; await page.reload();
 await page.getByRole('heading',{name:'Suas indicações',exact:true}).waitFor();
 await page.getByRole('switch',{name:'Ver com dados de exemplo'}).click();
 await page.getByText('Modo demonstração.',{exact:true}).waitFor();
 await page.getByRole('heading',{name:'Bronze',exact:true}).waitFor();
 await page.getByText('Vendas válidas',{exact:true}).locator('..').getByText('12',{exact:true}).waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:directory+'/demo-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('tab',{name:'Meu link',exact:true}).click();
 await page.getByText('https://mbo.exemplo/r/afiliado-demo',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Minhas vendas',exact:true}).click();
 await page.getByRole('button',{name:'Cancelada',exact:true}).click();
 assert.equal(await page.locator('span').filter({hasText:/^Cancelada$/}).count(),1);
 await page.getByRole('tab',{name:'Minha evolução',exact:true}).click();
 await page.getByRole('slider').fill('60');
 await page.getByText('Nível máximo.',{exact:false}).waitFor();
 await page.screenshot({path:directory+'/evolution-mobile.png',fullPage:true});
 await page.getByRole('tab',{name:'Minha carteira',exact:true}).click();
 assert(await page.getByRole('button',{name:'Sacar · em breve'}).isDisabled());
 await page.getByRole('tab',{name:'Materiais',exact:true}).click();
 assert.equal(await page.getByText('Disponível aqui quando for publicado.',{exact:true}).count(),4);
 await page.getByRole('switch',{name:'Ver com dados de exemplo'}).click();
 await page.getByRole('heading',{name:'Inicial',exact:true}).waitFor();
 await page.getByRole('tab',{name:'Meu link',exact:true}).click();
 await page.getByText('meu-canal',{exact:true}).waitFor();
 assert.equal(await page.getByText('AFILIADO-EXEMPLO',{exact:true}).count(),0);
 await page.getByRole('tab',{name:'Visão geral',exact:true}).click();
 fail=true; await page.reload(); await page.locator('p[role=alert]').waitFor();
 fail=false; await page.getByRole('button',{name:'Tentar novamente'}).click(); await page.getByRole('heading',{name:'Suas indicações',exact:true}).waitFor();
 current={...profile,status:'pending'};
 await page.goto(`${base}?admin`,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Aprovar',exact:true}).click();
 await page.getByLabel('Motivo da decisão').fill('Canal conferido para teste');
 await page.getByRole('button',{name:'Confirmar decisão'}).click();
 await page.getByText('Nenhum cadastro neste filtro.').waitFor();
 await page.getByRole('combobox').click();
 await page.getByRole('option',{name:'Aprovado',exact:true}).click();
 await page.getByRole('button',{name:'Suspender',exact:true}).waitFor();
 await page.getByText('Histórico recente',{exact:true}).click();
 await page.getByText('Responsável: admin-fixture',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${directory}/admin-mobile.png`,fullPage:true});
 assert.deepEqual(pageErrors,[], 'No hydration or runtime errors');
 console.log('PASS: fixture UI application, pending/rejected/suspended/approved, unavailable tracking, level tabs, error retry, admin decision and overflow at 320/390/1440. Not a real authenticated Supabase test.');
} finally { await browser.close(); cleanup(); }
