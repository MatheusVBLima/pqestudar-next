import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/guide-flow-generate/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

async function generate(mode, role = 'moderator', targetType = 'guide') {
  let handler;
  let imageCalls = 0;
  let textCalls = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: role === 'anon' ? null : { id: 'test-user' } } }) },
    from: () => ({ select() { return this; }, eq() { return this; }, in: async () => ({ data: role === 'user' ? [] : [{ role }] }), limit: async () => ({ data: [] }) }),
  };
  vm.runInNewContext(compiled, {
    exports: {}, console, Request, Response, Date, Set, Uint8Array, atob,
    Deno: { env: { get: () => 'test-only' } },
    require: name => name.includes('/http/server') ? { serve: callback => { handler = callback; } } : { createClient: () => client },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.modalities) { imageCalls++; return Response.json({ choices: [{ message: {} }] }); }
      textCalls++;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ title: 'Guia de teste', content_markdown: '## Teste\nTexto', image_prompts: [{ type: 'internal', position: 'after_section_1', prompt: 'Never retain this in suggestion mode', alt_text: 'alt', editorial_function: 'Imagem aqui' }] }) } }] });
    },
  });
  const response = await handler(new Request('http://test.local', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ tema: 'Teste', categoria: 'Estudos', targetType, visualMode: mode }) }));
  return { status: response.status, data: await response.json(), imageCalls, textCalls };
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
