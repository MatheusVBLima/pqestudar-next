import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const path='src/app/editorial-preview-local/page.tsx';
const source=`'use client';
import {useState} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {AuthorEditorialPanel} from '@/components/authors/AuthorEditorialPanel';
import {AuthorWorkspace} from '@/components/authors/AuthorWorkspace';
supabase.auth.getSession=async()=>({data:{session:{user:{id:'writer'}}},error:null});
supabase.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});
export default function Preview(){const[q]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false}}}));const[reviewer,setReviewer]=useState(false);return <QueryClientProvider client={q}><AuthProvider><button onClick={()=>setReviewer(!reviewer)}>Switch reviewer</button><AuthorWorkspace><AuthorEditorialPanel key={String(reviewer)} reviewer={reviewer}/></AuthorWorkspace></AuthProvider></QueryClientProvider>}`;
if(fs.existsSync(path))throw Error('Route exists');fs.mkdirSync('src/app/editorial-preview-local',{recursive:true});fs.writeFileSync(path,source);
const cleanup=()=>{if(fs.existsSync(path)&&fs.readFileSync(path,'utf8')===source)fs.unlinkSync(path)};process.on('exit',cleanup);
const browser=await chromium.launch();
try{
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
let draft={id:'draft1',author_id:'author1',guide_id:null,status:'draft',revision:1,feedback:'',updated_at:new Date().toISOString(),content:{title:'Guia de teste editorial',slug:'guia-teste',short_description:'Resumo para testar o fluxo editorial',content_markdown:'## Conteudo\n\nTexto de teste do processo de revisao editorial.',category:'Guias',public_category:'Guias',cover_image_url:'',seo_title:'',seo_description:''}};
const calls=[];
await page.route('**/rest/v1/**',async route=>{const url=new URL(route.request().url());const name=url.pathname.split('/').pop();let data=[];
if(name==='author_profiles')data={id:'author1',slug:'autor-teste',user_id:'writer'};
if(name==='author_guide_drafts')data=[draft];
if(name==='guide_public_categories')data=[{name:'Guias',sort_order:1}];
if(url.pathname.includes('/rpc/')){const body=route.request().postDataJSON();calls.push(name);if(name==='save_author_draft'){draft={...draft,content:body.payload,revision:draft.revision+1};data=draft;}else if(name==='submit_author_draft'){draft={...draft,status:'in_review',revision:draft.revision+1};data=null;}else if(name==='review_author_draft'){draft={...draft,status:'changes_requested',feedback:body.note,revision:draft.revision+1};data=null;}else data=null;}
await route.fulfill({json:data});});
for(let i=0;i<5;i++){const response=await page.goto('http://localhost:3000/editorial-preview-local',{timeout:120000});if(response.status()!==404)break;await page.waitForTimeout(1500);}await page.getByRole('button',{name:'Abrir guia',exact:true}).click();
await page.locator('#draft-title').fill('Guia atualizado pelo autor');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByText('Rascunho salvo.',{exact:true}).waitFor();
assert.equal(draft.content.title,'Guia atualizado pelo autor');
await page.getByRole('button',{name:'Enviar para revis',exact:false}).click();await page.getByRole('button',{name:'Acompanhar',exact:true}).waitFor();
await page.getByRole('button',{name:'Switch reviewer'}).click();await page.getByRole('button',{name:'Revisar',exact:true}).click();await page.locator('#review-note').fill('Inclua as fontes e exemplos.');await page.getByRole('button',{name:'Solicitar ajustes',exact:true}).click();
await page.getByText('Nenhum guia nesta situa',{exact:false}).waitFor();assert.equal(draft.status,'changes_requested');
assert.ok(calls.includes('save_author_draft')&&calls.includes('submit_author_draft')&&calls.includes('review_author_draft'));
const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));assert.deepEqual(errors,[]);
console.log('PASS: mobile editor save, submission and reviewer feedback; mocked API, no hosted content writes.');
}finally{await browser.close();cleanup();}
