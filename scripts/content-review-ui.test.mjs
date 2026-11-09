import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const file='src/app/content-review-preview-local/page.tsx';
const source=`import {ContentReviewClient} from '@/components/admin/content-review/ContentReviewClient';
export default function Preview(){return <div className="dark admin-radius" style={{background:'hsl(var(--card))',minHeight:'100vh'}}><div className="m-2 rounded-xl border"><header className="md:hidden border-b px-4 py-3 h-16">Admin</header><main className="overflow-auto p-6"><ContentReviewClient/></main></div></div>}`;
if(fs.existsSync(file))throw new Error('Preview already exists');
fs.mkdirSync('src/app/content-review-preview-local',{recursive:true});fs.writeFileSync(file,source);
const cleanup=()=>{if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===source)fs.unlinkSync(file);};process.on('exit',cleanup);
const target={id:'fixture',kind:'tools',title:'Ferramenta de exemplo',route:'/ferramentas/exemplo',published:true};
const original={name:target.title,description:'Organize seu projeto com uma ferramenta online.',content_markdown:'## Planos e acesso\n\nO plano gratuito permite 10 projetos.\n\nÉ necessário criar uma conta.\n\n## Antes de começar\n\nO suporte atende em português.\n\nVocê pode organizar sua rotina de estudos.'};
original.content_markdown+='\n\n![Tela de exemplo](https://example.com/screenshot.png)\n\n##\n\n- **Revisar** o conteúdo\n- Consultar a documentação';
let fields={...original},history=[],run={id:'run-fixture',kind:'tools',content_id:target.id,title:target.title,route:target.route,snapshot:original,created_at:'2026-11-07T15:00:00Z',status:'ready',version:1,claims:[
 {id:'c1',field:'content_markdown',original:'O plano gratuito permite 10 projetos.',statement:'Limite de projetos no plano gratuito',status:'contradicted',reason:'A página oficial informa 3 projetos no plano gratuito.',replacement:'O plano gratuito permite 3 projetos.',checked_at:'2026-11-07T15:02:00Z',sources:[{url:'https://example.com/pricing',title:'Planos oficiais — exemplo de teste',summary:'A tabela de planos informa o limite de 3 projetos para contas gratuitas.',checked_at:'2026-11-07T15:02:00Z'}]},
 {id:'c2',field:'content_markdown',original:'É necessário criar uma conta.',statement:'Cadastro necessário',status:'confirmed',reason:'Confirmado pela documentação.',replacement:'',checked_at:'2026-11-07T15:02:00Z',sources:[{url:'https://example.com/help',title:'Ajuda — exemplo',summary:'O cadastro é necessário.',checked_at:'2026-11-07T15:02:00Z'}]},
 {id:'c3',field:'content_markdown',original:'O suporte atende em português.',statement:'Idioma do suporte',status:'uncertain',reason:'Idioma do suporte não especificado por plano.',replacement:'',checked_at:'2026-11-07T15:02:00Z',sources:[{url:'https://example.com/help',title:'Ajuda — exemplo',summary:'O suporte está disponível, sem idioma informado.',checked_at:'2026-11-07T15:02:00Z'}]}
]};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/admin/content-review',async route=>{
  const b=route.request().postDataJSON();let data;
  if(b.action==='search')data={targets:[target]};
  else if(b.action==='detail')data={fields,row_hash:'fixture-hash',runs:[run],history};
  else if(b.action==='save_manual'){
   assert.equal(b.expected_hash,'fixture-hash');assert.equal(b.fields.content_markdown,'**Texto revisado manualmente.**');
   fields={...fields,...b.fields};data={event_id:'manual-event'};
  }
  else if(b.action==='apply'){
   assert.deepEqual(b.changes,[{id:'c1',text:'O plano gratuito permite 3 projetos.'}]);
   fields={...original,content_markdown:original.content_markdown.replace(run.claims[0].original,b.changes[0].text)};
   history=[{id:'event-fixture',run_id:run.id,before_fields:original,after_fields:fields,created_at:'2026-11-07T15:10:00Z',reverted_at:null}];run={...run,status:'applied'};data={event_id:'event-fixture'};
  }else if(b.action==='undo'){fields=original;history[0].reverted_at='2026-11-07T15:11:00Z';data={event_id:'event-fixture'};}
  else throw new Error(`Unexpected action ${b.action}`);
  await route.fulfill({json:data});
 });
 for(let attempt=0;attempt<5;attempt++){
  const result=await page.goto('http://localhost:3000/content-review-preview-local',{timeout:120000});
  if(result.status()!==404)break;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 await page.getByRole('heading',{name:'O que vamos verificar hoje?',exact:true}).waitFor({timeout:60000});
 fs.mkdirSync('test-results/content-review',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  await page.screenshot({path:`test-results/content-review/entrance-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 for(const width of [320,375,390]){
  await page.setViewportSize({width,height:667});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('form')).position==='fixed');
  const composer=await page.locator('form').first().boundingBox();
  assert.ok(Math.abs(composer.y+composer.height-657)<3,'Mobile composer stays at the viewport bottom');
  assert.ok(composer.height<=72&&composer.width<=width-24,'Single-row compact mobile composer');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`test-results/content-review/mobile-landing-${width}.png`});
 }
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:innerHeight-260});visualViewport.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>Math.abs(document.querySelector('form').getBoundingClientRect().bottom-(innerHeight-270))<3);
 await page.screenshot({path:'test-results/content-review/mobile-keyboard.png'});
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});
 await page.setViewportSize({width:1440,height:1000});
 const initialHeight=await page.locator('form').first().evaluate(el=>el.getBoundingClientRect().height);
 assert.ok(initialHeight<160,'Compact search height');
 assert.ok((await page.locator('form').first().boundingBox()).width<=760,'Compact search width');
 assert.notEqual(await page.locator('form').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await page.getByRole('combobox',{name:'Tipo de conteúdo'}).click();
 await page.getByRole('option',{name:'Guias',exact:true}).click();
 await page.getByRole('combobox',{name:'Tipo de conteúdo'}).click();
 await page.getByRole('option',{name:'Todos os conteúdos',exact:true}).click();
 await page.getByLabel('O que você quer verificar?').fill('/ferramentas/exemplo');
 await page.getByRole('button',{name:'Buscar conteúdo'}).click();
 await page.getByRole('button',{name:/Ferramenta de exemplo.*Publicado/}).click();
 await page.getByRole('heading',{name:'Diagnóstico e fontes'}).waitFor();
 assert.equal(await page.locator('details[aria-label="Resultados"]').evaluate(el=>el.open),false);
 await page.locator('summary').filter({hasText:'Conteúdos encontrados'}).click();
 assert.equal(await page.locator('details[aria-label="Resultados"]').evaluate(el=>el.open),true);
 await page.locator('summary').filter({hasText:'Conteúdos encontrados'}).click();
 const panels=page.getByRole('navigation',{name:'Painéis da revisão'});
 await panels.getByRole('button',{name:'Modelos'}).click();
 await page.locator('#review-provider').click();
 await page.getByRole('option',{name:'Lovable / Gemini',exact:true}).click();
 await page.getByRole('combobox',{name:'Modelo para análise textual'}).click();
 await page.getByRole('option',{name:'google/gemini-2.5-flash',exact:true}).click();
 assert.ok((await page.locator('#review-search-model').innerText()).includes('gpt-4.1-mini'));
 assert.ok((await page.locator('main').last().innerText()).includes('Análise textual e diagnóstico'));
 assert.ok(!(await page.locator('main').last().innerText()).includes('an?lise'));
 await page.getByRole('button',{name:'Usar estes modelos'}).click();
 assert.equal(await page.locator('#review-provider').count(),0);
 await panels.getByRole('button',{name:'Gráfico',exact:true}).click();
 await page.getByRole('img',{name:/Gráfico de pizza:/}).waitFor();
 const chartTable=page.getByRole('table',{name:'Distribuição por status'});
 assert.ok((await chartTable.getByRole('row').filter({hasText:'Confirmado na consulta'}).innerText()).includes('33,3%'));
 assert.equal(await page.locator('#review-panel svg[role=img] path').count(),3);
 assert.deepEqual(await page.locator('#review-panel svg[role=img] text').allTextContents(),['33,3%','33,3%','33,3%']);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`test-results/content-review/pie-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await panels.getByRole('button',{name:'Gráfico',exact:true}).click();
 assert.ok(Math.abs(initialHeight-await page.locator('form').first().evaluate(el=>el.getBoundingClientRect().height))<2,'Search composer has stable height');
 await page.getByRole('tab',{name:'Visual',exact:true}).waitFor();
 await page.getByRole('tab',{name:'Markdown',exact:true}).click();
 await page.getByRole('tab',{name:'Pré-visualizar',exact:true}).click();
 await page.getByRole('tab',{name:'Visual',exact:true}).click();
 const discard=page.getByRole('button',{name:'Descartar alterações',exact:true});
 if(await discard.isVisible())await discard.click();
 await page.getByRole('button',{name:'Trechos analisados',exact:true}).click();
 await page.locator('article h2').filter({hasText:'Planos e acesso'}).waitFor();
 const marked=page.locator('article mark').filter({hasText:'O plano gratuito permite 10 projetos.'});
 await marked.click();
 assert.ok((await marked.getAttribute('aria-label')).includes('Contradito'));
 assert.ok(!(await page.locator('article').innerText()).includes('## Planos'));
 assert.equal(await page.locator('article img[alt="Tela de exemplo"]').count(),1);
 assert.equal(await page.locator('article li strong').innerText(),'Revisar');
 assert.equal(await page.locator('article h2').evaluateAll(nodes=>nodes.some(n=>!n.textContent.trim())),false);
 await panels.getByRole('button',{name:/Resultado/}).click();
 assert.ok((await page.locator('#review-panel').innerText()).includes('Cobertura do texto:'));
 await panels.getByRole('button',{name:/Histórico/}).click();
 assert.ok((await page.locator('#review-panel').innerText()).includes('3 analisadas'));
 await page.getByRole('button',{name:'Recolher painel'}).click();
 assert.equal(await page.locator('aside [role=combobox]').count(),0);
 const secondFinding=page.locator('#diagnosis-c2 > button');
 await secondFinding.click();
 assert.equal(await secondFinding.getAttribute('aria-expanded'),'true');
 assert.equal(await page.locator('#diagnosis-c1 > button').getAttribute('aria-expanded'),'false');
 await secondFinding.click();
 assert.equal(await secondFinding.getAttribute('aria-expanded'),'false');
 await marked.click();
 await page.screenshot({path:'test-results/content-review/rendered-evidence.png',fullPage:true});
 await page.getByRole('button',{name:'Editor',exact:true}).click();
 assert.equal(await page.getByRole('link',{name:/Planos oficiais/}).count(),1);
 await page.setViewportSize({width:375,height:667});
 assert.ok((await panels.boundingBox()).height<=52,'Mobile review navigation uses a single row');
 assert.equal(await page.locator('article').evaluate(el=>el.getBoundingClientRect().width>320),true,'Text uses the available mobile width');
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:'test-results/content-review/mobile-analysis-375.png'});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
  const regions=await page.locator('article,aside').evaluateAll(items=>items.map(el=>({x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width})));
  assert.ok(regions.every(r=>r.width>250&&r.x>=0));
  fs.mkdirSync('test-results/content-review',{recursive:true});
  await page.screenshot({path:`test-results/content-review/review-${width}.png`,fullPage:true});
  console.log(JSON.stringify({width,regions}));
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.setViewportSize({width:1440,height:700});
 await page.evaluate(()=>window.scrollTo({top:650,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('nav[aria-label="Painéis da revisão"]').getBoundingClientRect().top<30);
 const dockRect=await panels.boundingBox();
 console.log(JSON.stringify({dockRect,scroll:await page.evaluate(()=>scrollY)}));
 assert.ok(dockRect.y>=8&&dockRect.y<30,'Review controls remain accessible while scrolling');
 await panels.getByRole('button',{name:/Resultado/}).click();
 const panelRect=await page.locator('#review-panel').boundingBox();
 assert.ok(panelRect.y>=0&&panelRect.y+panelRect.height<=700,'Expanded results fit the viewport');
 await page.screenshot({path:'test-results/content-review/sticky-result.png'});
 await page.getByRole('button',{name:'Recolher painel'}).click();
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Selecionar correção',exact:true}).click();
 await page.getByRole('button',{name:'Revisar e aplicar (1)'}).click();
 const dialog=page.getByRole('alertdialog');await dialog.waitFor();
 assert.ok((await dialog.innerText()).includes('10 projetos'));assert.ok((await dialog.innerText()).includes('3 projetos'));
 await dialog.getByRole('button',{name:'Confirmar e aplicar'}).click();
 await page.locator('#review-panel [role=status]').filter({hasText:'Correções aplicadas ao conteúdo.'}).waitFor();
 await panels.getByRole('button',{name:/Histórico/}).click();
 await page.getByRole('tab',{name:'Alterações (1)',exact:true}).click();
 await page.locator('summary').filter({hasText:'Aplicada'}).click();
 await page.getByRole('button',{name:'Desfazer esta correção'}).click();
 await page.getByRole('button',{name:'Confirmar desfazer',exact:true}).click();
 await page.locator('#review-panel [role=status]').filter({hasText:'Correção desfeita.'}).waitFor();
 await page.getByRole('button',{name:'Recolher painel'}).click();
 await page.getByRole('tab',{name:'Markdown',exact:true}).click();
 await page.locator('article textarea').fill('**Texto revisado manualmente.**');
 await page.getByRole('button',{name:'Salvar edição',exact:true}).click();
 await page.getByRole('button',{name:'Confirmar e salvar',exact:true}).click();
 await page.locator('#review-panel [role=status]').filter({hasText:'Edição salva com histórico.'}).waitFor();
 const smallSlices=Array.from({length:30},(_,i)=>({...run.claims[0],id:'slice-'+i,status:i<26?'confirmed':['contradicted','uncertain','unverified','editorial'][i-26]}));
 for(const chartClaims of [[],[run.claims[0]],smallSlices]){
  run={...run,claims:chartClaims};
  await page.getByRole('button',{name:'Recolher painel'}).click();
  await page.locator('summary').filter({hasText:'Conteúdos encontrados'}).click();
  await page.getByRole('button',{name:/Ferramenta de exemplo.*Publicado/}).click();
  await panels.getByRole('button',{name:'Gráfico',exact:true}).click();
  if(!chartClaims.length){
   await page.getByText('Nenhuma afirmação disponível para o gráfico.',{exact:false}).waitFor();
   assert.equal(await page.locator('#review-panel svg[role=img]').count(),0);
  }else if(chartClaims.length===1){
   assert.equal(await page.locator('#review-panel svg[role=img] circle').count(),1);
   assert.equal(await page.locator('#review-panel svg[role=img] text').textContent(),'100%');
   assert.ok((await page.getByRole('table',{name:'Distribuição por status'}).innerText()).includes('100%'));
  }else{
   assert.equal(await page.locator('#review-panel svg[role=img] text').count(),5);
   assert.equal(await page.locator('#review-panel svg[role=img] polyline').count(),4);
   const labels=await page.locator('#review-panel svg[role=img] text').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y'))})));
   for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(labels[i].x===labels[j].x)assert.ok(Math.abs(labels[i].y-labels[j].y)>=20);
   await page.screenshot({path:'test-results/content-review/pie-small-slices.png',fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: search, evidence links, desktop/mobile geometry, review dialog, apply and undo (mock API).');
}finally{await browser.close();cleanup();}
