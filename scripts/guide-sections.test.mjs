import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeGuideHeadings, parseGuideSections, replaceGuideSection } from '../src/lib/guide-sections.ts';

test('splits compact H2s, preserves intro and keeps H3 within the parent card', () => {
  const text = 'Introdução original\n\n##O que realmente é um concurso público\nTexto **negrito** e [fonte](https://example.com).\n### Detalhes\nMais texto.\n##Como funciona o processo na prática\nSegundo texto.';
  const sections = parseGuideSections(text);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, 'Introdução');
  assert.equal(sections[1].title, 'O que realmente é um concurso público');
  assert.ok(sections[1].content.includes('### Detalhes'));
  const edited = replaceGuideSection(text, 0, 'Introdução corrigida');
  assert.equal(parseGuideSections(edited).length, 3);
  assert.ok(edited.includes(sections[1].content));
  assert.ok(edited.includes('Segundo texto.'));
  const reopened = replaceGuideSection(edited, 0, 'Introdução corrigida novamente');
  assert.ok(reopened.startsWith('Introdução corrigida novamente'));
  assert.ok(reopened.endsWith('Segundo texto.'));
});

test('pasting multiple headings into a card creates sections without deleting later content', () => {
  const text = '## Antes\nTexto antigo\n\n## Depois\nNão remover';
  const edited = replaceGuideSection(text, 0, '##Primeiro\nUm\n##Segundo\nDois');
  assert.deepEqual(parseGuideSections(edited).map(section => section.title), ['Primeiro', 'Segundo', 'Depois']);
  assert.ok(edited.includes('Não remover'));
  assert.throws(() => replaceGuideSection(text, 0, '  '));
  assert.throws(() => replaceGuideSection(text, 9, 'Texto'));
  assert.ok(replaceGuideSection(text, 1, 'Apenas corpo').includes('## Depois\n\nApenas corpo'));
});

test('headings in fenced code are not cards and body H1 is normalized', () => {
  const text = '# Título no corpo\n\n````md\n## não dividir\n```\n# não mudar\n````\n\n## __Outro título__\nTexto';
  assert.equal(parseGuideSections(text).length, 2);
  assert.ok(normalizeGuideHeadings(text).startsWith('## Título'));
  assert.ok(normalizeGuideHeadings(text).includes('# não mudar'));
  for (const heading of ['## **Negrito**', '##__Negrito__', '## Título visual', '<h2><strong>HTML</strong></h2>']) {
    assert.equal(parseGuideSections(heading + '\nCorpo').filter(section => section.heading !== null).length, 1);
  }
});
