import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const cache=new Map(), calls=[];
const env={AFFILIATE_REFERRAL_SECRET:'test-secret-not-real-12345678901234567890'};
let result={accepted:true,max_age:2592000},dbError=null;
let stored=null;
const location={href:'https://example.test/mbo-premium?ref='+ 'a'.repeat(32)};
const fetches=[];
function load(path) {
 if(cache.has(path)) return cache.get(path);
 const sandbox={exports:{},Request,Response,URL,AbortSignal,Date,console,process:{env},
  localStorage:{getItem:()=>stored},window:{location},
  fetch:async(url,options)=>{fetches.push({url,...options});return {ok:true};},
  require:name=>{
   if(name==='server-only') return {};
   if(name==='@/lib/supabase-admin') return {createSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:result,error:dbError};}})};
   if(name==='@/lib/supabase-server') return {};
   if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
   if(name==='./code')return load('src/lib/affiliates/code.ts');
   return require(name);
  }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 cache.set(path,sandbox.exports);return sandbox.exports;
}
const server=load('src/lib/affiliates/referral-server.ts'),route=load('src/app/api/affiliates/referral/route.ts');
const request=(body,extra={})=>new Request('https://example.test/api/affiliates/referral',{method:'POST',headers:{origin:'https://example.test',...extra},body:JSON.stringify(body)});
const valid={code:'a'.repeat(32),marketingConsent:true};
assert.equal((await route.POST(request(valid,{origin:'https://attacker.test'}))).status,403);
assert.equal((await route.POST(request({...valid,marketingConsent:false}))).status,400);
assert.equal(calls.length,0);
let response=await route.POST(request(valid));
assert.equal(response.status,200);
const cookie=response.headers.get('set-cookie');
assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/);assert.match(cookie,/Max-Age=2592000/);
assert.equal(server.referralHashFromRequest(request({}, {cookie})),calls.at(-1).args.p_token_hash);
assert.notEqual(cookie.split('=')[1].split(';')[0],calls.at(-1).args.p_token_hash);
assert.equal(server.referralSubject(request(valid,{'x-forwarded-for':'1.1.1.1'})),server.referralSubject(request(valid,{'x-forwarded-for':'2.2.2.2'})));
result={accepted:false};response=await route.POST(request(valid));assert.equal(response.headers.get('set-cookie'),null);
result={limited:true};assert.equal((await route.POST(request(valid))).status,429);
dbError={message:'private provider failure'};response=await route.POST(request(valid));assert.equal(response.status,503);assert.equal((await response.text()).includes('private'),false);
response=await route.DELETE(new Request('https://example.test/api/affiliates/referral',{method:'DELETE',headers:{origin:'https://example.test',cookie}}));
assert.match(response.headers.get('set-cookie'),/Max-Age=0/);assert.equal(calls.at(-1).name,'affiliate_revoke');
dbError=null;
const evidence=load('src/lib/affiliates/payment-evidence.ts');
const sample={id:'ORD123',status:'processed',payer:{email:'private@test.invalid'},transactions:{payments:[{id:'PAY123',amount:'59.90',email:'private@test.invalid'}]}};
const proof=evidence.affiliatePaymentEvidence(sample);
assert.equal(JSON.stringify(proof).includes('private'),false);assert.equal(proof.details.payments[0].id,'PAY123');
assert.equal(proof.key,evidence.affiliatePaymentEvidence(sample).key);
const client=load('src/lib/affiliates/referral-client.ts');
await client.syncAffiliateReferral();assert.equal(fetches.at(-1).method,'DELETE');
assert.equal(fetches.some(f=>f.method==='POST'),false);
stored=JSON.stringify({hasConsented:true,preferences:{marketing:true},consentDate:new Date().toISOString()});
await client.syncAffiliateReferral();assert.equal(fetches.at(-1).method,'POST');assert.equal(JSON.parse(fetches.at(-1).body).code,'a'.repeat(32));
const count=fetches.length;await client.syncAffiliateReferral();assert.equal(fetches.length,count);
location.href='https://example.test/mbo-premium?ref=Meu-Canal';await client.syncAffiliateReferral();assert.equal(JSON.parse(fetches.at(-1).body).code,'meu-canal');
location.href='https://example.test/mbo-premium?ref='+'b'.repeat(32);await client.syncAffiliateReferral();assert.equal(JSON.parse(fetches.at(-1).body).code,'b'.repeat(32));
stored=JSON.stringify({hasConsented:true,preferences:{marketing:false},consentDate:new Date().toISOString()});await client.syncAffiliateReferral();assert.equal(fetches.at(-1).method,'DELETE');
stored=JSON.stringify({hasConsented:true,preferences:{marketing:true},consentDate:'2020-01-01'});assert.equal(client.hasAffiliateConsent(),false);
console.log('PASS: consent/expiry/revocation, last valid code, request serialization/deduplication, origin, opaque HttpOnly cookie, hash-only storage, limiter response and evidence privacy. Mocked HTTP, no provider transaction.');
