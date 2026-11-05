import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const path='src/app/author-guides-check-local/page.tsx';
assert.ok(!fs.existsSync(path));
const guides=Array.from({length:21},(_,i)=>({id:String(i),slug:'guide-'+i,title:'Guia '+i,short_description:i===20?'Educação especial':'Rotina',category:'Estudos',public_category:'Estudos',cover_image_url:null}));
fs.mkdirSync('src/app/author-guides-check-local',{recursive:true});
fs.writeFileSync(path,"import { AuthorGuides } from '@/components/authors/AuthorGuides'; export default function Page(){return <main><AuthorGuides name='Teste' guides={"+JSON.stringify(guides)+"}/></main>}");
let browser;
try {
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://localhost:3000/author-guides-check-local',{timeout:120000});
 const links=page.locator('main a[href^="/guias/"]');
 assert.equal(await links.count(),10);
 const url=page.url();await page.getByRole('button',{name:'Página 3',exact:true}).click();
 assert.equal(await links.count(),1);assert.equal(page.url(),url);
 await page.getByRole('searchbox').fill('educacao');
 assert.equal(await links.count(),1);assert.match(await links.first().innerText(),/Guia 20/);
 assert.equal(await page.getByRole('navigation').count(),0);
 await page.getByRole('searchbox').fill('inexistente');assert.equal(await links.count(),0);
 await page.getByRole('button',{name:'limpe a busca'}).click();assert.equal(await links.count(),10);
 assert.equal(await page.getByRole('button',{name:'Página 1',exact:true}).getAttribute('aria-current'),'page');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS: 10/10/1 pagination, same URL, accent-insensitive search, empty state, reset, mobile overflow.');
} finally {await browser?.close();fs.unlinkSync(path);}
