import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync('supabase/functions/content-review/index.ts','utf8');
const code=ts.transpileModule(source.slice(source.indexOf('class ReviewError'),source.indexOf('function collectSources'))+'\nglobalThis.callProvider=response;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
async function attempt(failures){
 let calls=0;const context={Deno:{env:{get:()=> 'fixture'}},AbortSignal,console:{error(){}},setTimeout:fn=>{fn();},fetch:async()=>{const failure=failures[calls++];return failure?{ok:false,status:failure.status,headers:new Headers(failure.headers),json:async()=>({error:{code:failure.code,message:failure.message}})}:{ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"claims":[]}'}]}]})};}};
 vm.runInNewContext(code,context);
 let error;try{await context.callProvider('JSON fixture');}catch(e){error=e;}
 return {calls,error};
}
for(const code of ['insufficient_quota','credit_balance_exhausted','project_spend_limit_exceeded','organization_spend_limit_exceeded','organization_usage_limit_exceeded']){
 const result=await attempt([{status:429,code}]);assert.equal(result.calls,1);assert.equal(result.error.status,503);assert.ok(result.error.message.includes(code));
}
assert.equal((await attempt([{status:429,code:'rate_limit_exceeded'}])).calls,2);
const longWait=await attempt([{status:429,code:'slow_down',headers:{'retry-after':'60'}}]);assert.equal(longWait.calls,1);assert.equal(longWait.error.status,429);
const large=await attempt([{status:429,code:'rate_limit_exceeded',message:'Request too large for tokens per minute'}]);assert.equal(large.calls,1);assert.ok(large.error.message.includes('tokens'));
const unknown=await attempt([{status:429,code:'unexpected'}]);assert.equal(unknown.calls,1);assert.ok(unknown.error.message.includes('não foi classificado'));
console.log('PASS: billing codes, bounded transient retry, Retry-After, oversized request and unknown 429.');

const endpoints=[];const ctx={Deno:{env:{get:()=> 'fixture'}},AbortSignal,console,setTimeout,fetch:async(url)=>{endpoints.push(url);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"claims":[]}'}}]})};}};
vm.runInNewContext(code,ctx);
assert.equal((await ctx.callProvider('extract',false,0,'lovable')).text,'{"claims":[]}');
const research=await ctx.callProvider('research',true,0,'lovable');
assert.equal(research.data.output.length,0);
assert.deepEqual(endpoints,['https://ai.gateway.lovable.dev/v1/chat/completions']);
assert.ok(source.includes('false,0,provider,textModel'));assert.ok(source.includes("run.search_model?'openai':run.provider"));
const requests=[];
const mixed={Deno:{env:{get:()=> 'fixture'}},AbortSignal,console,setTimeout,fetch:async(url,options)=>{
 requests.push({url,body:JSON.parse(options.body)});
 return {ok:true,json:async()=>url.includes('lovable')?{choices:[{finish_reason:'stop',message:{content:'{}'}}]}:{status:'completed',output:[]}};
}};
vm.runInNewContext(code,mixed);
await mixed.callProvider('extract',false,0,'lovable','google/gemini-2.5-flash');
await mixed.callProvider('sources',true,0,'openai','gpt-4.1-mini');
await mixed.callProvider('verdict',false,0,'lovable','google/gemini-2.5-flash');
assert.deepEqual(requests.map(r=>r.body.model),['google/gemini-2.5-flash','gpt-4.1-mini','google/gemini-2.5-flash']);
assert.equal(requests[1].body.tools[0].type,'web_search');
console.log('PASS: Lovable uses its own API only; unsupported research cannot fabricate evidence.');
