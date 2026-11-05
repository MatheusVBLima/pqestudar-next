import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('../supabase/functions/guide-flow-generate/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function loadTs(file) {
  const module = {exports:{}};
  const code = ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports:module.exports,require:name=>loadTs(new URL(name,file)),Set,console});
  return module.exports;
}
const autoImages = loadTs(new URL('../supabase/functions/_shared/guide-auto-images.ts',import.meta.url));

async function generate(mode, role = 'moderator', targetType = 'guide', options = {}) {
  let handler;
  let imageCalls = 0;
  let textCalls = 0;
  let uploads = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: role === 'anon' ? null : { id: 'test-user' } } }) },
    from: table => ({ select() { return this; }, eq() { return this; }, in: async () => ({ data: role === 'user' ? [] : [{ role }] }), limit: async () => ({ data: table==='guide_image_library' ? options.assets || [] : [] }) }),
    storage: {from: bucket => ({upload:async()=>{uploads++;return {error:options.uploadError || null};},getPublicUrl:file=>({data:{publicUrl:`https://assets.test/${bucket}/${file}`}})})},
  };
  vm.runInNewContext(compiled, {
    exports: {}, console, Request, Response, Date, Set, Uint8Array, atob, crypto:webcrypto, TextEncoder,
    Deno: { env: { get: () => 'test-only' } },
    require: name => name.includes('guide-auto-images') ? autoImages : name.includes('/http/server') ? { serve: callback => { handler = callback; } } : { createClient: () => client },
    fetch: async (_url, requestOptions) => {
      const body = JSON.parse(requestOptions.body);
      if (body.modalities) { imageCalls++; return Response.json({ choices: [{ message: {} }] }); }
      textCalls++;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ title: 'Guia de teste', content_markdown: options.markdown || '## Teste\nTexto', image_prompts: [{ type: 'internal', position: 'after_section_1', prompt: 'Never retain this in suggestion mode', alt_text: 'alt', editorial_function: 'Imagem aqui' }] }) } }] });
    },
  });
  const response = await handler(new Request('http://test.local', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ tema: 'Teste', categoria: 'Estudos', targetType, visualMode: mode }) }));
  return { status: response.status, data: await response.json(), imageCalls, textCalls, uploads };
}

test('suggestion is the default and never generates images or retains prompts', async () => {
  for (const mode of [undefined, 'suggestion']) {
    const result = await generate(mode);
    assert.equal(result.status, 200);
    assert.equal(result.imageCalls, 0);
    assert.equal(result.data.generated_images[0].status, 'suggestion');
    assert.equal(result.data.generated_images[0].prompt, '');
    assert.equal(result.data.image_prompts[0].prompt, '');
  }
});

test('automatic mode with empty library never calls image generation and leaves review positions', async () => {
  const result=await generate('automatic');
  assert.equal(result.status,200);
  assert.equal(result.textCalls,1);
  assert.equal(result.imageCalls,0);
  assert.equal(result.data.cover_image_url,'');
  assert.ok(result.data.generated_images.every(i=>i.status==='suggestion' && i.prompt===''));
});
test('matching requires approval, function and specific subject overlap; avoids repeats',()=>{
  const asset={storage_path:'cert.png',description:'Certificado',tags:['certificado','carga horaria'],purpose:'explanation',approved:true,license:'propria',source:'PqEstudar'};
  assert.equal(autoImages.rankImages([asset],'Como estudar melhor','explanation').length,0);
  assert.equal(autoImages.rankImages([asset],'Certificado com carga horária','cover').length,0);
  assert.equal(autoImages.rankImages([{...asset,approved:false}],'Certificado com carga horária','explanation').length,0);
  assert.equal(autoImages.rankImages([asset],'Certificado com carga horária','explanation').length,1);
  assert.equal(autoImages.rankImages([asset],'Certificado com carga horária','explanation',new Set(['cert.png'])).length,0);
});
test('diagrams preserve steps and escape text; reject incomplete or long sequences',()=>{
  const body='## Envio\n\n1. Conferir nome & instituição\n2. Organizar arquivos\n3. Enviar documentos';
  const svg=autoImages.diagramForSection(body,'Como enviar certificados');
  assert.ok(svg.includes('nome &amp; instituição'));
  assert.ok(svg.includes('ESQUEMA ILUSTRATIVO'));
  assert.equal(autoImages.diagramForSection(body.replace('2.','4.'),'Envio'),null);
  assert.equal(autoImages.diagramForSection(body+'\n  detalhe adicional','Envio'),null);
  assert.equal(autoImages.diagramForSection('1. '+ 'a'.repeat(110)+'\n2. Dois\n3. Três','Envio'),null);
});
test('automatic positions use the same section parser as publishing',()=>{
  const sections=autoImages.automaticSections('Introdução\n\n## Etapas\n1. A\n2. B\n3. C\n\n## FAQ\nDúvidas');
  assert.equal(sections[1].position,'after_section_2');
  assert.equal(sections.length,3);
});
test('automatic diagram uploads once and upload failure stays reviewable',async()=>{
  const markdown='Introdução\n\n## Como enviar certificados\n1. Conferir nome\n2. Separar arquivos\n3. Enviar pedido';
  const result=await generate('automatic','admin','guide',{markdown});
  assert.equal(result.status,200); assert.equal(result.imageCalls,0); assert.equal(result.uploads,1);
  const diagram=result.data.generated_images.find(i=>i.source_kind==='diagram');
  assert.equal(diagram.position,'after_section_2'); assert.equal(diagram.status,'success');
  assert.ok(diagram.url.includes('guide-diagrams/'));
  const failed=await generate('automatic','admin','guide',{markdown,uploadError:{message:'unavailable'}});
  assert.equal(failed.status,200); assert.ok(failed.data.generated_images.every(i=>i.status==='suggestion'));
});
test('automatic reuses a relevant approved asset without visual generation or upload',async()=>{
  const result=await generate('automatic','admin','guide',{markdown:'## Certificado com carga horária\nConfira os campos.',assets:[{storage_path:'cert.png',description:'Exemplo de certificado',tags:['certificado','carga horária'],purpose:'explanation',approved:true,source:'Própria',license:'Própria'}]});
  assert.equal(result.imageCalls,0); assert.equal(result.uploads,0);
  const asset=result.data.generated_images.find(i=>i.source_kind==='library');
  assert.equal(asset.library_path,'cert.png'); assert.equal(asset.status,'success');
});
test('prompt-only and generated modes remain distinct', async () => {
  const prompts = await generate('prompt_only');
  assert.equal(prompts.imageCalls, 0);
  assert.equal(prompts.data.generated_images[0].status, 'prompt_only');
  assert.ok(prompts.data.generated_images[0].prompt);
  assert.equal((await generate('generate')).imageCalls, 1);
});
test('normal users and anonymous callers cannot generate; moderators cannot generate tools', async () => {
  for (const [role, target, expected] of [['anon', 'guide', 401], ['user', 'guide', 403], ['moderator', 'tool', 403]]) {
    const result = await generate('suggestion', role, target);
    assert.equal(result.status, expected);
    assert.equal(result.textCalls, 0);
  }
});
