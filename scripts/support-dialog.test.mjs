import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const bundle=execFileSync('bun',['build','scripts/fixtures/support-dialog.tsx','--target','browser'],{encoding:'utf8',maxBuffer:15000000});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const requests=[];
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://support.test/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/bundle.js')return route.fulfill({contentType:'text/javascript; charset=utf-8',body:bundle});
    if(url.pathname==='/api/support'){
      const body=route.request().postDataJSON(); requests.push(body);
      if(body.action==='request')return route.fulfill({status:202,json:{challengeId:'test-id',resendAfter:60,expiresIn:600}});
      return body.code==='123456' ? route.fulfill({status:201,json:{id:'message-id'}}) : route.fulfill({status:400,json:{error:'Código incorreto.'}});
    }
    return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>'});
  });
  await page.goto('http://support.test');
  await page.getByRole('button',{name:'Falar com suporte'}).click();
  await page.getByLabel('E-mail',{exact:true}).fill('lead@example.test');
  await page.getByLabel('Assunto',{exact:true}).fill('Preciso de ajuda');
  await page.getByLabel('Descrição',{exact:true}).fill('Minha mensagem de suporte.');
  await page.getByRole('button',{name:'Receber código'}).click();
  await page.getByRole('heading',{name:'Confirme seu e-mail'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Mensagem enviada!'}).count(),0);
  assert.ok(await page.getByRole('button',{name:/Reenviar em/}).isDisabled());
  await page.getByRole('button',{name:'Corrigir e-mail'}).click();
  assert.equal(await page.getByLabel('Descrição',{exact:true}).inputValue(),'Minha mensagem de suporte.');
  await page.getByRole('button',{name:'Receber código'}).click();
  await page.getByLabel('Código de 6 dígitos').fill('000000');
  await page.getByRole('button',{name:'Confirmar e enviar mensagem'}).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('heading',{name:'Mensagem enviada!'}).count(),0);
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await page.getByRole('button',{name:'Confirmar e enviar mensagem'}).click();
  await page.getByRole('heading',{name:'Mensagem enviada!'}).waitFor();
  assert.equal(requests.at(-1).action,'verify');
  assert.ok(!('description' in requests.at(-1)),'Verification cannot replace the server-stored message');
  assert.deepEqual(errors,[]);
  console.log('PASS: draft retained, request before verify, resend cooldown, wrong code feedback, success only after verification');
} finally { await browser.close(); }
