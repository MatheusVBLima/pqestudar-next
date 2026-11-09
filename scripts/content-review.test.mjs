import assert from 'node:assert/strict';
import {normalizeClaims,normalizeVerdict,publicUrl,proposedFields,reviewCoverage,reviewSegments} from '../supabase/functions/_shared/content-review.ts';
const fields={title:'Plano com 10 projetos',content_markdown:'O plano custa R$ 20 por mês. O teste dura 7 dias.'};
const claims=normalizeClaims([
 {field:'content_markdown',original:'O plano custa R$ 20 por mês.',statement:'Preço'},
 {field:'content_markdown',original:'custa R$ 20',statement:'Sobreposto'},
 {field:'content_markdown',original:'Texto inventado',statement:'Inexistente'},
 {field:'title',original:fields.title,statement:'Limite'},
],fields);
assert.equal(claims.length,2);
assert.equal(normalizeClaims([{field:'title',original:'Repetido',statement:'x'}],{title:'Repetido e Repetido'}).length,0);
for(const bad of ['javascript:alert(1)','http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://example.internal'])assert.equal(publicUrl(bad),null);
const source={url:'https://example.com/pricing',title:'Preços',summary:'',checked_at:''};
const unsupported=normalizeVerdict({status:'contradicted',replacement:'R$ 30',sources:[{url:'https://invented.com',summary:'Inventada'}]},claims[0],[source],'now');
assert.equal(unsupported.status,'unverified');assert.equal(unsupported.replacement,'');
const verified=normalizeVerdict({status:'contradicted',replacement:'O plano custa R$ 30 por mês.',sources:[{url:source.url,summary:'Novo preço'}]},claims[0],[source],'now');
assert.equal(verified.status,'contradicted');
assert.equal(proposedFields(fields,[verified],[{id:verified.id,text:'Valor $& literal'}]).content_markdown,'Valor $& literal O teste dura 7 dias.');
assert.throws(()=>proposedFields(fields,[unsupported],[{id:unsupported.id,text:'Novo'}]));
assert.throws(()=>proposedFields(fields,[verified],[{id:verified.id,text:'Novo'},{id:verified.id,text:'Outro'}]));
assert.throws(()=>proposedFields({...fields,content_markdown:'Editado'},[verified],[{id:verified.id,text:'Novo'}]));
console.log('PASS: trechos literais, sobreposição, URLs, fonte inventada, substituição literal e conflitos.');
const compound={...claims[0],aspects:['Cria flashcards','Cria linhas do tempo']};
const base={status:'confirmed',reason:'Fonte sobre flashcards',sources:[{url:source.url,summary:'Flashcards'}],checks:[{aspect:compound.aspects[0],status:'confirmed',urls:[source.url],reason:'Documentado'}]};
const partial=normalizeVerdict(base,compound,[source],'now');
assert.equal(partial.status,'uncertain');assert.equal(partial.checks[1].status,'unverified');assert.equal(partial.replacement,'');
assert.equal(normalizeVerdict({...base,checks:[...base.checks,{aspect:compound.aspects[1],status:'confirmed',urls:['https://invented.com']} ]},compound,[source],'now').status,'uncertain');
assert.equal(normalizeVerdict({...base,checks:[...base.checks,{aspect:compound.aspects[1],status:'confirmed',urls:[source.url]}]},compound,[source],'now').status,'confirmed');
const coverage=reviewCoverage(fields,[{...claims[0],checked_at:'now'}]);
assert.deepEqual(coverage,{total:2,complete:0,partial:1,untouched:1});
assert.equal(reviewSegments({content_markdown:'O plano custa vinte reais. O teste dura sete dias.'}).length,2);
console.log('PASS: partial evidence cannot confirm a compound claim; coverage distinguishes partial and untouched blocks.');
