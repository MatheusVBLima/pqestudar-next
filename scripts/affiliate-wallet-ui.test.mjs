// Ephemeral page and intercepted API: UI verification only, never a real withdrawal.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const file='src/app/wallet-preview-local/page.tsx';
const source=`'use client';
import { useState,useEffect } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { AffiliateWallet } from '@/components/affiliates/AffiliateWallet';
import { AffiliateFinanceAdmin } from '@/components/affiliates/AffiliateFinanceAdmin';
import s from '@/components/affiliates/approved-affiliate.module.css';
export default function Preview(){const [client]=useState(()=>new QueryClient());const [admin,setAdmin]=useState(false);useEffect(()=>setAdmin(location.search.includes('admin')),[]);return <QueryClientProvider client={client}><main className={admin?'mx-auto max-w-6xl p-4':s.page}><div className="mx-auto max-w-6xl p-4">{admin?<AffiliateFinanceAdmin userId="fixture"/>:<AffiliateWallet userId="fixture"/>}</div></main></QueryClientProvider>}`;
if(fs.existsSync(file))throw new Error('Existing preview route');
fs.mkdirSync('src/app/wallet-preview-local',{recursive:true});fs.writeFileSync(file,source);
const cleanup=()=>{if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===source)fs.unlinkSync(file);};process.on('exit',cleanup);
const browser=await chromium.launch();
const page=await browser.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const id='00000000-0000-4000-8000-000000000001';
let funded=false,failed=false,submitted=null;
const payout={id,amount_cents:5000,pix_mask:'email: ****test',status:'requested',created_at:new Date().toISOString(),version:1,display_name:'Pessoa de teste'};
await page.route('**/api/affiliates/wallet**',route=>{
 if(failed)return route.fulfill({status:503,json:{error:'Falha de teste da carteira.'}});
 if(route.request().method()==='POST'){submitted=route.request().postDataJSON();return route.fulfill({json:{id:submitted.id,status:'requested'}});}
 return route.fulfill({json:{approved:true,configured:true,available_cents:funded?10000:0,reserved_cents:0,pending_cents:1234,paid_cents:0,unreconciled:1,minimum_cents:5000,security_days:30,total:0,payout_total:0,payouts:[],entries:[]}});
});
await page.route('**/api/admin/affiliates/finance**',route=>route.fulfill({json:route.request().method()==='POST'?{...payout,pix:'test@example.test',attempts:[]}:{minimum_cents:5000,security_days:30,total:1,items:[payout],eligible:[],recoveries:[]}}));
fs.mkdirSync('test-results/affiliates',{recursive:true});
try {
 for(const width of [390,1440]) {
  await page.setViewportSize({width,height:1000});
  for(let attempt=0;attempt<10;attempt++) { const response=await page.goto('http://localhost:3000/wallet-preview-local'); if(response?.ok())break; if(attempt===9)throw new Error('Preview HTTP '+response?.status()); await new Promise(resolve=>setTimeout(resolve,1000)); }
  await page.getByRole('heading',{name:'Solicitar saque por Pix'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Solicitar saque',exact:true}).isDisabled(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`test-results/affiliates/wallet-${width}.png`,fullPage:true});
 }
 funded=true;await page.reload();await page.getByLabel('Valor em reais').fill('50,01');
 await page.getByLabel('Tipo de chave Pix').click();await page.getByRole('option',{name:'E-mail',exact:true}).click();
 await page.getByLabel('Chave Pix de sua titularidade').fill('test@example.test');await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Solicitar saque',exact:true}).click();await page.getByText('Saque solicitado. O valor foi reservado para análise.').waitFor();assert.equal(submitted.amount,5001);
 await page.goto('http://localhost:3000/wallet-preview-local?admin');await page.getByRole('heading',{name:'Carteira e saques'}).waitFor();await page.getByRole('button',{name:'Analisar',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByText('Chave Pix: test@example.test').waitFor();
 await page.screenshot({path:'test-results/affiliates/wallet-admin.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'test-results/affiliates/wallet-admin-mobile.png',fullPage:true});
 failed=true;await page.goto('http://localhost:3000/wallet-preview-local');await page.getByText('Falha de teste da carteira.').waitFor();await page.getByRole('button',{name:'Tentar novamente'}).waitFor();
 assert.deepEqual(errors,[]);console.log('Wallet UI: mobile/desktop, zero balance, exact cents request, admin key detail and recoverable error passed (mocked API).');
} catch(error) { console.error('Preview errors:',errors,'Page:',(await page.locator('body').innerText()).slice(0,1200)); throw error; }
finally {await browser.close();cleanup();}
